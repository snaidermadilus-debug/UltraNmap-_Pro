import { parseNmapXML } from './src/scanner/parser.js';

const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<nmaprun scanner="nmap" args="nmap -F -oX - 127.0.0.1" start="1730410000" startstr="Fri Oct 31 15:20:00 2026" version="7.94" xmloutputversion="1.05">
<host>
  <status state="up" reason="localhost-response" reason_ttl="0"/>
  <address addr="127.0.0.1" addrtype="ipv4"/>
  <ports>
    <port protocol="tcp" portid="80"><state state="open" reason="syn-ack" reason_ttl="0"/><service name="http" version="Apache" method="table" conf="3"/></port>
    <port protocol="tcp" portid="22"><state state="open" reason="syn-ack" reason_ttl="0"/><service name="ssh" version="OpenSSH" method="table" conf="3"/></port>
    <port protocol="tcp" portid="443"><state state="closed" reason="conn-refused" reason_ttl="0"/><service name="http" method="table" conf="3"/></port>
  </ports>
</host>
</nmaprun>`;

async function test() {
    console.log(JSON.stringify(await parseNmapXML(mockXML), null, 2));
}

test();
