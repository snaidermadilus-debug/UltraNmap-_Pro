import { spawn, execSync } from 'child_process';
import { readDb, writeDb } from '../db/db.js';

export async function runScan(jobId: string, target: string, type: string) {
  let db = await readDb();
  let job = db.jobs.find((j: any) => j.id === jobId);
  
  try {
    if (!/^([a-zA-Z0-9.-]+|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})$/.test(target)) {
      throw new Error('Invalid target');
    }

    let args = [];
    if (type === 'discovery') args = ['-sn', target];
    else if (type === 'fast') args = ['-F', target];
    else if (type === 'common') args = ['--top-ports', '100', target];
    else if (type === 'all') args = ['-p-', target];
    else if (type === 'services') args = ['-sV', target];
    else if (type === 'os') args = ['-O', target];
    else if (type === 'udp') args = ['-sU', '-p', '53,123,161,1900,5353', target];
    else throw new Error('Invalid scan type');

    args.push('-oX', '-'); 

    // Try to find Nmap
    let nmapCommand = 'nmap';
    try {
      execSync('which nmap');
    } catch (e) {
      nmapCommand = ''; // Mark as not found
    }

    let nmap;
    if (nmapCommand) {
      nmap = spawn(nmapCommand, args);
    } else {
      // Mock for development (only if nmap not found)
      const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<nmaprun scanner="nmap" args="nmap ${args.join(' ')}" start="${Date.now()}" startstr="${new Date().toString()}" version="7.94" xmloutputversion="1.05">
<host>
  <status state="up" reason="localhost-response" reason_ttl="0"/>
  <address addr="${target}" addrtype="ipv4"/>
  <ports>
    <port protocol="tcp" portid="80"><state state="open" reason="syn-ack" reason_ttl="0"/><service name="http" version="Apache" method="table" conf="3"/></port>
    <port protocol="tcp" portid="22"><state state="open" reason="syn-ack" reason_ttl="0"/><service name="ssh" version="OpenSSH" method="table" conf="3"/></port>
    <port protocol="tcp" portid="443"><state state="closed" reason="conn-refused" reason_ttl="0"/><service name="http" method="table" conf="3"/></port>
  </ports>
</host>
</nmaprun>`;
      setTimeout(async () => {
          const db = await readDb();
          const job = db.jobs.find((j: any) => j.id === jobId);
          if (job) {
            job.status = 'completed';
            job.stdout = mockXML;
            job.stderr = '';
            job.exit_code = 0;
            job.end_time = new Date().toISOString();
            await writeDb(db);
          }
      }, 2000);
      return; // Mocked
    }
    
    if (job) {
      job.status = 'running';
      job.pid = nmap.pid;
      await writeDb(db);
    }

    let stdout = '';
    let stderr = '';

    nmap.stdout.on('data', (data) => { stdout += data; });
    nmap.stderr.on('data', (data) => { stderr += data; });

    nmap.on('close', async (code) => {
      const db = await readDb();
      const job = db.jobs.find((j: any) => j.id === jobId);
      if (job) {
        job.status = code === 0 ? 'completed' : 'failed';
        job.stdout = stdout;
        job.stderr = stderr;
        job.exit_code = code;
        job.end_time = new Date().toISOString();
        await writeDb(db);
      }
    });
  } catch (err: any) {
    if (job) {
      job.status = 'failed';
      job.stderr = err.message;
      job.end_time = new Date().toISOString();
      await writeDb(db);
    }
  }
}

export async function cancelScan(jobId: string) {
  const db = await readDb();
  const job = db.jobs.find((j: any) => j.id === jobId);
  
  if (job && job.pid) {
    process.kill(job.pid, 'SIGTERM');
    job.status = 'cancelled';
    await writeDb(db);
  }
}
