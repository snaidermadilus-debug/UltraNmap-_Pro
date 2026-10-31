import express from 'express';
import { execSync } from 'child_process';
import os from 'os';
import { readDb, writeDb } from './src/db/db.js';
import { runScan, cancelScan } from './src/scanner/scanner.js';
import { parseNmapXML } from './src/scanner/parser.js';
import { probeWeb } from './src/scanner/webProbe.js';

async function startServer() {
  const db = await readDb();
  
  // Cleanup orphans on startup
  db.jobs.forEach((job: any) => {
    if (job.status === 'running') {
      job.status = 'failed';
      job.stderr = 'Server restarted during scan';
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
    let nmapVersion = 'Not installed';
    try {
        nmapVersion = execSync('nmap --version').toString().split('\n')[0];
    } catch (e) {}
    
    res.json({
        success: true,
        data: {
            platform: process.platform,
            hostname: os.hostname(),
            nodeVersion: process.version,
            nmapInstalled: nmapVersion !== 'Not installed',
            nmapVersion,
            executionMode: 'local' 
        }
    });
  });

  app.get('/api/network', (req, res) => {
    try {
      const output = execSync('ip -j addr show').toString();
      const routes = execSync('ip -j route show default').toString();
      res.json({ success: true, data: { interfaces: JSON.parse(output), routes: JSON.parse(routes) } });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to detect network' });
    }
  });

  app.post('/api/network/scan', async (req, res) => {
      const { cidr } = req.body;
      const id = Math.random().toString(36).substring(7);
      const db = await readDb();
      db.jobs.push({ id, target: cidr, type: 'discovery', status: 'queued', start_time: new Date().toISOString() });
      await writeDb(db);
      
      runScan(id, cidr, 'discovery').catch(console.error);
      
      res.json({ success: true, data: { id } });
  });

  app.post('/api/scans', async (req, res) => {
    const { target, type } = req.body;
    const id = Math.random().toString(36).substring(7);
    const db = await readDb();
    db.jobs.push({ id, target, type, status: 'queued', start_time: new Date().toISOString() });
    await writeDb(db);
    
    runScan(id, target, type).catch(console.error);
    
    res.json({ success: true, data: { id } });
  });

  app.get('/api/scans/:id', async (req, res) => {
    const db = await readDb();
    const job = db.jobs.find((j: any) => j.id === req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    
    let parsedData = null;
    let webResults: any[] = [];
    if (job.status === 'completed' && job.stdout) {
      try {
        parsedData = await parseNmapXML(job.stdout);
        // Web discovery
        for (const host of parsedData) {
            for (const port of host.ports) {
                if (['http', 'https', 'ssl/http'].includes(port.service.toLowerCase())) {
                    const protocol = port.service.includes('https') || port.service.includes('ssl') ? 'https' : 'http';
                    const web = await probeWeb(host.address, port.port, protocol);
                    if (web.confirmed) webResults.push(web);
                }
            }
        }
      } catch (e) {
        console.error('Parsing/Probing error', e);
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
    res.json({ success: true, data: db.jobs.sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()) });
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

startServer().catch(console.error);
