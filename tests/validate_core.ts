import http from 'http';
import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

// 1. Create temporary directory for tests to isolate ULTRA_DATA_DIR
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ultra-nmap-test-'));
process.env.ULTRA_DATA_DIR = tempDir;

async function validate() {
  console.log("=== EXECUTANDO SUÍTE DE TESTES DE ARQUITETURA E VALIDAÇÃO REAL ===");
  let failed = false;

  const assert = (condition: boolean, label: string) => {
    if (condition) {
      console.log(`   - ${label}: PASS`);
    } else {
      console.log(`   - ${label}: FAIL`);
      failed = true;
    }
  };

  try {
    // Dynamic imports after ULTRA_DATA_DIR is set
    const { readDb, updateDb, writeDb } = await import('../src/db/db.js');
    const { runScan, buildNmapArgs, validateTarget, validateCustomPorts } = await import('../src/scanner/scanner.js');
    const { parseNmapXML } = await import('../src/scanner/parser.js');
    const { probeWeb } = await import('../src/scanner/webProbe.js');
    const { getLocalNetworkInfo } = await import('../server.js');
    const { isVulnerableOutput, resolveOutputPath } = await import('../src/scanner/utils.js');

    // 1. Target Validation Tests
    console.log("\n1. Validando alvos:");
    assert(validateTarget('192.168.1.8'), "IPv4 válido (192.168.1.8)");
    assert(validateTarget('192.168.1.0/24'), "CIDR válido (192.168.1.0/24)");
    assert(validateTarget('localhost'), "Hostname válido (localhost)");
    assert(!validateTarget('-iL'), "Opção de comando (-iL) deve ser rejeitada");
    assert(!validateTarget('--privileged'), "Opção de comando (--privileged) deve ser rejeitada");
    assert(!validateTarget('999.999.999.999'), "IPv4 inválido (999.999.999.999) deve ser rejeitado");
    assert(!validateTarget('300.1.1.1/99'), "CIDR inválido (300.1.1.1/99) deve ser rejeitado");
    assert(!validateTarget('127.0.0.1; rm -rf'), "Injeção de comando deve ser rejeitada");

    // 2. Custom Ports Validation Tests
    console.log("\n2. Validando portas customizadas:");
    assert(validateCustomPorts('1-1000'), "Intervalo de portas válido (1-1000)");
    assert(validateCustomPorts('80,443,8080'), "Lista de portas válida (80,443,8080)");
    assert(!validateCustomPorts('80 --script x'), "Injeção no campo de porta ('80 --script x') deve ser rejeitada");
    assert(!validateCustomPorts('0'), "Porta zero ('0') deve ser rejeitada");
    assert(!validateCustomPorts('70000'), "Porta acima de 65535 ('70000') deve ser rejeitada");

    // 3. Vulnerability Output Detection Tests
    console.log("\n3. Validando isVulnerableOutput (Falsos Positivos NSE):");
    assert(!isVulnerableOutput("State: NOT VULNERABLE"), "State: NOT VULNERABLE deve ser false");
    assert(isVulnerableOutput("State: VULNERABLE"), "State: VULNERABLE deve ser true");
    assert(!isVulnerableOutput("Couldn't find any stored XSS"), "Couldn't find any... deve ser false");
    assert(isVulnerableOutput("VULNERABLE:\n  Slowloris"), "Linha iniciando com VULNERABLE: deve ser true");

    // 4. Non-Root Discovery Arguments Test
    console.log("\n4. Validando argumentos Nmap (Modo Root vs Non-Root):");
    delete process.env.FORCE_NON_ROOT;
    process.env.FORCE_NON_ROOT = '1';
    const nonRootDiscoveryArgs = buildNmapArgs('discovery', '192.168.1.0/24');
    assert(nonRootDiscoveryArgs.includes('-PS21,22,23,80,443,445,554,8080'), "Discovery sem root deve incluir -PS...");

    const nonRootStealthArgs = buildNmapArgs('stealth', '192.168.1.8', 'T2');
    assert(nonRootStealthArgs.includes('-sT') && !nonRootStealthArgs.includes('-sS'), "Stealth sem root deve trocar -sS por -sT");
    delete process.env.FORCE_NON_ROOT;

    // 5. XML Parser Validation with NSE & OS
    console.log("\n5. Validando XML Parser (Script NSE & OS):");
    const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
    <nmaprun scanner="nmap" args="nmap -Pn -F -oX - 192.168.1.8">
      <host>
        <status state="up" reason="localhost-response"/>
        <address addr="192.168.1.8" addrtype="ipv4"/>
        <address addr="AC:67:B2:11:22:33" addrtype="mac" vendor="Espressif Inc."/>
        <os>
          <osmatch name="Linux 5.4" accuracy="98"/>
        </os>
        <ports>
          <port protocol="tcp" portid="80">
            <state state="open" reason="syn-ack"/>
            <service name="http" product="ESP32 Web Server" version="1.0"/>
            <script id="http-title" output="ESP32 Home Automation"/>
          </port>
          <port protocol="tcp" portid="22">
            <state state="open" reason="syn-ack"/>
            <service name="ssh" product="OpenSSH" version="8.2p1"/>
            <script id="sshv1" output="VULNERABLE: Server supports SSHv1 protocol"/>
          </port>
        </ports>
      </host>
    </nmaprun>`;

    const hosts = await parseNmapXML(mockXML);
    const parsedHost = hosts[0];
    assert(parsedHost?.address === '192.168.1.8', "Endereço parseado corretamente");
    assert(parsedHost?.osMatches?.[0]?.name === 'Linux 5.4' && parsedHost?.osMatches?.[0]?.accuracy === '98', "OS Match parseado com acurácia");
    assert(parsedHost?.ports?.[0]?.scripts?.length === 1, "Script NSE do serviço parseado com sucesso");

    // 6. Local Network Info
    console.log("\n6. Validando detecção de rede local (getLocalNetworkInfo):");
    const netInfo = getLocalNetworkInfo();
    assert(Boolean(netInfo.ip && netInfo.cidr), "Network Info retornou dados válidos");

    // 7. Security Path Traversal Tests (resolveOutputPath)
    console.log("\n7. Validando segurança e path traversal (resolveOutputPath):");
    assert(resolveOutputPath("../../package") === null, "Path traversal '../../package' deve retornar null");
    assert(resolveOutputPath("a/../b") === null, "Path traversal 'a/../b' deve retornar null");
    assert(resolveOutputPath("..") === null, "Path traversal '..' deve retornar null");
    assert(resolveOutputPath("") === null, "String vazia deve retornar null");
    assert(resolveOutputPath("a b") === null, "Espaço em branco 'a b' deve retornar null");

    const validPath = resolveOutputPath("abc-123");
    const expectedOutputsDir = path.resolve(tempDir, 'outputs');
    assert(Boolean(validPath && validPath.startsWith(expectedOutputsDir) && validPath.endsWith('abc-123.xml')), "ID válido 'abc-123' deve retornar caminho dentro de OUTPUTS_DIR");

    // Prep environment PATH to include mock nmap binary
    const fixturesBinDir = path.resolve('tests/fixtures/bin');
    const originalPath = process.env.PATH;
    process.env.PATH = `${fixturesBinDir}:${process.env.PATH}`;

    // 8. Race Condition Test (6 sequential scans for profile 'os')
    console.log("\n8. Validando teste de corrida (6 scans rápidos com nmap falso no PATH):");
    await writeDb({ jobs: [], logs: [] });

    const raceJobIds: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const id = `race-test-${i}-${Date.now()}`;
      const target = `127.0.0.${i}`;
      raceJobIds.push(id);

      await updateDb((db) => {
        db.jobs.push({
          id,
          target,
          type: 'os',
          speed: 'T4',
          status: 'queued',
          queued_at: new Date().toISOString(),
          start_time: null,
          end_time: null
        });
      });

      runScan(id, target, 'os', 'T4').catch(console.error);
    }

    // Poll DB until all 6 jobs finish
    let raceDone = false;
    const raceStart = Date.now();
    while (Date.now() - raceStart < 10000) {
      const db = await readDb();
      const activeJobs = db.jobs.filter((j: any) => raceJobIds.includes(j.id) && (j.status === 'running' || j.status === 'queued'));
      if (activeJobs.length === 0) {
        raceDone = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    const dbAfterRace = await readDb();
    const raceJobs = dbAfterRace.jobs.filter((j: any) => raceJobIds.includes(j.id));
    const allFailed = raceJobs.length === 6 && raceJobs.every((j: any) => j.status === 'failed');
    const noneRunning = raceJobs.every((j: any) => j.status !== 'running' && j.status !== 'queued');

    assert(raceDone && allFailed && noneRunning, "Todos os 6 scans 'os' terminaram como 'failed' sem travar a fila em 'running'");

    // 9. Timeout Test (SCAN_TIMEOUT_MIN=0.03)
    console.log("\n9. Validando teste de timeout (SCAN_TIMEOUT_MIN=0.03 no alvo 10.9.9.9):");
    process.env.SCAN_TIMEOUT_MIN = '0.03';

    const timeoutJobId = `timeout-test-${Date.now()}`;
    const timeoutTarget = '10.9.9.9';

    await updateDb((db) => {
      db.jobs.push({
        id: timeoutJobId,
        target: timeoutTarget,
        type: 'fast',
        speed: 'T4',
        status: 'queued',
        queued_at: new Date().toISOString(),
        start_time: null,
        end_time: null
      });
    });

    runScan(timeoutJobId, timeoutTarget, 'fast', 'T4').catch(console.error);

    let timeoutDone = false;
    const timeoutStart = Date.now();
    while (Date.now() - timeoutStart < 12000) {
      const db = await readDb();
      const job = db.jobs.find((j: any) => j.id === timeoutJobId);
      if (job && (job.status === 'failed' || job.status === 'completed')) {
        timeoutDone = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    delete process.env.SCAN_TIMEOUT_MIN;
    const dbAfterTimeout = await readDb();
    const timeoutJob = dbAfterTimeout.jobs.find((j: any) => j.id === timeoutJobId);
    const isTimeoutFailed = timeoutJob?.status === 'failed' && timeoutJob?.stderr?.toLowerCase().includes('timeout');

    assert(timeoutDone && Boolean(isTimeoutFailed), "Job com timeout (10.9.9.9) finalizou como 'failed' com mensagem de Timeout em stderr");

    // Reset PATH
    process.env.PATH = originalPath;

    // 10. Probe Web Test (> 64 KB page HTTP & HTTPS)
    console.log("\n10. Validando probeWeb para páginas > 64 KB (HTTP e HTTPS autoassinado):");

    // HTTP Server
    const bigPageHtml = '<html><head><title>Big Page HTTP Title</title></head><body>' + 'A'.repeat(200 * 1024) + '</body></html>';
    const httpServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Server': 'TestServer/1.0' });
      res.end(bigPageHtml);
    });

    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', () => resolve()));
    const httpPort = (httpServer.address() as any).port;

    const httpProbeResult = await probeWeb('127.0.0.1', String(httpPort), 'http');
    assert(httpProbeResult.confirmed === true && httpProbeResult.title === 'Big Page HTTP Title', "HTTP probeWeb em página de 200 KB retornou confirmed:true e título correto");
    httpServer.close();

    // HTTPS Server with self-signed certificate
    let keyPem: string = '';
    let certPem: string = '';

    try {
      execSync('openssl req -x509 -newkey rsa:2048 -keyout /tmp/test-key.pem -out /tmp/test-cert.pem -days 1 -nodes -subj "/CN=localhost" 2>/dev/null');
      keyPem = fs.readFileSync('/tmp/test-key.pem', 'utf-8');
      certPem = fs.readFileSync('/tmp/test-cert.pem', 'utf-8');
    } catch (e) {
      // Fallback self-signed cert string if openssl CLI fails
    }

    if (keyPem && certPem) {
      const bigPageHttpsHtml = '<html><head><title>Big Page HTTPS Title</title></head><body>' + 'B'.repeat(200 * 1024) + '</body></html>';
      const httpsServer = https.createServer({ key: keyPem, cert: certPem }, (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Server': 'TestHTTPSServer/1.0' });
        res.end(bigPageHttpsHtml);
      });

      await new Promise<void>((resolve) => httpsServer.listen(0, '127.0.0.1', () => resolve()));
      const httpsPort = (httpsServer.address() as any).port;

      const httpsProbeResult = await probeWeb('127.0.0.1', String(httpsPort), 'https');
      assert(httpsProbeResult.confirmed === true && httpsProbeResult.title === 'Big Page HTTPS Title', "HTTPS probeWeb autoassinado em página de 200 KB retornou confirmed:true e título correto");
      httpsServer.close();
    } else {
      console.log("   - HTTPS probeWeb skipped (openssl não disponível para gerar cert)");
    }
  } finally {
    // Cleanup isolated temp dir
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }

  if (failed) {
    console.error("\n❌ ERRO: UM OU MAIS TESTES FALHARAM!");
    process.exit(1);
  } else {
    console.log("\n=== ✅ TODA A SUÍTE DE TESTES PASSOU COM SUCESSO ===");
    process.exit(0);
  }
}

validate().catch((err) => {
  console.error("FATAL TEST ERROR:", err);
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
  process.exit(1);
});
