import assert from 'assert';
import { parseNmapXML } from './src/scanner/parser.js';

const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<nmaprun scanner="nmap" args="nmap -F -oX - 127.0.0.1" start="1793630000" startstr="Mon Nov 02 15:20:00 2026" version="7.94" xmloutputversion="1.05">
<host>
  <status state="up" reason="localhost-response" reason_ttl="0"/>
  <address addr="127.0.0.1" addrtype="ipv4"/>
  <ports>
    <port protocol="tcp" portid="80"><state state="open" reason="syn-ack" reason_ttl="0"/><service name="http" version="2.4.52" product="Apache httpd" method="table" conf="3"/></port>
    <port protocol="tcp" portid="22"><state state="open" reason="syn-ack" reason_ttl="0"/><service name="ssh" version="8.9p1" product="OpenSSH" method="table" conf="3"/></port>
    <port protocol="tcp" portid="443"><state state="closed" reason="conn-refused" reason_ttl="0"/><service name="https" method="table" conf="3"/></port>
  </ports>
</host>
</nmaprun>`;

export async function runParserTest() {
  console.log("=== EXECUTANDO SUÍTE DE TESTES DO TEST_PARSER.TS ===");
  const results = await parseNmapXML(mockXML);

  assert.strictEqual(results.length, 1, "Deve parsear 1 host");
  assert.strictEqual(results[0].address, "127.0.0.1", "Endereço deve ser 127.0.0.1");
  assert.strictEqual(results[0].ports.length, 3, "Deve conter 3 portas");

  const port80 = results[0].ports.find((p) => p.port === "80");
  assert.ok(port80, "Porta 80 deve existir");
  assert.strictEqual(port80?.state, "open", "Porta 80 deve estar open");
  assert.strictEqual(port80?.service, "http", "Serviço da porta 80 deve ser http");
  assert.strictEqual(port80?.product, "Apache httpd", "Produto da porta 80 deve ser Apache httpd");
  assert.strictEqual(port80?.version, "2.4.52", "Versão da porta 80 deve ser 2.4.52");

  const port22 = results[0].ports.find((p) => p.port === "22");
  assert.ok(port22, "Porta 22 deve existir");
  assert.strictEqual(port22?.state, "open", "Porta 22 deve estar open");
  assert.strictEqual(port22?.service, "ssh", "Serviço da porta 22 deve ser ssh");
  assert.strictEqual(port22?.product, "OpenSSH", "Produto da porta 22 deve ser OpenSSH");
  assert.strictEqual(port22?.version, "8.9p1", "Versão da porta 22 deve ser 8.9p1");

  const port443 = results[0].ports.find((p) => p.port === "443");
  assert.ok(port443, "Porta 443 deve existir");
  assert.strictEqual(port443?.state, "closed", "Porta 443 deve estar closed");

  console.log("   - test_parser.ts: TODOS OS ASSERTS PASSARAM COM SUCESSO");
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('test_parser.ts');
if (isDirectRun) {
  runParserTest().catch((e) => {
    console.error("TEST PARSER FAILED:", e);
    process.exit(1);
  });
}
