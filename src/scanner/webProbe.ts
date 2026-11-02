import http from 'http';
import https from 'https';
import tls from 'tls';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

export interface WebProbeResult {
  url: string;
  confirmed: boolean;
  status?: number;
  title?: string;
  server?: string;
  contentType?: string;
  error?: string;
  bodyTruncated?: boolean;
  tlsValid?: boolean;
}

export function probeWeb(target: string, port: string, protocol: string): Promise<WebProbeResult> {
  const url = `${protocol}://${target}:${port}`;
  const isHttps = protocol === 'https';
  const client = isHttps ? https : http;

  return new Promise((resolve) => {
    let resolved = false;

    const safeResolve = (result: WebProbeResult) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { req.destroy(); } catch (e) {}
      resolve(result);
    };

    const timer = setTimeout(() => {
      safeResolve({ url, confirmed: false, error: 'Timeout de resposta HTTP (4s)' });
    }, 4000);

    const req = client.request(url, {
      method: 'GET',
      agent: isHttps ? httpsAgent : undefined,
      headers: { 'User-Agent': 'UltraNmapPro/2.0' },
      timeout: 4000
    }, (res) => {
      let bodyText = '';
      let bytesRead = 0;
      let bodyTruncated = false;
      const MAX_BYTES = 64 * 1024; // 64 KB

      let tlsValid: boolean | undefined = undefined;
      if (isHttps && res.socket) {
        const tlsSocket = res.socket as tls.TLSSocket;
        tlsValid = Boolean(tlsSocket.authorized);
      }

      res.on('data', (chunk: Buffer) => {
        if (resolved) return;
        if (bytesRead < MAX_BYTES) {
          const remaining = MAX_BYTES - bytesRead;
          bodyText += chunk.toString('utf-8', 0, Math.min(chunk.length, remaining));
          bytesRead += chunk.length;

          if (bytesRead >= MAX_BYTES) {
            bodyTruncated = true;
            const titleMatch = bodyText.match(/<title[^>]*>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : 'Servidor Web (Sem título)';

            safeResolve({
              url,
              confirmed: true,
              status: res.statusCode,
              title,
              server: (res.headers['server'] as string) || 'Não especificado',
              contentType: (res.headers['content-type'] as string) || 'Não especificado',
              bodyTruncated: true,
              tlsValid
            });
          }
        }
      });

      res.on('end', () => {
        if (resolved) return;

        const titleMatch = bodyText.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Servidor Web (Sem título)';

        safeResolve({
          url,
          confirmed: true,
          status: res.statusCode,
          title,
          server: (res.headers['server'] as string) || 'Não especificado',
          contentType: (res.headers['content-type'] as string) || 'Não especificado',
          bodyTruncated,
          tlsValid
        });
      });

      res.on('error', (err) => {
        safeResolve({ url, confirmed: false, error: err?.message || 'Erro no socket HTTP' });
      });

      res.on('aborted', () => {
        safeResolve({ url, confirmed: false, error: 'Request aborted' });
      });
    });

    req.on('timeout', () => {
      safeResolve({ url, confirmed: false, error: 'Timeout de resposta HTTP (4s)' });
    });

    req.on('error', (err) => {
      safeResolve({ url, confirmed: false, error: err?.message || 'Erro de conexão' });
    });

    req.end();
  });
}

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
