import { URL } from 'url';

/**
 * Valida un URL per impedire attacchi SSRF (Server-Side Request Forgery)
 * verso localhost, reti private, indirizzi di loopback o metadata cloud (169.254.169.254).
 */
export function isSafeUrl(rawUrl: string): { isSafe: boolean; reason?: string; normalizedUrl?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isSafe: false, reason: 'URL non specificato o non valido' };
  }

  let formatted = rawUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `https://${formatted}`;
  }

  try {
    const parsed = new URL(formatted);

    // Accetta solo protocolli HTTP e HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isSafe: false, reason: `Protocollo non consentito: ${parsed.protocol}` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 1. Blocco localhost e domini locali
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '0.0.0.0'
    ) {
      return { isSafe: false, reason: `Dominio o hostname locale non consentito: ${hostname}` };
    }

    // 2. Blocco indirizzi IP privati e di loopback (IPv4)
    // 127.0.0.0/8 (Loopback)
    if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return { isSafe: false, reason: 'Indirizzo loopback non consentito' };
    }

    // 10.0.0.0/8 (Rete privata classe A)
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return { isSafe: false, reason: 'Indirizzo IP privato (10.0.0.0/8) non consentito' };
    }

    // 172.16.0.0/12 (Rete privata classe B: 172.16.0.0 - 172.31.255.255)
    const match172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (match172) {
      const secondOctet = parseInt(match172[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return { isSafe: false, reason: 'Indirizzo IP privato (172.16.0.0/12) non consentito' };
      }
    }

    // 192.168.0.0/16 (Rete privata classe C)
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return { isSafe: false, reason: 'Indirizzo IP privato (192.168.0.0/16) non consentito' };
    }

    // 169.254.0.0/16 (Link-Local & Cloud Metadata AWS/GCP/Azure)
    if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return { isSafe: false, reason: 'Indirizzo Link-Local / Metadata cloud non consentito' };
    }

    // 3. Blocco IPv6 privati e di loopback
    if (
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.startsWith('fc00:') ||
      hostname.startsWith('fe80:')
    ) {
      return { isSafe: false, reason: 'Indirizzo IPv6 locale o privato non consentito' };
    }

    // 4. Controllo porte consentite (80, 443, 8080, 8443)
    if (parsed.port) {
      const portNum = parseInt(parsed.port, 10);
      const allowedPorts = [80, 443, 8080, 8443];
      if (!allowedPorts.includes(portNum)) {
        return { isSafe: false, reason: `Porta ${portNum} non consentita per scansione pubblica` };
      }
    }

    return { isSafe: true, normalizedUrl: parsed.toString() };
  } catch (err: any) {
    return { isSafe: false, reason: `Formato URL non valido: ${err?.message || err}` };
  }
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxSizeBytes?: number;
  headers?: Record<string, string>;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  html: string;
  contentType?: string | null;
  error?: string;
  isHttps: boolean;
}

/**
 * Esegue un fetch sicuro con protezione SSRF, timeout rigido e limite di dimensione buffer.
 */
export async function safeFetchHtml(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const {
    timeoutMs = 8000,
    maxSizeBytes = 2.5 * 1024 * 1024, // 2.5 MB
    headers = {},
  } = options;

  const urlCheck = isSafeUrl(rawUrl);
  if (!urlCheck.isSafe || !urlCheck.normalizedUrl) {
    return {
      ok: false,
      status: 0,
      statusText: 'SSRF_BLOCKED',
      url: rawUrl,
      html: '',
      isHttps: rawUrl.startsWith('https://'),
      error: urlCheck.reason || 'URL bloccato dai controlli di sicurezza SSRF',
    };
  }

  const targetUrl = urlCheck.normalizedUrl;
  const isHttps = targetUrl.startsWith('https://');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; AIConsultingBot/1.0; +https://ai-agency.it)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      ...headers,
    };

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: defaultHeaders,
      signal: controller.signal,
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml') && !contentType.includes('text/plain')) {
      // Se è un PDF o un file binario, non scarichiamo
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: response.url || targetUrl,
        html: '',
        contentType,
        isHttps: (response.url || targetUrl).startsWith('https://'),
        error: `Content-Type non testuale ignorato: ${contentType}`,
      };
    }

    // Lettura con limite di dimensione
    const textBuffer = await response.text();
    let truncatedHtml = textBuffer.length > maxSizeBytes ? textBuffer.substring(0, maxSizeBytes) : textBuffer;
    let finalUrl = response.url || targetUrl;

    // Rilevamento e follow automatico di redirect <meta http-equiv="refresh" content="0; URL=...">
    const metaRefreshMatch = truncatedHtml.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][0-9\s]*;\s*URL=([^"'>\s]+)["']/i);
    if (metaRefreshMatch && metaRefreshMatch[1]) {
      const redirectTarget = metaRefreshMatch[1].trim();
      try {
        const resolvedUrl = new URL(redirectTarget, finalUrl).toString();
        const safeCheck = isSafeUrl(resolvedUrl);
        if (safeCheck.isSafe && safeCheck.normalizedUrl && resolvedUrl !== finalUrl) {
          const followRes = await fetch(safeCheck.normalizedUrl, {
            method: 'GET',
            headers: defaultHeaders,
            signal: controller.signal,
            redirect: 'follow',
          });
          if (followRes.ok) {
            const followBuffer = await followRes.text();
            truncatedHtml = followBuffer.length > maxSizeBytes ? followBuffer.substring(0, maxSizeBytes) : followBuffer;
            finalUrl = followRes.url || safeCheck.normalizedUrl;
          }
        }
      } catch {
        // Se la risoluzione dell'URL fallisce, mantieni la pagina originale
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: finalUrl,
      html: truncatedHtml,
      contentType,
      isHttps: finalUrl.startsWith('https://'),
    };
  } catch (err: any) {
    let errorMsg = err?.message || 'Errore di connessione';
    if (err?.name === 'AbortError') {
      errorMsg = `Timeout superato (${timeoutMs}ms)`;
    }
    return {
      ok: false,
      status: 0,
      statusText: 'FETCH_ERROR',
      url: targetUrl,
      html: '',
      isHttps,
      error: errorMsg,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
