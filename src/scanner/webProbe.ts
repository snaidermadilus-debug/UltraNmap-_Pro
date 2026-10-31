export async function probeWeb(target: string, port: string, protocol: string) {
  const url = `${protocol}://${target}:${port}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
    
    const text = await response.text();
    const titleMatch = text.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'Não identificado';
    
    return {
      url,
      confirmed: true,
      status: response.status,
      title,
      server: response.headers.get('server') || 'Não identificado',
      contentType: response.headers.get('content-type') || 'Não identificado'
    };
  } catch (e: any) {
    return {
      url,
      confirmed: false,
      error: e.message
    };
  }
}
