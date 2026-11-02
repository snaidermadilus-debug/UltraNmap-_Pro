import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.resolve('data/db.json');
const TMP_DB_PATH = path.resolve('data/db.json.tmp');
const MAX_HISTORY = 50;

let mutexChain = Promise.resolve();

export async function readDb() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { jobs: [], logs: [] };
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
    const db = await readDb();
    await updateFn(db);
    if (Array.isArray(db.jobs)) {
      db.jobs = trimJobs(db.jobs);
    }
    const jsonStr = JSON.stringify(db, null, 2);
    await fs.writeFile(TMP_DB_PATH, jsonStr, 'utf-8');
    await fs.rename(TMP_DB_PATH, DB_PATH);
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
