import { spawn, execSync } from 'child_process';
import { readDb, writeDb } from '../db/db.js';

export async function runScan(jobId: string, target: string, type: string) {
  const db = await readDb();
  
  if (!/^([a-zA-Z0-9.-]+|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})$/.test(target)) {
    throw new Error('Invalid target');
  }

  let args = [];
  if (type === 'fast') args = ['-F', target];
  else if (type === 'common') args = ['--top-ports', '100', target];
  else if (type === 'all') args = ['-p-', target];
  else throw new Error('Invalid scan type');

  args.push('-oX', '-'); 

  // Mock nmap for test environment
  // const nmapPath = execSync('which nmap').toString().trim();
  const nmap = spawn('ls', ['-l', '/']);
  
  const job = db.jobs.find((j: any) => j.id === jobId);
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
      job.status = 'completed';
      job.stdout = stdout;
      job.stderr = stderr;
      job.exit_code = code;
      job.end_time = new Date().toISOString();
      await writeDb(db);
    }
  });
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
