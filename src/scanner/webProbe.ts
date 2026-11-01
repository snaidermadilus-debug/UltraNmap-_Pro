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
      headers: { 'User-Agent': 'UltraNmapPro/2.0' },
    });
    clearTimeout(timeout);

    const text = await response.text().catch(() => '');
    const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/i);
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
