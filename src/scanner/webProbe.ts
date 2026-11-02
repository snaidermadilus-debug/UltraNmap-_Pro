import http from 'http';
import https from 'https';

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
}

export function probeWeb(target: string, port: string, protocol: string): Promise<WebProbeResult> {
  const url = `${protocol}://${target}:${port}`;
  const isHttps = protocol === 'https';
  const client = isHttps ? https : http;

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try { req.destroy(); } catch (e) {}
      resolve({ url, confirmed: false, error: 'Timeout de resposta HTTP (4s)' });
    }, 4000);

    const req = client.request(url, {
      method: 'GET',
      agent: isHttps ? httpsAgent : undefined,
      headers: { 'User-Agent': 'UltraNmapPro/2.0' },
      timeout: 4000
    }, (res) => {
      let bodyText = '';
      let bytesRead = 0;
      const MAX_BYTES = 64 * 1024; // 64 KB

      res.on('data', (chunk: Buffer) => {
        if (bytesRead < MAX_BYTES) {
          const remaining = MAX_BYTES - bytesRead;
          bodyText += chunk.toString('utf-8', 0, Math.min(chunk.length, remaining));
          bytesRead += chunk.length;
          if (bytesRead >= MAX_BYTES) {
            try { req.destroy(); } catch (e) {}
          }
        }
      });

      res.on('end', () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        const titleMatch = bodyText.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Servidor Web (Sem título)';

        resolve({
          url,
          confirmed: true,
          status: res.statusCode,
          title,
          server: (res.headers['server'] as string) || 'Não especificado',
          contentType: (res.headers['content-type'] as string) || 'Não especificado'
        });
      });

      res.on('error', (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        resolve({ url, confirmed: false, error: err.message });
      });
    });

    req.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve({ url, confirmed: false, error: err.message });
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
