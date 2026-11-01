import xml2js from 'xml2js';

export interface ParsedPort {
  port: string;
  protocol: string;
  state: string;
  service: string;
  product?: string;
  version?: string;
  extraInfo?: string;
  reason?: string;
}

export interface ParsedHost {
  address: string;
  status: string;
  reason?: string;
  mac?: string;
  vendor?: string;
  hostname?: string;
  ports: ParsedPort[];
}

export async function parseNmapXML(xml: string): Promise<ParsedHost[]> {
  if (!xml || typeof xml !== 'string') return [];

  const xmlStartIndex = xml.indexOf('<');
  if (xmlStartIndex === -1) return [];

  const sanitizedXml = xml.substring(xmlStartIndex);

  try {
    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    const result = await parser.parseStringPromise(sanitizedXml);

    if (!result || !result.nmaprun || !result.nmaprun.host) return [];

    const rawHosts = Array.isArray(result.nmaprun.host)
      ? result.nmaprun.host
      : [result.nmaprun.host];

    return rawHosts.map((host: any) => {
      let address = 'desconhecido';
      let mac = '';
      let vendor = '';

      if (host.address) {
        const addresses = Array.isArray(host.address) ? host.address : [host.address];
        for (const addr of addresses) {
          if (addr.addrtype === 'ipv4' || addr.addrtype === 'ipv6') {
            address = addr.addr || address;
          } else if (addr.addrtype === 'mac') {
            mac = addr.addr || '';
            vendor = addr.vendor || '';
          }
        }
      }

      let hostname = '';
      if (host.hostnames && host.hostnames.hostname) {
        const hn = Array.isArray(host.hostnames.hostname)
          ? host.hostnames.hostname[0]
          : host.hostnames.hostname;
        hostname = hn.name || '';
      }

      const status = host.status ? (host.status.state || 'unknown') : 'unknown';
      const reason = host.status ? (host.status.reason || '') : '';

      let ports: ParsedPort[] = [];
      if (host.ports && host.ports.port) {
        const rawPorts = Array.isArray(host.ports.port)
          ? host.ports.port
          : [host.ports.port];

        ports = rawPorts.map((p: any) => ({
          port: String(p.portid || ''),
          protocol: String(p.protocol || 'tcp'),
          state: p.state ? String(p.state.state || 'unknown') : 'unknown',
          reason: p.state ? String(p.state.reason || '') : '',
          service: p.service ? String(p.service.name || 'desconhecido') : 'desconhecido',
          product: p.service ? p.service.product : undefined,
          version: p.service ? p.service.version : undefined,
          extraInfo: p.service ? p.service.extrainfo : undefined,
        }));
      }

      return {
        address,
        status,
        reason,
        mac,
        vendor,
        hostname,
        ports,
      };
    });
  } catch (e) {
    console.error('[PARSER ERROR]', e);
    return [];
  }
}
