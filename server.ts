import 'dotenv/config';
import express from 'express';
import { execSync } from 'child_process';
import os from 'os';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { readDb, updateDb } from './src/db/db.js';
import { runScan, cancelScan, processQueue, validateTarget, validateCustomPorts, buildNmapArgs, isRoot } from './src/scanner/scanner.js';
import { parseNmapXML } from './src/scanner/parser.js';

const ALLOWED_PROFILES = [
  'discovery', 'fast', 'common', 'top1000', 'all', 'services', 
  'web', 'os', 'udp', 'aggressive', 'vuln', 'scripts', 
  'db', 'iot', 'smb', 'ssl', 'firewall', 'stealth'
];

function netmaskToPrefix(netmask: string): number {
  return netmask
    .split('.')
    .map(Number)
    .map(n => (n >>> 0).toString(2).split('1').length - 1)
    .reduce((acc, curr) => acc + curr, 0);
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

function calculateCidr(ip: string, prefixOrNetmask: string | number): string | null {
  if (!ip || ip === '127.0.0.1') return null;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null;

  let prefix = 24;
  if (typeof prefixOrNetmask === 'number') {
    prefix = prefixOrNetmask;
  } else if (typeof prefixOrNetmask === 'string') {
    prefix = netmaskToPrefix(prefixOrNetmask);
  }

  if (prefix < 0 || prefix > 32) return null;

  const maskNum = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const ipNum = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
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
    let routeJson: any = null;
    try {
      const routeOutput = execSync('ip -j route show default').toString();
      routeJson = JSON.parse(routeOutput);
    } catch (e) {}

    const defaultIfaceName = routeJson?.[0]?.dev || null;
    if (routeJson?.[0]?.gateway) {
      gateway = routeJson[0].gateway;
    }

    const addrOutput = execSync('ip -j addr show').toString();
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
        if (ip) cidr = calculateCidr(ip, prefix);
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
            if (ip) cidr = calculateCidr(ip, prefix);
            break;
          }
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
            const v4 = list.find(item => item.family === 'IPv4' && !item.internal);
            if (v4) {
              ip = v4.address;
              interfaceName = name;
              netmask = v4.netmask;
              if (ip) cidr = calculateCidr(ip, v4.netmask);
              break;
            }
          }
        }
      }
    } catch (e) {}
  }

  return {
    ip: ip || 'não detectado',
    interface: interfaceName || 'não detectado',
    cidr: cidr || 'não detectado',
    gateway: gateway || 'não detectado',
    netmask: netmask || 'não detectado',
    isRoot
  };
}

export async function startServer() {
  await updateDb((db) => {
    if (Array.isArray(db.jobs)) {
      db.jobs.forEach((job: any) => {
        if (job.status === 'running') {
          job.status = 'failed';
          job.stderr = 'Servidor foi reiniciado durante a execução do scan.';
          job.end_time = new Date().toISOString();
        }
      });
    }
  });

  // Startup: process any queued jobs
  processQueue().catch(console.error);

  const app = express();
  app.use(express.json());

  app.get('/api/status', (req, res) => {
    let nmapStatus = 'offline';
    let nmapVersion = 'Não instalado';

    try {
      const versionOutput = execSync('nmap --version').toString();
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
      nmapVersion = execSync('nmap --version').toString().split('\n')[0].trim();
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
    const netInfo = getLocalNetworkInfo();
    let targetCidr = (req.body && req.body.cidr) ? req.body.cidr.trim() : null;

    if (!targetCidr && netInfo.cidr !== 'não detectado') {
      targetCidr = netInfo.cidr;
    }

    if (!targetCidr || targetCidr === 'não detectado' || !validateTarget(targetCidr)) {
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
    const { target, type, speed, customPorts } = req.body || {};
    const t = target && typeof target === 'string' ? target.trim() : '192.168.1.1';
    const profile = type && ALLOWED_PROFILES.includes(type) ? type : 'fast';
    const timing = speed && ['T2', 'T3', 'T4', 'T5'].includes(speed) ? speed : (profile === 'stealth' ? 'T2' : 'T4');
    
    const args = buildNmapArgs(profile, t, timing, customPorts);
    const command = `nmap ${args.join(' ')}`;
    res.json({ success: true, data: { command } });
  });

  app.post('/api/scans', async (req, res) => {
    const { target, type, speed, customPorts } = req.body || {};
    
    if (!target || typeof target !== 'string' || !type) {
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

    if (speed && !['T2', 'T3', 'T4', 'T5'].includes(speed)) {
      return res.status(400).json({ success: false, error: 'Velocidade de timing inválida (T2 a T5).' });
    }

    if (customPorts && !validateCustomPorts(customPorts)) {
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
    const { id } = req.params;
    const filePath = path.resolve(`data/outputs/${id}.xml`);
    try {
      const rawContent = await fs.readFile(filePath, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(rawContent);
    } catch (e) {
      const db = await readDb();
      const job = db.jobs.find((j: any) => j.id === id);
      if (job && job.stdout) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(job.stdout);
      }
      return res.status(404).json({ success: false, error: 'Saída bruta não encontrada' });
    }
  });

  app.get('/api/scans/:id', async (req, res) => {
    const db = await readDb();
    const job = db.jobs.find((j: any) => j.id === req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job não encontrado' });
    
    let parsedData = job.parsedData || null;
    if (!parsedData && job.status === 'completed' && job.stdout) {
      try {
        parsedData = await parseNmapXML(job.stdout);
      } catch (e) {}
    }

    res.json({ 
      success: true, 
      data: { 
        ...job, 
        parsedData, 
        webResults: job.webResults || [] 
      } 
    });
  });

  app.delete('/api/scans/:id', async (req, res) => {
    const db = await readDb();
    const jobIndex = db.jobs.findIndex((j: any) => j.id === req.params.id);
    
    if (jobIndex === -1) {
      return res.status(404).json({ success: false, error: 'Job não encontrado.' });
    }

    const job = db.jobs[jobIndex];
    if (job.status === 'running' || job.status === 'queued') {
      return res.status(400).json({ success: false, error: 'Não é possível excluir auditorias ativas ou na fila.' });
    }

    await updateDb((database) => {
      database.jobs = database.jobs.filter((j: any) => j.id !== req.params.id);
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
    await cancelScan(req.params.id);
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
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.resolve('dist/index.html'));
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
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startServer().catch(console.error);
}
