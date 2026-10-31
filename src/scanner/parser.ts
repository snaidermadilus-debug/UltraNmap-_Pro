import xml2js from 'xml2js';

export async function parseNmapXML(xml: string) {
  const xmlStartIndex = xml.indexOf('<');
  const sanitizedXml = xmlStartIndex !== -1 ? xml.substring(xmlStartIndex) : xml;

  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(sanitizedXml);
  
  if (!result.nmaprun.host) return [];
  
  const hosts = Array.isArray(result.nmaprun.host) ? result.nmaprun.host : [result.nmaprun.host];
  
  return hosts.map((host: any) => ({
    address: host.address ? host.address.$.addr : 'unknown',
    status: host.status ? host.status.$.state : 'unknown',
    ports: host.ports && host.ports.port ? (Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port]).map((p: any) => ({
      port: p.$.portid,
      state: p.state.$.state,
      service: p.service ? p.service.$.name : 'unknown',
      version: (p.service && p.service.$.version) ? p.service.$.version : 'unknown'
    })) : []
  }));
}
