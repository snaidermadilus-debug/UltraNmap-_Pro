import 'dotenv/config';
import express from 'express';
import { execSync } from 'child_process';
import os from 'os';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { readDb, updateDb } from './src/db/db.js';
import { runScan, cancelScan, processQueue, validateTarget, validateCustomPorts, buildNmapArgs, isRoot } from './src/scanner/scanner.js';
import { resolveOutputPath, JOB_ID_REGEX } from './src/scanner/utils.js';

// Append mock nmap binary ONLY when ULTRA_USE_MOCK_NMAP=1 in non-production at the END of PATH
if (process.env.NODE_ENV !== 'production' && process.env.ULTRA_USE_MOCK_NMAP === '1') {
  const fixturesBin = path.resolve('tests/fixtures/bin');
  if (!process.env.PATH?.includes(fixturesBin)) {
    process.env.PATH = `${process.env.PATH || ''}:${fixturesBin}`;
  }
}

const ALLOWED_PROFILES = [
  'discovery', 'fast', 'common', 'top1000', 'all', 'services', 
  'web', 'os', 'udp', 'aggressive', 'vuln', 'scripts', 
  'db', 'iot', 'smb', 'ssl', 'firewall', 'stealth'
];

function netmaskToPrefix(netmask: string): number {
  if (!netmask || typeof netmask !== 'string') return 24;
  const parts = netmask.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return 24;
  
  let count = 0;
  for (const n of parts) {
    const bin = (n >>> 0).toString(2);
    for (const char of bin) {
      if (char === '1') count++;
    }
  }
  return count >= 0 && count <= 32 ? count : 24;
}

function prefixToNetmask(prefix: number): string {
  if (prefix < 0 || prefix > 32) return '255.255.255.0';
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return [
    (mask >>> 24) & 0xff,
    (mask >>> 16) & 0xff,
    (mask >>> 8) & 0xff,
    mask & 0xff
  ].join('.');
}

function calculateCidr(ip: string | null, prefixOrNetmask: string | number): string | null {
  if (!ip || typeof ip !== 'string') return null;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
  if (ip.startsWith('127.')) return null;

  let prefix = 24;
  if (typeof prefixOrNetmask === 'number') {
    prefix = prefixOrNetmask;
  } else if (typeof prefixOrNetmask === 'string') {
    prefix = netmaskToPrefix(prefixOrNetmask);
  }

  if (prefix < 0 || prefix > 32) return null;

  const maskNum = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const ipNum = (((parts[0] << 24) >>> 0) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const netNum = (ipNum & maskNum) >>> 0;

  const netParts = [
    (netNum >>> 24) & 0xff,
    (netNum >>> 16) & 0xff,
    (netNum >>> 8) & 0xff,
    netNum & 0xff
  ];

  return `${netParts.join('.')}/${prefix}`;
}

export function getLocalNetworkInfo() {
  let ip: string | null = null;
  let interfaceName: string | null = null;
  let cidr: string | null = null;
  let gateway: string | null = null;
  let netmask: string | null = null;

  try {
    let routeOutput = '';
    try {
      routeOutput = execSync('ip -j route show default 2>/dev/null || ip route show default 2>/dev/null').toString();
    } catch (e) {}

    let defaultIfaceName: string | null = null;
    if (routeOutput.trim().startsWith('[')) {
      const routeJson = JSON.parse(routeOutput);
      defaultIfaceName = routeJson?.[0]?.dev || null;
      if (routeJson?.[0]?.gateway) {
        gateway = routeJson[0].gateway;
      }
    } else if (routeOutput) {
      const match = routeOutput.match(/default\s+via\s+([0-9.]+)\s+dev\s+([^\s]+)/i);
      if (match) {
        gateway = match[1];
        defaultIfaceName = match[2];
      }
    }

    let addrOutput = '';
    try {
      addrOutput = execSync('ip -j addr show 2>/dev/null || ip addr show 2>/dev/null').toString();
    } catch (e) {}

    if (addrOutput.trim().startsWith('[')) {
      const addrJson = JSON.parse(addrOutput);
      const targetIface = defaultIfaceName 
        ? addrJson.find((i: any) => i.ifname === defaultIfaceName)
        : null;

      if (targetIface && targetIface.addr_info) {
        const v4 = targetIface.addr_info.find((a: any) => a.family === 'inet' && !a.local.startsWith('127.'));
        if (v4 && v4.local) {
          ip = v4.local;
          interfaceName = targetIface.ifname;
          const prefix = v4.prefixlen ?? 24;
          netmask = prefixToNetmask(prefix);
          cidr = calculateCidr(ip, prefix);
        }
      }

      if (!ip) {
        for (const iface of addrJson) {
          if (iface.ifname !== 'lo' && iface.addr_info) {
            const v4 = iface.addr_info.find((a: any) => a.family === 'inet' && !a.local.startsWith('127.'));
            if (v4 && v4.local) {
              ip = v4.local;
              interfaceName = iface.ifname;
              const prefix = v4.prefixlen ?? 24;
              netmask = prefixToNetmask(prefix);
              cidr = calculateCidr(ip, prefix);
              break;
            }
          }
        }
      }
    } else if (addrOutput) {
      const matches = Array.from(addrOutput.matchAll(/inet\s+([0-9.]+)\/([0-9]+).+?dev\s+([^\s]+)/g));
      for (const m of matches) {
        const candidateIp = m[1];
        const prefix = Number(m[2]);
        const ifName = m[3];
        if (!candidateIp.startsWith('127.')) {
          ip = candidateIp;
          interfaceName = ifName;
          netmask = prefixToNetmask(prefix);
          cidr = calculateCidr(ip, prefix);
          break;
        }
      }
    }
  } catch (e) {}

  if (!ip) {
    try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        if (name !== 'lo' && !name.includes('loopback')) {
          const list = interfaces[name];
          if (list) {
            const v4 = list.find(item => item.family === 'IPv4' && !item.internal && !item.address.startsWith('127.'));
            if (v4) {
              ip = v4.address;
              interfaceName = name;
              netmask = v4.netmask || '255.255.255.0';
              cidr = calculateCidr(ip, v4.netmask);
              break;
            }
          }
        }
      }
    } catch (e) {}
  }

  return {
    ip: ip || null,
    interface: interfaceName || null,
    cidr: cidr || null,
    gateway: gateway || null,
    netmask: netmask || null,
    isRoot
  };
}

export async function startServer() {
  // Kill any orphan nmap processes
  try {
    execSync('pkill -9 -f nmap 2>/dev/null || true');
  } catch (e) {}

  // Startup: mark running and queued jobs as failed
  await updateDb((db) => {
    if (Array.isArray(db.jobs)) {
      db.jobs.forEach((job: any) => {
        if (job.status === 'running' || job.status === 'queued') {
          job.status = 'failed';
          job.stderr = 'Servidor foi reiniciado durante a execução do scan.';
          job.end_time = new Date().toISOString();
        }
      });
    }
  });

  // Startup: process any remaining queue
  processQueue().catch(console.error);

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Optional API Token Verification Middleware
  app.use('/api', (req, res, next) => {
    const apiToken = process.env.ULTRA_API_TOKEN;
    if (apiToken) {
      const authHeader = req.headers['authorization'];
      const tokenHeader = req.headers['x-api-token'];
      const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const providedToken = tokenHeader || bearerToken;

      if (providedToken !== apiToken) {
        return res.status(401).json({ success: false, error: 'Acesso não autorizado: Token de API inválido.' });
      }
    }
    next();
  });

  app.get('/api/status', (req, res) => {
    let nmapStatus = 'offline';
    let nmapVersion = 'Não instalado';

    try {
      const versionOutput = execSync('nmap --version 2>/dev/null').toString();
      nmapStatus = 'online';
      nmapVersion = versionOutput.split('\n')[0].trim();
    } catch (e) {}

    res.json({
      success: true,
      data: {
        server: 'online',
        nmap: nmapStatus,
        nmapVersion,
        isRoot
      }
    });
  });

  app.get('/api/system/environment', (req, res) => {
    let nmapVersion = 'Não instalado';
    let nmapInstalled = false;
    try {
      nmapVersion = execSync('nmap --version 2>/dev/null').toString().split('\n')[0].trim();
      nmapInstalled = true;
    } catch (e) {}

    const netInfo = getLocalNetworkInfo();
    
    res.json({
      success: true,
      data: {
        platform: process.platform,
        hostname: os.hostname(),
        nodeVersion: process.version,
        nmapInstalled,
        nmapVersion,
        localNetwork: netInfo,
        executionMode: 'local',
        isRoot
      }
    });
  });

  app.get('/api/network', (req, res) => {
    try {
      const netInfo = getLocalNetworkInfo();
      res.json({ success: true, data: netInfo });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Falha ao detectar rede local' });
    }
  });

  app.post('/api/network/scan', async (req, res) => {
    if (req.body && typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: 'Payload do body inválido.' });
    }

    const netInfo = getLocalNetworkInfo();
    let targetCidr = (req.body && typeof req.body.cidr === 'string') ? req.body.cidr.trim() : null;

    if (!targetCidr && netInfo.cidr) {
      targetCidr = netInfo.cidr;
    }

    if (!targetCidr || !validateTarget(targetCidr)) {
      return res.status(400).json({
        success: false,
        error: 'Não foi possível detectar a rede local. Informe um CIDR válido (ex: 192.168.1.0/24).'
      });
    }

    const id = crypto.randomUUID();
    await updateDb((db) => {
      db.jobs.push({
        id,
        target: targetCidr,
        type: 'discovery',
        status: 'queued',
        queued_at: new Date().toISOString(),
        start_time: null,
        end_time: null
      });
    });
    
    runScan(id, targetCidr, 'discovery').catch(console.error);
    
    res.json({ success: true, data: { id, target: targetCidr } });
  });

  app.post('/api/scans/preview', (req, res) => {
    if (req.body && typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: 'Payload do body inválido.' });
    }

    const { target, type, speed, customPorts } = req.body || {};
    const t = target && typeof target === 'string' ? target.trim() : '127.0.0.1';
    const profile = type && typeof type === 'string' && ALLOWED_PROFILES.includes(type) ? type : 'fast';
    const timing = speed && typeof speed === 'string' && ['T2', 'T3', 'T4', 'T5'].includes(speed) ? speed : (profile === 'stealth' ? 'T2' : 'T4');
    const validPorts = customPorts && typeof customPorts === 'string' ? customPorts : undefined;

    const args = buildNmapArgs(profile, t, timing, validPorts);
    const command = `nmap ${args.join(' ')}`;
    res.json({ success: true, data: { command } });
  });

  app.post('/api/scans', async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: 'Payload do body inválido.' });
    }

    const { target, type, speed, customPorts } = req.body;
    
    if (!target || typeof target !== 'string' || !type || typeof type !== 'string') {
      return res.status(400).json({ success: false, error: 'Alvo e perfil de scan são obrigatórios.' });
    }

    const cleanTarget = target.trim();
    if (!validateTarget(cleanTarget)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Endereço de alvo inválido. Use um IPv4, CIDR ou Hostname válido sem opções do Nmap.' 
      });
    }

    if (!ALLOWED_PROFILES.includes(type)) {
      return res.status(400).json({ success: false, error: 'Perfil de scan inválido.' });
    }

    if (speed && (typeof speed !== 'string' || !['T2', 'T3', 'T4', 'T5'].includes(speed))) {
      return res.status(400).json({ success: false, error: 'Velocidade de timing inválida (T2 a T5).' });
    }

    if (customPorts && (typeof customPorts !== 'string' || !validateCustomPorts(customPorts))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Formato de portas customizadas inválido (use portas entre 1 e 65535, ex: 80,443 ou 1-1000).' 
      });
    }

    const id = crypto.randomUUID();
    const finalSpeed = speed || (type === 'stealth' ? 'T2' : 'T4');
    const finalCustomPorts = customPorts ? customPorts.trim() : null;

    await updateDb((db) => {
      db.jobs.push({
        id,
        target: cleanTarget,
        type,
        speed: finalSpeed,
        customPorts: finalCustomPorts,
        status: 'queued',
        queued_at: new Date().toISOString(),
        start_time: null,
        end_time: null
      });
    });
    
    runScan(id, cleanTarget, type, finalSpeed, finalCustomPorts).catch(console.error);
    
    res.json({ success: true, data: { id } });
  });

  app.get('/api/scans/:id/raw', async (req, res) => {
    const rawId = req.params.id;
    if (!rawId || !JOB_ID_REGEX.test(rawId)) {
      return res.status(400).json({ success: false, error: 'ID de scan inválido.' });
    }

    const db = await readDb();
    const job = db.jobs.find((j: any) => j.id === rawId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job não encontrado.' });
    }

    const safePath = resolveOutputPath(job.id);
    if (!safePath) {
      return res.status(400).json({ success: false, error: 'Caminho de saída inválido.' });
    }

    try {
      const rawContent = await fs.readFile(safePath, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(rawContent);
    } catch (e) {
      return res.status(404).json({ success: false, error: 'Arquivo de saída XML não encontrado.' });
    }
  });

  app.get('/api/scans/:id', async (req, res) => {
    const rawId = req.params.id;
    if (!rawId || !JOB_ID_REGEX.test(rawId)) {
      return res.status(400).json({ success: false, error: 'ID de scan inválido.' });
    }

    const db = await readDb();
    const job = db.jobs.find((j: any) => j.id === rawId);
    if (!job) return res.status(404).json({ success: false, error: 'Job não encontrado.' });

    res.json({ 
      success: true, 
      data: { 
        ...job, 
        parsedData: job.parsedData || [], 
        webResults: job.webResults || [] 
      } 
    });
  });

  app.delete('/api/scans/:id', async (req, res) => {
    const rawId = req.params.id;
    if (!rawId || !JOB_ID_REGEX.test(rawId)) {
      return res.status(400).json({ success: false, error: 'ID de scan inválido.' });
    }

    const db = await readDb();
    const jobIndex = db.jobs.findIndex((j: any) => j.id === rawId);
    
    if (jobIndex === -1) {
      return res.status(404).json({ success: false, error: 'Job não encontrado.' });
    }

    const job = db.jobs[jobIndex];
    if (job.status === 'running' || job.status === 'queued') {
      return res.status(400).json({ success: false, error: 'Não é possível excluir auditorias ativas ou na fila.' });
    }

    await updateDb((database) => {
      database.jobs = database.jobs.filter((j: any) => j.id !== rawId);
    });

    res.json({ success: true });
  });

  app.delete('/api/history', async (req, res) => {
    let removedCount = 0;
    await updateDb((database) => {
      const activeJobs = database.jobs.filter((j: any) => j.status === 'running' || j.status === 'queued');
      removedCount = database.jobs.length - activeJobs.length;
      database.jobs = activeJobs;
    });

    res.json({ success: true, removedCount });
  });

  app.post('/api/scans/:id/cancel', async (req, res) => {
    const rawId = req.params.id;
    if (!rawId || !JOB_ID_REGEX.test(rawId)) {
      return res.status(400).json({ success: false, error: 'ID de scan inválido.' });
    }

    await cancelScan(rawId);
    res.json({ success: true });
  });

  app.get('/api/history', async (req, res) => {
    const db = await readDb();
    const sorted = db.jobs.sort((a: any, b: any) => {
      const timeA = new Date(a.queued_at || a.start_time || 0).getTime();
      const timeB = new Date(b.queued_at || b.start_time || 0).getTime();
      return timeB - timeA;
    });
    res.json({ success: true, data: sorted });
  });

  app.get('/api/logs', async (req, res) => {
    const db = await readDb();
    res.json({ success: true, data: db.logs || [] });
  });

  if (process.env.NODE_ENV === 'production') {
    const distIndex = path.resolve('dist/index.html');
    try {
      await fs.access(distIndex);
    } catch (e) {
      console.error('Rode npm run build antes de npm start');
      process.exit(1);
    }

    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(distIndex);
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite dev middleware initialization skipped, serving dist:', e);
      app.use(express.static(path.resolve('dist')));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.resolve('dist/index.html'));
      });
    }
  }

  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '127.0.0.1';
  app.listen(Number(PORT), HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

const currentFile = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile);
if (isDirectRun) {
  startServer().catch(console.error);
}
