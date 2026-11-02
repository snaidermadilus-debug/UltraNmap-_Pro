import { readDb, writeDb } from '../src/db/db.js';
import { runScan, cancelScan, buildNmapArgs, validateTarget, validateCustomPorts } from '../src/scanner/scanner.js';
import { parseNmapXML } from '../src/scanner/parser.js';
import { probeWeb } from '../src/scanner/webProbe.js';
import { getLocalNetworkInfo } from '../server.js';
import { isVulnerableOutput } from '../src/scanner/utils.js';

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
  process.env.FORCE_NON_ROOT = '1';
  const nonRootDiscoveryArgs = buildNmapArgs('discovery', '192.168.1.0/24');
  assert(nonRootDiscoveryArgs.includes('-PS21,22,23,80,443,445,554,8080'), "Discovery sem root deve incluir -PS...");

  const nonRootStealthArgs = buildNmapArgs('stealth', '192.168.1.8', 'T2');
  assert(nonRootStealthArgs.includes('-sT') && !nonRootStealthArgs.includes('-sS'), "Stealth sem root deve trocar -sS por -sT");

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

  if (failed) {
    console.error("\n❌ ERRO: UM OU MAIS TESTES FALHARAM!");
    process.exit(1);
  } else {
    console.log("\n=== ✅ TODA A SUÍTE DE TESTES PASSOU COM SUCESSO ===");
    process.exit(0);
  }
}

validate();
