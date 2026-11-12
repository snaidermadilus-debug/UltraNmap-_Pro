import fs from 'fs/promises';
import path from 'path';
import { getDataDir, resolveOutputPath } from '../scanner/utils.js';

const MAX_HISTORY = 50;

let mutexChain = Promise.resolve();

function getDbPaths() {
  const dataDir = getDataDir();
  return {
    dataDir,
    dbPath: path.resolve(dataDir, 'db.json'),
    tmpDbPath: path.resolve(dataDir, 'db.json.tmp')
  };
}

export async function ensureDbFile() {
  const { dataDir, dbPath } = getDbPaths();
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {}

  try {
    await fs.access(dbPath);
  } catch (e) {
    const initial = JSON.stringify({ jobs: [], logs: [] }, null, 2);
    await fs.writeFile(dbPath, initial, 'utf-8');
  }
}

export async function readDb() {
  await ensureDbFile();
  const { dataDir, dbPath } = getDbPaths();
  let attempts = 0;
  while (true) {
    try {
      const data = await fs.readFile(dbPath, 'utf-8');
      return JSON.parse(data);
    } catch (e: any) {
      if (e && e.code === 'ENOENT') {
        return { jobs: [], logs: [] };
      }
      if (e instanceof SyntaxError) {
        try {
          const stats = await fs.stat(dbPath);
          if (stats.isFile()) {
            const timestamp = Date.now();
            const corruptPath = path.resolve(dataDir, `db.corrupt-${timestamp}.json`);
            await fs.rename(dbPath, corruptPath);
            console.error(`[DB CORRUPT ERROR] Arquivo db.json corrompido detectado! Renomeado para db.corrupt-${timestamp}.json. Reiniciando banco limpo.`);
          }
        } catch (statErr) {
          // File does not exist yet or stat failed
        }
        return { jobs: [], logs: [] };
      }

      attempts++;
      if (attempts < 3) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      throw e;
    }
  }
}

function trimJobs(jobs: any[]) {
  if (!Array.isArray(jobs) || jobs.length <= MAX_HISTORY) return jobs || [];

  let excess = jobs.length - MAX_HISTORY;
  const pruned: any[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    const isFinished = j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled';
    if (excess > 0 && isFinished) {
      excess--;
      // Skip oldest finished job
    } else {
      pruned.push(j);
    }
  }

  return pruned;
}

export async function updateDb(updateFn: (db: any) => void | Promise<void>): Promise<any> {
  const next = mutexChain.then(async () => {
    const { dbPath, tmpDbPath } = getDbPaths();
    const db = await readDb();
    const idsBefore: string[] = Array.isArray(db.jobs) ? db.jobs.map((j: any) => j?.id).filter(Boolean) : [];
    await updateFn(db);
    if (Array.isArray(db.jobs)) {
      db.jobs = trimJobs(db.jobs);
    }
    const jsonStr = JSON.stringify(db, null, 2);
    await fs.writeFile(tmpDbPath, jsonStr, 'utf-8');
    await fs.rename(tmpDbPath, dbPath);

    // Jobs removed by deletion, history clearing or trimming must not leave their XML output behind
    const idsAfter = new Set(Array.isArray(db.jobs) ? db.jobs.map((j: any) => j?.id) : []);
    for (const removedId of idsBefore.filter((id) => !idsAfter.has(id))) {
      const outputPath = resolveOutputPath(removedId);
      if (outputPath) {
        await fs.unlink(outputPath).catch(() => {});
      }
    }
    return db;
  }).catch((err) => {
    console.error('[DB UPDATE ERROR]', err);
    throw err;
  });

  mutexChain = next.catch(() => {});
  return next;
}

export async function writeDb(data: any) {
  return updateDb((db) => {
    db.jobs = data.jobs || [];
    db.logs = data.logs || [];
  });
}
