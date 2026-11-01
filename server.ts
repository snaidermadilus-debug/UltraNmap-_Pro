import express from 'express';
import { execSync } from 'child_process';
import os from 'os';
import { readDb, writeDb } from './src/db/db.js';
import { runScan, cancelScan } from './src/scanner/scanner.js';
import { parseNmapXML } from './src/scanner/parser.js';
import { probeWeb } from './src/scanner/webProbe.js';

export function getLocalNetworkInfo() {
  let ip = '127.0.0.1';
  let interfaceName = 'lo';
  let cidr = '127.0.0.1/32';
  let gateway = '192.168.1.1';
  let netmask = '255.255.255.0';

  try {
    const addrOutput = execSync('ip -j addr show').toString();
    const routeOutput = execSync('ip -j route show default').toString();
    const addrJson = JSON.parse(addrOutput);
    const routeJson = JSON.parse(routeOutput);

    for (const iface of addrJson) {
      if (iface.ifname !== 'lo' && iface.addr_info) {
        const v4 = iface.addr_info.find((a: any) => a.family === 'inet');
        if (v4) {
          ip = v4.local;
          interfaceName = iface.ifname;
          const prefix = v4.prefixlen || 24;
          const parts = ip.split('.').map(Number);
          if (prefix === 24) parts[3] = 0;
          cidr = `${parts.join('.')}/${prefix}`;
          break;
        }
      }
    }
    if (routeJson && routeJson[0] && routeJson[0].gateway) {
      gateway = routeJson[0].gateway;
    }
  } catch (e) {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      if (!name.includes('lo')) {
        const list = interfaces[name];
        if (list) {
          const v4 = list.find(item => item.family === 'IPv4' && !item.internal);
          if (v4) {
            ip = v4.address;
            interfaceName = name;
            netmask = v4.netmask;
            const parts = ip.split('.').map(Number);
            parts[3] = 0;
            cidr = `${parts.join('.')}/24`;
            break;
          }
        }
      }
    }
  }

  return { ip, interface: interfaceName, cidr, gateway, netmask };
}

export async function startServer() {
  const db = await readDb();
  
  // Clean orphan running states on restart
  db.jobs.forEach((job: any) => {
    if (job.status === 'running') {
      job.status = 'failed';
      job.stderr = 'Servidor foi reiniciado durante a execução do scan.';
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
    const targetCidr = (req.body && req.body.cidr) ? req.body.cidr.trim() : netInfo.cidr;
    const id = Math.random().toString(36).substring(7);

    const db = await readDb();
    db.jobs.push({
      id,
      target: targetCidr,
      type: 'discovery',
      status: 'queued',
      start_time: new Date().toISOString()
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

    const id = Math.random().toString(36).substring(7);
    const db = await readDb();
    db.jobs.push({
      id,
      target: target.trim(),
      type,
      status: 'queued',
      start_time: new Date().toISOString()
    });
    await writeDb(db);
    
    runScan(id, target.trim(), type).catch(console.error);
    
    res.json({ success: true, data: { id } });
  });

  app.get('/api/scans/:id', async (req, res) => {
    const db = await readDb();
    const job = db.jobs.find((j: any) => j.id === req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job não encontrado' });
    
    let parsedData = null;
    let webResults: any[] = [];

    if (job.status === 'completed' && job.stdout) {
      try {
        parsedData = await parseNmapXML(job.stdout);
        
        if (Array.isArray(parsedData)) {
          for (const host of parsedData) {
            for (const portObj of host.ports) {
              if (portObj.state === 'open') {
                const svc = (portObj.service || '').toLowerCase();
                const pNum = Number(portObj.port);
                const isWebPort = [80, 443, 8080, 8443, 8000, 8888, 3000, 5000].includes(pNum);
                const isWebService = svc.includes('http') || svc.includes('ssl') || svc.includes('web');

                if (isWebService || isWebPort) {
                  const protocol = (svc.includes('https') || svc.includes('ssl') || pNum === 443 || pNum === 8443) ? 'https' : 'http';
                  const web = await probeWeb(host.address, portObj.port, protocol);
                  if (web.confirmed) {
                    webResults.push(web);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('[PARSING / PROBING ERROR]', e);
      }
    }

    res.json({ success: true, data: { ...job, parsedData, webResults } });
  });

  app.post('/api/scans/:id/cancel', async (req, res) => {
    await cancelScan(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/history', async (req, res) => {
    const db = await readDb();
    const sorted = db.jobs.sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
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

// Execute startServer when executed directly
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startServer().catch(console.error);
}
