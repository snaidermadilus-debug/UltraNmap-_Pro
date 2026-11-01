import { spawn, execSync, ChildProcess } from 'child_process';
import { readDb, writeDb } from '../db/db.js';

const activeProcesses = new Map<string, ChildProcess>();
const MAX_CONCURRENT_SCANS = 2;

export function validateTarget(target: string): boolean {
  if (!target || typeof target !== 'string') return false;
  // Allows IPv4, IPv4 CIDR (e.g. 192.168.1.0/24), hostnames (localhost, target.local, domain.com)
  const pattern = /^([a-zA-Z0-9.-]+|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(\/[0-9]{1,2})?)$/;
  return pattern.test(target.trim());
}

export function buildNmapArgs(type: string, target: string): string[] {
  let args: string[] = [];
  const cleanTarget = target.trim();

  switch (type) {
    case 'discovery':
      args = ['-sn', cleanTarget];
      break;
    case 'fast':
      args = ['-Pn', '-F', cleanTarget];
      break;
    case 'common':
      args = ['-Pn', '--top-ports', '100', cleanTarget];
      break;
    case 'top1000':
      args = ['-Pn', '--top-ports', '1000', cleanTarget];
      break;
    case 'all':
      args = ['-Pn', '-p-', cleanTarget];
      break;
    case 'services':
      args = ['-Pn', '-sV', cleanTarget];
      break;
    case 'web':
      args = ['-Pn', '-p', '80,443,8080,8443,8000,8888,3000,5000', '-sV', cleanTarget];
      break;
    case 'os':
      args = ['-Pn', '-O', cleanTarget];
      break;
    case 'udp':
      args = ['-Pn', '-sU', '-p', '53,123,161,1900,5353', cleanTarget];
      break;
    default:
      args = ['-Pn', '-F', cleanTarget];
      break;
  }

  args.push('-oX', '-');
  return args;
}

export async function processQueue() {
  const db = await readDb();
  const runningJobs = db.jobs.filter((j: any) => j.status === 'running');
  if (runningJobs.length >= MAX_CONCURRENT_SCANS) return;

  const queuedJob = db.jobs.find((j: any) => j.status === 'queued');
  if (queuedJob) {
    startJobExecution(queuedJob.id, queuedJob.target, queuedJob.type).catch(console.error);
  }
}

export async function runScan(jobId: string, target: string, type: string) {
  if (!validateTarget(target)) {
    const db = await readDb();
    const job = db.jobs.find((j: any) => j.id === jobId);
    if (job) {
      job.status = 'failed';
      job.stderr = 'Alvo inválido. Use um IPv4, CIDR ou Hostname válido.';
      job.end_time = new Date().toISOString();
      await writeDb(db);
    }
    return;
  }

  await processQueue();
}

async function startJobExecution(jobId: string, target: string, type: string) {
  const db = await readDb();
  const job = db.jobs.find((j: any) => j.id === jobId);
  if (!job) return;

  const args = buildNmapArgs(type, target);
  let nmapCommand = 'nmap';

  try {
    execSync('which nmap');
  } catch (e) {
    nmapCommand = '';
  }

  if (!nmapCommand) {
    job.status = 'failed';
    job.stderr = 'Erro: Binário do Nmap não encontrado no sistema. Instale o nmap (ex: pkg install nmap no Termux).';
    job.end_time = new Date().toISOString();
    await writeDb(db);
    processQueue();
    return;
  }

  const fullCommand = `${nmapCommand} ${args.join(' ')}`;
  console.log(`[SCAN RUN] ID: ${jobId} | Target: ${target} | Command: ${fullCommand}`);

  const nmap = spawn(nmapCommand, args);
  activeProcesses.set(jobId, nmap);

  job.status = 'running';
  job.pid = nmap.pid;
  job.nmapCommand = fullCommand;
  await writeDb(db);

  let stdout = '';
  let stderr = '';

  nmap.stdout.on('data', (data) => { stdout += data.toString(); });
  nmap.stderr.on('data', (data) => { stderr += data.toString(); });

  nmap.on('error', async (err) => {
    stderr += `\nErro ao disparar processo: ${err.message}`;
  });

  nmap.on('close', async (code) => {
    activeProcesses.delete(jobId);
    const updatedDb = await readDb();
    const currentJob = updatedDb.jobs.find((j: any) => j.id === jobId);
    if (currentJob && currentJob.status !== 'cancelled') {
      currentJob.status = code === 0 ? 'completed' : 'failed';
      currentJob.stdout = stdout;
      currentJob.stderr = stderr;
      currentJob.exit_code = code;
      currentJob.end_time = new Date().toISOString();
      await writeDb(updatedDb);
    }
    processQueue();
  });
}

export async function cancelScan(jobId: string) {
  const process = activeProcesses.get(jobId);
  if (process) {
    try {
      process.kill('SIGKILL');
    } catch (e) {}
    activeProcesses.delete(jobId);
  }

  const db = await readDb();
  const job = db.jobs.find((j: any) => j.id === jobId);
  if (job) {
    job.status = 'cancelled';
    job.end_time = new Date().toISOString();
    await writeDb(db);
  }
  processQueue();
}
