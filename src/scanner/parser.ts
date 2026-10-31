import xml2js from 'xml2js';

export async function parseNmapXML(xml: string) {
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xml);
  
  // Extract essential data structure
  const hosts = Array.isArray(result.nmaprun.host) ? result.nmaprun.host : [result.nmaprun.host];
  
  return hosts.map((host: any) => ({
    address: host.address.$.addr,
    ports: host.ports.port ? (Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port]).map((p: any) => ({
      port: p.$.portid,
      state: p.state.$.state,
      service: p.service ? p.service.$.name : 'unknown',
      version: p.service ? p.service.$.version : 'unknown'
    })) : []
  }));
}
