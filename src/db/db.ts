import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.resolve('data/db.json');
const MAX_HISTORY = 50;
let writeQueue = Promise.resolve();

export async function readDb() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { jobs: [], logs: [] };
  }
}

export async function writeDb(data: any) {
  writeQueue = writeQueue.then(async () => {
    if (data.jobs.length > MAX_HISTORY) {
        data.jobs = data.jobs.slice(-MAX_HISTORY);
    }
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  });
  return writeQueue;
}
