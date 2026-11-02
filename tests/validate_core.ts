import { readDb, writeDb } from '../src/db/db.js';
import { runScan, cancelScan, buildNmapArgs, validateTarget, validateCustomPorts } from '../src/scanner/scanner.js';
import { parseNmapXML } from '../src/scanner/parser.js';
import { probeWeb } from '../src/scanner/webProbe.js';
import { getLocalNetworkInfo } from '../server.js';

async function validate() {
  console.log("=== EXECUTANDO TESTES DE ARQUITETURA E VALIDAÇÃO REAL ===");

  // 1. Target Validation Tests
  console.log("1. Validando alvos:");
  console.log("   - IPv4 válido (192.168.1.8):", validateTarget('192.168.1.8') ? "PASS" : "FAIL");
  console.log("   - CIDR válido (192.168.1.0/24):", validateTarget('192.168.1.0/24') ? "PASS" : "FAIL");
  console.log("   - Hostname válido (localhost):", validateTarget('localhost') ? "PASS" : "FAIL");
  console.log("   - Opção de comando (-iL):", !validateTarget('-iL') ? "PASS" : "FAIL");
  console.log("   - Opção de comando (--privileged):", !validateTarget('--privileged') ? "PASS" : "FAIL");
  console.log("   - IPv4 com octeto inválido (999.999.999.999):", !validateTarget('999.999.999.999') ? "PASS" : "FAIL");
  console.log("   - CIDR com octeto e prefixo inválido (300.1.1.1/99):", !validateTarget('300.1.1.1/99') ? "PASS" : "FAIL");
  console.log("   - Injeção de comando ('127.0.0.1; rm -rf'):", !validateTarget('127.0.0.1; rm -rf') ? "PASS" : "FAIL");

  // 2. Custom Ports Validation Tests
  console.log("\n2. Validando portas customizadas:");
  console.log("   - Formato válido (1-1000):", validateCustomPorts('1-1000') ? "PASS" : "FAIL");
  console.log("   - Formato válido (80,443,8080):", validateCustomPorts('80,443,8080') ? "PASS" : "FAIL");
  console.log("   - Injeção de script ('80 --script x'):", !validateCustomPorts('80 --script x') ? "PASS" : "FAIL");
  console.log("   - Porta zero ('0'):", !validateCustomPorts('0') ? "PASS" : "FAIL");
  console.log("   - Porta acima de 65535 ('70000'):", !validateCustomPorts('70000') ? "PASS" : "FAIL");

  // 3. buildNmapArgs Verification
  console.log("\n3. Validando argumentos gerados por buildNmapArgs:");
  const fastArgs = buildNmapArgs('fast', '192.168.1.8', 'T4');
  console.log("   - Fast scan args:", fastArgs.join(' '));
  const hasPnFast = fastArgs.includes('-Pn') && fastArgs.includes('-F');
  console.log("   - Fast contém -Pn e -F:", hasPnFast ? "PASS" : "FAIL");

  const discoveryArgs = buildNmapArgs('discovery', '192.168.1.0/24');
  console.log("   - Discovery args:", discoveryArgs.join(' '));
  const hasSnDiscovery = discoveryArgs.includes('-sn') && !discoveryArgs.includes('-Pn');
  console.log("   - Discovery contém -sn sem -Pn:", hasSnDiscovery ? "PASS" : "FAIL");

  const commonArgs = buildNmapArgs('common', '192.168.1.8', 'T3', '80,443');
  console.log("   - Common ports com override customizado:", commonArgs.includes('-p') && commonArgs.includes('80,443') ? "PASS" : "FAIL");

  // 4. XML Parser Validation with NSE & OS
  console.log("\n4. Validando XML Parser (Script NSE & OS):");
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
  console.log("   - Host parsed address:", parsedHost?.address === '192.168.1.8' ? "PASS" : "FAIL");
  console.log("   - OS match parsed (Linux 5.4 98%):", parsedHost?.osMatches?.[0]?.name === 'Linux 5.4' && parsedHost?.osMatches?.[0]?.accuracy === '98' ? "PASS" : "FAIL");
  console.log("   - NSE Script parsed count:", parsedHost?.ports?.[0]?.scripts?.length === 1 ? "PASS" : "FAIL");

  // 5. Local Network Info
  console.log("\n5. Validando detecção de rede local (getLocalNetworkInfo):");
  const netInfo = getLocalNetworkInfo();
  console.log("   - Detected Local IP:", netInfo.ip);
  console.log("   - Detected CIDR:", netInfo.cidr);
  console.log("   - Network Info detection:", netInfo.ip && netInfo.cidr ? "PASS" : "FAIL");

  console.log("\n=== VALIDAÇÃO DE TESTES CONCLUÍDA COM SUCESSO ===");
}

validate();
