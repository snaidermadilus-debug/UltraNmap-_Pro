// Configure Node.js TLS to allow self-signed / invalid HTTPS certificates during probe
if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export interface WebProbeResult {
  url: string;
  confirmed: boolean;
  status?: number;
  title?: string;
  server?: string;
  contentType?: string;
  error?: string;
}

export async function probeWeb(target: string, port: string, protocol: string): Promise<WebProbeResult> {
  const url = `${protocol}://${target}:${port}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'UltraNmapPro/2.0' }
    });
    clearTimeout(timeout);

    // Limit reading body to max 64 KB (65536 bytes)
    let bodyText = '';
    if (response.body) {
      const reader = response.body.getReader();
      let bytesRead = 0;
      const maxBytes = 64 * 1024;
      const chunks: Uint8Array[] = [];

      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        bytesRead += value.byteLength;
      }
      reader.cancel().catch(() => {});

      const totalBuffer = new Uint8Array(Math.min(bytesRead, maxBytes));
      let offset = 0;
      for (const chunk of chunks) {
        if (offset + chunk.byteLength > maxBytes) {
          totalBuffer.set(chunk.subarray(0, maxBytes - offset), offset);
          break;
        } else {
          totalBuffer.set(chunk, offset);
          offset += chunk.byteLength;
        }
      }
      bodyText = new TextDecoder('utf-8', { fatal: false }).decode(totalBuffer);
    }

    const titleMatch = bodyText.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Servidor Web (Sem título)';

    return {
      url,
      confirmed: true,
      status: response.status,
      title,
      server: response.headers.get('server') || 'Não especificado',
      contentType: response.headers.get('content-type') || 'Não especificado',
    };
  } catch (e: any) {
    return {
      url,
      confirmed: false,
      error: e.message || 'Sem resposta HTTP',
    };
  }
}

// Concurrency pool helper: max 4 parallel web probes
export async function probeWebBatch(tasks: { target: string; port: string; protocol: string }[]): Promise<WebProbeResult[]> {
  const results: WebProbeResult[] = [];
  const chunkSize = 4;

  for (let i = 0; i < tasks.length; i += chunkSize) {
    const chunk = tasks.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map((t) => probeWeb(t.target, t.port, t.protocol))
    );
    for (const r of chunkResults) {
      if (r.confirmed) {
        results.push(r);
      }
    }
  }

  return results;
}
