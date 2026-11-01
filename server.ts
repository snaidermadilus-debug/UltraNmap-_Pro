import 'dotenv/config';
import express from 'express';
import { execSync } from 'child_process';
import os from 'os';
import crypto from 'crypto';
import { readDb, writeDb } from './src/db/db.js';
import { runScan, cancelScan } from './src/scanner/scanner.js';
import { parseNmapXML } from './src/scanner/parser.js';

function netmaskToPrefix(netmask: string): number {
  return netmask
    .split('.')
    .map(Number)
    .map(n => (n >>> 0).toString(2).split('1').length - 1)
    .reduce((acc, curr) => acc + curr, 0);
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

  // 1. Try ip -j addr and ip -j route
  try {
    const addrOutput = execSync('ip -j addr show').toString();
    const routeOutput = execSync('ip -j route show default').toString();
    const addrJson = JSON.parse(addrOutput);
    const routeJson = JSON.parse(routeOutput);

    for (const iface of addrJson) {
      if (iface.ifname !== 'lo' && iface.addr_info) {
        const v4 = iface.addr_info.find((a: any) => a.family === 'inet');
        if (v4 && v4.local && !v4.local.startsWith('127.')) {
          ip = v4.local;
          interfaceName = iface.ifname;
          const prefix = v4.prefixlen ?? 24;
          if (ip) cidr = calculateCidr(ip, prefix);
          break;
        }
      }
    }

    if (routeJson && Array.isArray(routeJson) && routeJson[0] && routeJson[0].gateway) {
      gateway = routeJson[0].gateway;
    }
  } catch (e) {
    // Command ip not available or failed
  }

  // 2. Fallback to os.networkInterfaces()
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
    netmask: netmask || 'não detectado'
  };
}

export async function startServer() {
  const db = await readDb();
  
  // Clean orphan running states on restart
  db.jobs.forEach((job: any) => {
    if (job.status === 'running') {
      job.status = 'failed';
      job.stderr = 'Servidor foi reiniciado durante a execução do scan.';
      job.end_time = new Date().toISOString();
    }
  });
  await writeDb(db);

  const app = express();
  app.use(express.json());
  app.use(express.static('dist'));

  app.get('/api/status', (req, res) => {
    res.json({ success: true, data: { nmap: 'online', server: 'online' } });
  });

  app.get('/api/system/environment', (req, res) => {
    let nmapVersion = 'Não instalado';
    try {
      nmapVersion = execSync('nmap --version').toString().split('\n')[0];
    } catch (e) {}

    const netInfo = getLocalNetworkInfo();
    
    res.json({
      success: true,
      data: {
        platform: process.platform,
        hostname: os.hostname(),
        nodeVersion: process.version,
        nmapInstalled: nmapVersion !== 'Não instalado',
        nmapVersion,
        localNetwork: netInfo,
        executionMode: 'local'
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
    const targetCidr = (req.body && req.body.cidr) ? req.body.cidr.trim() : (netInfo.cidr !== 'não detectado' ? netInfo.cidr : '127.0.0.1/32');
    const id = crypto.randomUUID();

    const db = await readDb();
    db.jobs.push({
      id,
      target: targetCidr,
      type: 'discovery',
      status: 'queued',
      queued_at: new Date().toISOString(),
      start_time: null,
      end_time: null
    });
    await writeDb(db);
    
    runScan(id, targetCidr, 'discovery').catch(console.error);
    
    res.json({ success: true, data: { id, target: targetCidr } });
  });

  app.post('/api/scans', async (req, res) => {
    const { target, type } = req.body;
    if (!target || !type) {
      return res.status(400).json({ success: false, error: 'Alvo e tipo de scan são obrigatórios.' });
    }

    const id = crypto.randomUUID();
    const db = await readDb();
    db.jobs.push({
      id,
      target: target.trim(),
      type,
      status: 'queued',
      queued_at: new Date().toISOString(),
      start_time: null,
      end_time: null
    });
    await writeDb(db);
    
    runScan(id, target.trim(), type).catch(console.error);
    
    res.json({ success: true, data: { id } });
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

  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startServer().catch(console.error);
}
