import { readDb, writeDb } from '../src/db/db.js';
import { runScan, cancelScan, buildNmapArgs, validateTarget } from '../src/scanner/scanner.js';
import { parseNmapXML } from '../src/scanner/parser.js';
import { probeWeb } from '../src/scanner/webProbe.js';
import { getLocalNetworkInfo } from '../server.js';

async function validate() {
  console.log("=== EXECUTANDO TESTES DE ARQUITETURA E VALIDAÇÃO REAL ===");

  // 1. Target Validation Tests
  console.log("1. Validando alvos:");
  console.log("   - IPv4 (192.168.1.8):", validateTarget('192.168.1.8') ? "PASS" : "FAIL");
  console.log("   - CIDR (192.168.1.0/24):", validateTarget('192.168.1.0/24') ? "PASS" : "FAIL");
  console.log("   - Hostname (localhost):", validateTarget('localhost') ? "PASS" : "FAIL");
  console.log("   - Injeção de comando ('127.0.0.1; rm -rf'):", !validateTarget('127.0.0.1; rm -rf') ? "PASS" : "FAIL");

  // 2. buildNmapArgs Verification
  console.log("\n2. Validando argumentos gerados por buildNmapArgs:");
  const fastArgs = buildNmapArgs('fast', '192.168.1.8');
  console.log("   - Fast scan args:", fastArgs.join(' '));
  const hasPnFast = fastArgs.includes('-Pn') && fastArgs.includes('-F');
  console.log("   - Fast contém -Pn e -F:", hasPnFast ? "PASS" : "FAIL");

  const discoveryArgs = buildNmapArgs('discovery', '192.168.1.0/24');
  console.log("   - Discovery args:", discoveryArgs.join(' '));
  const hasSnDiscovery = discoveryArgs.includes('-sn') && !discoveryArgs.includes('-Pn');
  console.log("   - Discovery contém -sn sem -Pn:", hasSnDiscovery ? "PASS" : "FAIL");

  const commonArgs = buildNmapArgs('common', '192.168.1.8');
  console.log("   - Common ports contains --top-ports 100:", commonArgs.includes('--top-ports') && commonArgs.includes('100') && commonArgs.includes('-Pn') ? "PASS" : "FAIL");

  const webArgs = buildNmapArgs('web', '192.168.1.8');
  console.log("   - Web profile contains -Pn and web ports:", webArgs.includes('-Pn') && webArgs.includes('80,443,8080,8443,8000,8888,3000,5000') ? "PASS" : "FAIL");

  // 3. XML Parser Validation
  console.log("\n3. Validando XML Parser:");
  const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
  <nmaprun scanner="nmap" args="nmap -Pn -F -oX - 192.168.1.8">
    <host>
      <status state="up" reason="localhost-response"/>
      <address addr="192.168.1.8" addrtype="ipv4"/>
      <address addr="AC:67:B2:11:22:33" addrtype="mac" vendor="Espressif Inc."/>
      <ports>
        <port protocol="tcp" portid="80">
          <state state="open" reason="syn-ack"/>
          <service name="http" product="ESP32 Web Server" version="1.0"/>
        </port>
        <port protocol="tcp" portid="22">
          <state state="open" reason="syn-ack"/>
          <service name="ssh" product="OpenSSH" version="8.2p1"/>
        </port>
        <port protocol="tcp" portid="443">
          <state state="closed" reason="conn-refused"/>
          <service name="https"/>
        </port>
      </ports>
    </host>
  </nmaprun>`;

  const hosts = await parseNmapXML(mockXML);
  const parsedHost = hosts[0];
  console.log("   - Host parsed address:", parsedHost?.address === '192.168.1.8' ? "PASS" : "FAIL");
  console.log("   - Host MAC vendor:", parsedHost?.vendor === 'Espressif Inc.' ? "PASS" : "FAIL");
  console.log("   - Open ports count (2):", parsedHost?.ports.filter((p: any) => p.state === 'open').length === 2 ? "PASS" : "FAIL");

  // 4. Local Network Info
  console.log("\n4. Validando detecção de rede local (getLocalNetworkInfo):");
  const netInfo = getLocalNetworkInfo();
  console.log("   - Detected Local IP:", netInfo.ip);
  console.log("   - Detected CIDR:", netInfo.cidr);
  console.log("   - Network Info detection:", netInfo.ip && netInfo.cidr ? "PASS" : "FAIL");

  console.log("\n=== VALIDAÇÃO DE TESTES CONCLUÍDA COM SUCESSO ===");
}

validate();
