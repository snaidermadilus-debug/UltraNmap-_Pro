import xml2js from 'xml2js';

export async function parseNmapXML(xml: string) {
  // Find the start of the XML to avoid parsing errors from preamble/text
  const xmlStartIndex = xml.indexOf('<');
  const sanitizedXml = xmlStartIndex !== -1 ? xml.substring(xmlStartIndex) : xml;

  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(sanitizedXml);
  
  // Extract essential data structure
  const hosts = Array.isArray(result.nmaprun.host) ? result.nmaprun.host : [result.nmaprun.host];
  
  return hosts.map((host: any) => ({
    address: host.address.$.addr,
    ports: host.ports.port ? (Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port]).map((p: any) => ({
      port: p.$.portid,
      state: p.state.$.state,
      service: p.service ? p.service.$.name : 'unknown',
      version: (p.service && p.service.$.version) ? p.service.$.version : 'unknown'
    })) : []
  }));
}
