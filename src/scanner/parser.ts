import xml2js from 'xml2js';

export class NmapXmlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NmapXmlParseError';
  }
}

export interface ParsedScript {
  id: string;
  output: string;
}

export interface ParsedOSMatch {
  name: string;
  accuracy: string;
}

export interface ParsedPort {
  port: string;
  protocol: string;
  state: string;
  service: string;
  product?: string;
  version?: string;
  extraInfo?: string;
  reason?: string;
  scripts?: ParsedScript[];
}

export interface ParsedHost {
  address: string;
  status: string;
  reason?: string;
  mac?: string;
  vendor?: string;
  hostname?: string;
  ports: ParsedPort[];
  osMatches?: ParsedOSMatch[];
  hostScripts?: ParsedScript[];
}

function parseScripts(scriptData: any): ParsedScript[] {
  if (!scriptData) return [];
  const scripts = Array.isArray(scriptData) ? scriptData : [scriptData];
  return scripts.map((s: any) => ({
    id: String(s.id || 'script'),
    output: String(s.output || '')
  })).filter(s => s.output.trim().length > 0);
}

function parseOSMatches(osData: any): ParsedOSMatch[] {
  if (!osData || !osData.osmatch) return [];
  const matches = Array.isArray(osData.osmatch) ? osData.osmatch : [osData.osmatch];
  return matches.map((m: any) => ({
    name: String(m.name || 'Sistema Operacional Desconhecido'),
    accuracy: String(m.accuracy || '0')
  }));
}

export async function parseNmapXML(xml: string): Promise<ParsedHost[]> {
  if (!xml || typeof xml !== 'string' || !xml.trim()) {
    return [];
  }

  const xmlStartIndex = xml.indexOf('<');
  if (xmlStartIndex === -1) {
    throw new NmapXmlParseError('Conteúdo não contém tags XML válidas.');
  }

  const sanitizedXml = xml.substring(xmlStartIndex);

  let result: any;
  try {
    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    result = await parser.parseStringPromise(sanitizedXml);
  } catch (e: any) {
    console.error('[PARSER TECHNICAL ERROR]', e?.message || e);
    throw new NmapXmlParseError(`Erro de sintaxe XML: ${e?.message || 'XML corrompido'}`);
  }

  if (!result || !result.nmaprun) {
    throw new NmapXmlParseError('Estrutura XML não contém o elemento <nmaprun>.');
  }

  if (!result.nmaprun.host) {
    // Valid nmaprun element with 0 hosts found
    return [];
  }

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

    const osMatches = parseOSMatches(host.os);
    const hostScripts = host.hostscript ? parseScripts(host.hostscript.script) : [];

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
        scripts: p.script ? parseScripts(p.script) : []
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
      osMatches,
      hostScripts
    };
  });
}
