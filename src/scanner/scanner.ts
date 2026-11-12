import { spawn, execSync, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { readDb, updateDb } from '../db/db.js';
import { parseNmapXML } from './parser.js';
import { probeWebBatch } from './webProbe.js';
import { resolveOutputPath, getOutputsDir } from './utils.js';

const activeProcesses = new Map<string, ChildProcess>();
const MAX_CONCURRENT_SCANS = 2;
let isQueueProcessing = false;
let needsRerun = false;

// Root user detection
export const isRoot = typeof process.getuid === 'function' ? process.getuid() === 0 : false;

async function killProcessGroupGraceful(proc: ChildProcess): Promise<void> {
  const pid = proc.pid;
  if (!pid) return;

  try {
    process.kill(-pid, 'SIGTERM');
  } catch (e) {
    try {
      proc.kill('SIGTERM');
    } catch (e2) {}
  }

  await new Promise((r) => setTimeout(r, 300));

  try {
    process.kill(pid, 0);
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (e) {
      try {
        proc.kill('SIGKILL');
      } catch (e2) {}
    }
  } catch (e) {
    // Process already exited cleanly
  }
}

export function validateTarget(target: string): boolean {
  if (!target || typeof target !== 'string') return false;
  const clean = target.trim();
  if (!clean || clean.startsWith('-') || clean.length > 253) return false;

  // Check IPv4 or IPv4 CIDR
  const cidrMatch = clean.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/);
  if (cidrMatch) {
    const [, o1, o2, o3, o4, prefixStr] = cidrMatch;
    const octets = [Number(o1), Number(o2), Number(o3), Number(o4)];
    if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return false;
    if (prefixStr !== undefined) {
      const prefix = Number(prefixStr);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
    }
    return true;
  }

  // Hostname validation: reject double dots, leading/trailing dots, starting/ending hyphens in labels
  if (clean.includes('..') || clean.startsWith('.') || clean.endsWith('.')) return false;

  const labels = clean.split('.');
  for (const label of labels) {
    if (!label || label.startsWith('-') || label.endsWith('-') || label.length > 63) {
      return false;
    }
  }

  const hostnameMatch = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  if (!hostnameMatch.test(clean)) return false;

  return true;
}

export function validateCustomPorts(customPorts?: string): boolean {
  if (!customPorts || typeof customPorts !== 'string') return true;
  const clean = customPorts.trim();
  if (!clean) return true;

  if (clean.length > 2000) return false;

  const regex = /^[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*$/;
  if (!regex.test(clean)) return false;

  const parts = clean.split(',');
  if (parts.length > 500) return false;

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(Number);
      if (isNaN(startStr) || isNaN(endStr) || startStr < 1 || endStr > 65535 || startStr > endStr) {
        return false;
      }
    } else {
      const p = Number(part);
      if (isNaN(p) || p < 1 || p > 65535) return false;
    }
  }

  return true;
}

export function buildNmapArgs(type: string, target: string, speed?: string, customPorts?: string): string[] {
  let args: string[] = [];
  const cleanTarget = target.trim();
  const timing = speed && ['T2', 'T3', 'T4', 'T5'].includes(speed.toUpperCase()) 
    ? `-${speed.toUpperCase()}` 
    : (type === 'stealth' ? '-T2' : '-T4');

  const forceNonRoot = typeof process !== 'undefined' && process.env.FORCE_NON_ROOT === '1';
  const effectiveIsRoot = isRoot && !forceNonRoot;

  switch (type) {
    case 'discovery':
      if (!effectiveIsRoot) {
        args = ['-sn', '-PS21,22,23,80,443,445,554,8080', cleanTarget];
      } else {
        args = ['-sn', cleanTarget];
      }
      break;
    case 'aggressive':
      args = ['-Pn', timing, '-A', cleanTarget];
      break;
    case 'vuln':
      args = ['-Pn', timing, '--script', 'vuln', '-sV', cleanTarget];
      break;
    case 'scripts':
      args = ['-Pn', timing, '-sC', cleanTarget];
      break;
    case 'db':
      args = ['-Pn', timing, '-p', '3306,5432,27017,6379,1433', cleanTarget];
      break;
    case 'iot':
      args = ['-Pn', timing, '-p', '554,8080,1883,37777,5000', cleanTarget];
      break;
    case 'smb':
      args = ['-Pn', timing, '-p', '139,445,3389', cleanTarget];
      break;
    case 'ssl':
      args = ['-Pn', timing, '--script', 'ssl-enum-ciphers', '-p', '443,8443', cleanTarget];
      break;
    case 'firewall':
      args = ['-Pn', timing, '-sA', cleanTarget];
      break;
    case 'stealth':
      args = ['-Pn', timing, '-sS', cleanTarget];
      break;
    case 'fast':
      args = ['-Pn', timing, '-F', cleanTarget];
      break;
    case 'common':
      args = ['-Pn', timing, '--top-ports', '100', cleanTarget];
      break;
    case 'top1000':
      args = ['-Pn', timing, '--top-ports', '1000', cleanTarget];
      break;
    case 'all':
      args = ['-Pn', timing, '-p-', cleanTarget];
      break;
    case 'services':
      args = ['-Pn', timing, '-sV', cleanTarget];
      break;
    case 'web':
      args = ['-Pn', timing, '-p', '80,443,8080,8443,8000,8888,3000,5000', '-sV', cleanTarget];
      break;
    case 'os':
      args = ['-Pn', timing, '-O', cleanTarget];
      break;
    case 'udp':
      args = ['-Pn', timing, '-sU', '-p', '53,123,161,1900,5353', cleanTarget];
      break;
    default:
      args = ['-Pn', timing, '-F', cleanTarget];
      break;
  }

  // If running unprivileged (not root): swap -sS to -sT and add --unprivileged
  if (!effectiveIsRoot) {
    const sSIndex = args.indexOf('-sS');
    if (sSIndex !== -1) {
      args[sSIndex] = '-sT';
    }
    if (!args.includes('--unprivileged') && type !== 'discovery') {
      args.unshift('--unprivileged');
    }
  }

  // Handle custom ports override if provided (and not host discovery)
  if (customPorts && customPorts.trim() && type !== 'discovery') {
    const cleanedPorts = customPorts.trim();
    const pIndex = args.indexOf('-p');
    if (pIndex !== -1) {
      args[pIndex + 1] = cleanedPorts;
    } else {
      const topPortsIndex = args.indexOf('--top-ports');
      const fIndex = args.indexOf('-F');
      const pDashIndex = args.indexOf('-p-');
      if (topPortsIndex !== -1) {
        args.splice(topPortsIndex, 2, '-p', cleanedPorts);
      } else if (fIndex !== -1) {
        args.splice(fIndex, 1, '-p', cleanedPorts);
      } else if (pDashIndex !== -1) {
        args.splice(pDashIndex, 1, '-p', cleanedPorts);
      } else {
        const targetIndex = args.indexOf(cleanTarget);
        if (targetIndex !== -1) {
          args.splice(targetIndex, 0, '-p', cleanedPorts);
        } else {
          args.push('-p', cleanedPorts);
        }
      }
    }
  }

  args.push('-oX', '-');
  return args;
}

export async function processQueue() {
  if (isQueueProcessing) {
    needsRerun = true;
    return;
  }
  isQueueProcessing = true;

  try {
    while (true) {
      // Re-read DB at each iteration to ensure fresh, accurate state
      const db = await readDb();
      const runningJobs = db.jobs.filter((j: any) => j.status === 'running');

      if (runningJobs.length >= MAX_CONCURRENT_SCANS) break;

      const queuedJobs = db.jobs
        .filter((j: any) => j.status === 'queued')
        .sort((a: any, b: any) => {
          const tA = new Date(a.queued_at || a.start_time || 0).getTime();
          const tB = new Date(b.queued_at || b.start_time || 0).getTime();
          return tA - tB;
        });

      if (queuedJobs.length === 0) break;
      const queuedJob = queuedJobs[0];

      if (activeProcesses.has(queuedJob.id)) {
        break;
      }

      await updateDb((database) => {
        const j = database.jobs.find((job: any) => job.id === queuedJob.id);
        if (j) {
          j.status = 'running';
          j.start_time = new Date().toISOString();
        }
      });

      startJobExecution(queuedJob.id, queuedJob.target, queuedJob.type, queuedJob.speed, queuedJob.customPorts).catch(console.error);
    }
  } finally {
    isQueueProcessing = false;
    if (needsRerun) {
      needsRerun = false;
      processQueue().catch(console.error);
    }
  }
}

export async function runScan(jobId: string, target: string, type: string, speed?: string, customPorts?: string) {
  if (!validateTarget(target) || !validateCustomPorts(customPorts)) {
    await updateDb((db) => {
      const job = db.jobs.find((j: any) => j.id === jobId);
      if (job) {
        job.status = 'failed';
        job.stderr = 'Alvo ou porta customizada inválida.';
        job.end_time = new Date().toISOString();
      }
    });
    return;
  }

  await processQueue();
}

async function startJobExecution(jobId: string, target: string, type: string, speed?: string, customPorts?: string) {
  if (activeProcesses.has(jobId)) {
    return;
  }

  const db = await readDb();
  const job = db.jobs.find((j: any) => j.id === jobId);
  // The job may have been cancelled between being marked 'running' and reaching this point
  if (!job || job.status !== 'running') {
    processQueue().catch(console.error);
    return;
  }

  const args = buildNmapArgs(job.type || type, job.target || target, job.speed || speed, job.customPorts || customPorts);
  let nmapCommand = 'nmap';

  try {
    execSync('command -v nmap');
  } catch (e) {
    nmapCommand = '';
  }

  if (!nmapCommand) {
    await updateDb((database) => {
      const j = database.jobs.find((item: any) => item.id === jobId);
      if (j) {
        j.status = 'failed';
        j.stderr = 'Nmap não encontrado no PATH.';
        j.end_time = new Date().toISOString();
      }
    });
    processQueue();
    return;
  }

  const fullCommand = `${nmapCommand} ${args.join(' ')}`;
  console.log(`[SCAN RUN] ID: ${jobId} | Target: ${target} | Command: ${fullCommand}`);

  const nmap = spawn(nmapCommand, args, { detached: true });
  activeProcesses.set(jobId, nmap);

  let finished = false;
  let stdout = '';
  let stderr = '';
  let isTruncated = false;
  let timedOut = false;
  const MAX_STDOUT_BYTES = 5 * 1024 * 1024; // 5 MB

  const timeoutMin = process.env.SCAN_TIMEOUT_MIN ? Number(process.env.SCAN_TIMEOUT_MIN) : 30;
  const timeoutMs = (isNaN(timeoutMin) || timeoutMin <= 0 ? 30 : timeoutMin) * 60 * 1000;

  // 1a) Synchronously attach ALL listeners and setup timeout timer IMMEDIATELY after spawn
  const timer = setTimeout(async () => {
    console.warn(`[SCAN TIMEOUT] Job ID ${jobId} excedeu ${timeoutMin} min.`);
    timedOut = true;
    activeProcesses.delete(jobId);
    killProcessGroupGraceful(nmap);

    // Safety net: wait up to 5s for 'close' event
    setTimeout(async () => {
      if (finished) return;
      finished = true;
      stderr += `\nTimeout de execução excedido (${timeoutMin} min).`;
      
      if (stdout) {
        const outputPath = resolveOutputPath(jobId);
        if (outputPath) {
          try {
            await fs.mkdir(getOutputsDir(), { recursive: true });
            await fs.writeFile(outputPath, stdout, 'utf-8');
          } catch (e) {
            console.error('[OUTPUT WRITE ERROR]', e);
          }
        }
      }

      await updateDb((database) => {
        const currentJob = database.jobs.find((j: any) => j.id === jobId);
        if (currentJob && currentJob.status !== 'cancelled') {
          currentJob.status = 'failed';
          currentJob.stdout = stdout.length > 200 * 1024 ? stdout.substring(0, 200 * 1024) : stdout;
          currentJob.stderr = stderr.trim();
          currentJob.end_time = new Date().toISOString();
        }
      });
      processQueue();
    }, 5000);
  }, timeoutMs);

  // Decode as a stream so multi-byte UTF-8 characters split across chunks are not corrupted
  nmap.stdout.setEncoding('utf8');
  nmap.stderr.setEncoding('utf8');

  nmap.stdout.on('data', (data) => {
    if (stdout.length < MAX_STDOUT_BYTES) {
      stdout += data.toString();
      if (stdout.length >= MAX_STDOUT_BYTES && !isTruncated) {
        isTruncated = true;
        stdout = stdout.substring(0, MAX_STDOUT_BYTES);
        stderr += '\nAviso: Saída do Nmap excedeu o limite de 5MB e foi truncada.';
      }
    }
  });

  nmap.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  nmap.on('error', async (err) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    activeProcesses.delete(jobId);
    stderr += `\nErro de execução no processo Nmap: ${err.message}`;

    await updateDb((database) => {
      const currentJob = database.jobs.find((j: any) => j.id === jobId);
      if (currentJob && currentJob.status !== 'cancelled') {
        currentJob.status = 'failed';
        currentJob.stderr = stderr.trim();
        currentJob.end_time = new Date().toISOString();
      }
    });
    processQueue();
  });

  nmap.on('close', async (code) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    activeProcesses.delete(jobId);

    if (timedOut) {
      stderr += `\nTimeout de execução excedido (${timeoutMin} min).`;
    }

    // Translate root privilege error if present
    if (stderr.toLowerCase().includes('requires root privileges') || stderr.toLowerCase().includes('root privileges')) {
      stderr += '\n\n[ERRO DE PERMISSÃO] Este perfil requer privilégios de root para ser executado. Execute o aplicativo como root (su no Termux) ou escolha um perfil que não exija root (ex: Fast, Web, Serviços, Top 1000).';
    }

    let parsedData: any[] = [];
    if (code === 0 && stdout && !timedOut) {
      try {
        parsedData = await parseNmapXML(stdout);
      } catch (e) {
        console.error('[PARSER ERROR ON CLOSE]', e);
      }
    }

    // Save full XML output to outputs directory
    let savedOutputPath: string | null = null;
    if (stdout) {
      const outputPath = resolveOutputPath(jobId);
      if (outputPath) {
        try {
          await fs.mkdir(getOutputsDir(), { recursive: true });
          await fs.writeFile(outputPath, stdout, 'utf-8');
          savedOutputPath = outputPath;
        } catch (e) {
          console.error('[OUTPUT WRITE ERROR]', e);
        }
      }
    }

    const isSuccess = code === 0 && !timedOut;
    const probeTasks: { target: string; port: string; protocol: string }[] = [];
    if (isSuccess) {
      for (const host of parsedData) {
        for (const portObj of host.ports || []) {
          if (portObj.state === 'open') {
            const svc = (portObj.service || '').toLowerCase();
            const pNum = Number(portObj.port);
            const isWebPort = [80, 443, 8080, 8443, 8000, 8888, 3000, 5000].includes(pNum);
            const isWebService = svc.includes('http') || svc.includes('ssl') || svc.includes('web');

            if (isWebService || isWebPort) {
              const protocol = (svc.includes('https') || svc.includes('ssl') || pNum === 443 || pNum === 8443) ? 'https' : 'http';
              probeTasks.push({ target: host.address, port: portObj.port, protocol });
            }
          }
        }
      }
    }

    // Step 1: Save completed / failed status, summary, and outputPath (without storing raw XML stdout in db.json).
    // webProbePending tells the UI to keep polling until the web results arrive in step 2.
    let shouldProbe = false;
    await updateDb((database) => {
      const currentJob = database.jobs.find((j: any) => j.id === jobId);
      if (currentJob && currentJob.status !== 'cancelled') {
        currentJob.status = isSuccess ? 'completed' : 'failed';
        currentJob.outputPath = savedOutputPath;
        currentJob.stderr = stderr.trim();
        currentJob.exit_code = code;
        currentJob.parsedData = parsedData;
        currentJob.end_time = new Date().toISOString();
        delete currentJob.stdout;
        shouldProbe = probeTasks.length > 0;
        if (shouldProbe) currentJob.webProbePending = true;
      }
    });

    // Step 2: Run Web Probes AFTER saving completion status
    if (shouldProbe) {
      let webResults: any[] = [];
      try {
        webResults = await probeWebBatch(probeTasks);
      } catch (e) {
        console.error('[WEB PROBE POST-PROCESS ERROR]', e);
      }
      await updateDb((database) => {
        const currentJob = database.jobs.find((j: any) => j.id === jobId);
        if (currentJob) {
          currentJob.webResults = webResults;
          delete currentJob.webProbePending;
        }
      });
    }

    processQueue();
  });

  // 1b) Only AFTER attaching listeners, update DB with PID and command info
  await updateDb((database) => {
    const j = database.jobs.find((item: any) => item.id === jobId);
    if (j) {
      j.pid = nmap.pid;
      j.nmapCommand = fullCommand;
      if (!j.start_time) {
        j.start_time = new Date().toISOString();
      }
    }
  });
}

export async function cancelScan(jobId: string) {
  const proc = activeProcesses.get(jobId);
  if (proc) {
    activeProcesses.delete(jobId);
    await killProcessGroupGraceful(proc);
  }

  await updateDb((database) => {
    const job = database.jobs.find((j: any) => j.id === jobId);
    if (job && (job.status === 'running' || job.status === 'queued')) {
      job.status = 'cancelled';
      job.end_time = new Date().toISOString();
      delete job.webProbePending;
    }
  });

  processQueue().catch(console.error);
}
