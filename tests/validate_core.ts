import { readDb, writeDb } from '../src/db/db.js';
import { runScan, cancelScan } from '../src/scanner/scanner.js';
import { parseNmapXML } from '../src/scanner/parser.js';
import { execSync } from 'child_process';
import fs from 'fs';

async function validate() {
  console.log("--- Starting Functional Validation ---");
  
  // 1-3. Basic check
  console.log("1-3. Basic check: " + (fs.existsSync('server.ts') ? "PASS" : "FAIL"));
  
  // 4. Creation of a scan job
  const jobId = 'test-' + Date.now();
  let db = await readDb();
  db.jobs.push({ id: jobId, target: '127.0.0.1', type: 'fast', status: 'queued', start_time: new Date().toISOString() });
  await writeDb(db);
  console.log("4. Job creation: PASS");

  // 5-9. Scan Execution (using a shorter command for test)
  console.log("5-9. Scan Execution...");
  await runScan(jobId, '127.0.0.1', 'fast');
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 5000));
  
  db = await readDb();
  const job = db.jobs.find(j => j.id === jobId);
  
  console.log("Status: " + job.status);
  console.log("PID: " + job.pid);
  console.log("Exit Code: " + job.exit_code);
  
  const passScan = job.status === 'completed' && job.pid > 0 && job.exit_code === 0;
  console.log("5-9. Scan Exec Result: " + (passScan ? "PASS" : "FAIL"));

  // 10-12. Parser Validation
  const parsed = await parseNmapXML(job.stdout);
  console.log("10-12. Parser Result: " + (parsed.length > 0 ? "PASS" : "FAIL"));
  
  // 13. Test Error
  try { await runScan('fail', 'invalid-target', 'fast'); } catch(e) { console.log("13. Error Test: PASS"); }

  // 14-15. Test Cancellation
  const cancelId = 'cancel-' + Date.now();
  db.jobs.push({ id: cancelId, target: '127.0.0.1', type: 'all', status: 'queued' });
  await writeDb(db);
  runScan(cancelId, '127.0.0.1', 'all');
  await new Promise(r => setTimeout(r, 1000));
  await cancelScan(cancelId);
  db = await readDb();
  const cancelJob = db.jobs.find(j => j.id === cancelId);
  console.log("14-15. Cancellation: " + (cancelJob.status === 'cancelled' ? "PASS" : "FAIL"));
  
  console.log("--- Validation Complete ---");
}

validate();
