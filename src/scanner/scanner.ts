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

    if (!nmapCommand) {
        throw new Error('Nmap não está instalado.');
    }

    const fullCommand = `${nmapCommand} ${args.join(' ')}`;
    console.log(`[SCAN START] Running: ${fullCommand}`);

    const nmap = spawn(nmapCommand, args);
    
    if (job) {
      job.status = 'running';
      job.pid = nmap.pid;
      job.nmapCommand = fullCommand;
      await writeDb(db);
    }

    let stdout = '';
    let stderr = '';

    nmap.stdout.on('data', (data) => { stdout += data; });
    nmap.stderr.on('data', (data) => { stderr += data; });

    nmap.on('error', (err) => {
        stderr += `Spawn error: ${err.message}`;
    });

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
