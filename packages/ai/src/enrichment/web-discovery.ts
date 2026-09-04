import { safeFetchHtml, isSafeUrl } from './security';

export interface DiscoveredCandidate {
  url: string;
  label: string;
  confidence: number;
  source: string;
}

export interface DiscoveredOnlinePresence {
  suggestedWebsites: DiscoveredCandidate[];
  suggestedSocials: { platform: string; url: string; label: string }[];
  suggestedReviews: { platform: string; url: string; label: string }[];
}

function cleanString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Genera candidati di dominio per attività italiane (es. todiscopompei.it, todiscopizzeria.altervista.org)
 */
function generateDomainCandidates(companyName: string, city?: string | null, sector?: string | null): string[] {
  const cleanName = cleanString(companyName);
  const cleanCity = city ? cleanString(city) : '';
  const candidates: string[] = [];

  if (!cleanName || cleanName.length < 3) return candidates;

  // Pattern standard
  if (cleanCity) {
    candidates.push(`https://www.${cleanName}${cleanCity}.it`);
    candidates.push(`https://www.${cleanName}-${cleanCity}.it`);
  }
  candidates.push(`https://www.${cleanName}.it`);
  candidates.push(`https://www.${cleanName}.com`);

  // Pattern HORECA
  if (sector?.includes('horeca') || sector?.includes('ristoran') || sector?.includes('pizz')) {
    candidates.push(`https://www.ristorante${cleanName}.it`);
    candidates.push(`https://www.pizzeria${cleanName}.it`);
    candidates.push(`http://${cleanName}pizzeria.altervista.org`);
    candidates.push(`https://${cleanName}pizzeria.altervista.org`);
    candidates.push(`http://${cleanName}.altervista.org`);
    candidates.push(`https://${cleanName}.webflow.io`);
  }

  // Pattern Studi Legali / Commercialisti
  if (sector?.includes('legale') || sector?.includes('commercialist')) {
    candidates.push(`https://www.studio${cleanName}.it`);
    candidates.push(`https://www.studiolegale${cleanName}.it`);
  }

  return candidates;
}

/**
 * Discovery Engine per trovare sito, social e recensioni di un'azienda da dati aperti e web query.
 */
export async function discoverCompanyOnlinePresence(params: {
  companyName: string;
  city?: string | null;
  sector?: string | null;
  address?: string | null;
}): Promise<DiscoveredOnlinePresence> {
  const { companyName, city, sector } = params;
  const result: DiscoveredOnlinePresence = {
    suggestedWebsites: [],
    suggestedSocials: [],
    suggestedReviews: [],
  };

  const seenUrls = new Set<string>();

  // 1. Probing rapido dei pattern di dominio ad alta probabilità in parallelo
  const domainCandidates = generateDomainCandidates(companyName, city, sector);
  await Promise.allSettled(
    domainCandidates.slice(0, 12).map(async (candidateUrl) => {
      try {
        const probe = await safeFetchHtml(candidateUrl, { timeoutMs: 3000 });
        if (probe.ok && probe.html && probe.html.length > 300) {
          const htmlLower = probe.html.toLowerCase();
          const containsName = htmlLower.includes(cleanString(companyName).substring(0, 4));
          const containsCity = city ? htmlLower.includes(city.toLowerCase()) : true;

          if ((containsName || containsCity) && !seenUrls.has(probe.url)) {
            seenUrls.add(probe.url);
            result.suggestedWebsites.push({
              url: probe.url,
              label: `Sito Web Ufficiale Rilevato (${new URL(probe.url).hostname})`,
              confidence: containsName && containsCity ? 0.95 : 0.85,
              source: 'Sonda Dominio Diretta',
            });
          }
        }
      } catch {
        // Ignora probe fallito
      }
    })
  );

  // 2. Ricerca Web Aperta (DuckDuckGo HTML query gratuita)
  try {
    const query = `${companyName} ${city || ''} ${sector ? sector.replace(/_/g, ' ') : ''} sito recensioni`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
    });

    if (searchRes.ok) {
      const html = await searchRes.text();
      const urlMatches = [...html.matchAll(/class="result__url"[^>]*>\s*([^\s<]+)/gi)].map((m) => m[1].trim());

      for (const rawUrl of urlMatches) {
        let fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
        fullUrl = fullUrl.replace(/\/$/, '');

        if (seenUrls.has(fullUrl)) continue;
        seenUrls.add(fullUrl);

        const lowerUrl = fullUrl.toLowerCase();

        // Riconoscimento TripAdvisor
        if (lowerUrl.includes('tripadvisor.it') || lowerUrl.includes('tripadvisor.com')) {
          result.suggestedReviews.push({
            platform: 'tripadvisor',
            url: fullUrl,
            label: 'Scheda TripAdvisor Pubblica',
          });
          continue;
        }

        // Riconoscimento TheFork
        if (lowerUrl.includes('thefork.it') || lowerUrl.includes('thefork.com')) {
          result.suggestedReviews.push({
            platform: 'thefork',
            url: fullUrl,
            label: 'Scheda TheFork & Recensioni',
          });
          continue;
        }

        // Riconoscimento Social
        if (lowerUrl.includes('facebook.com') && !lowerUrl.includes('/sharer') && !lowerUrl.includes('/login')) {
          result.suggestedSocials.push({
            platform: 'facebook',
            url: fullUrl,
            label: 'Pagina Facebook Ufficiale',
          });
          continue;
        }

        if (lowerUrl.includes('instagram.com') && !lowerUrl.includes('/p/')) {
          result.suggestedSocials.push({
            platform: 'instagram',
            url: fullUrl,
            label: 'Profilo Instagram Ufficiale',
          });
          continue;
        }

        // Esclusione directory generiche di massa
        const isGenericDirectory =
          lowerUrl.includes('paginegialle.it') ||
          lowerUrl.includes('virgilio.it') ||
          lowerUrl.includes('misterimprese.it') ||
          lowerUrl.includes('infobel.it') ||
          lowerUrl.includes('cylex-italia.it') ||
          lowerUrl.includes('sluurpy.it') ||
          lowerUrl.includes('restaurantguru.it') ||
          lowerUrl.includes('wikipedia.org') ||
          lowerUrl.includes('facebook.com') ||
          lowerUrl.includes('instagram.com') ||
          lowerUrl.includes('tripadvisor.');

        if (!isGenericDirectory && isSafeUrl(fullUrl).isSafe) {
          result.suggestedWebsites.push({
            url: fullUrl,
            label: `Sito Web Trovato (${new URL(fullUrl).hostname})`,
            confidence: 0.8,
            source: 'Motore di Ricerca Web',
          });
        }
      }
    }
  } catch (err) {
    console.warn('[WebDiscovery] Errore durante la ricerca web aperta:', err);
  }

  // 3. Fallback se TripAdvisor non è stato trovato tramite web query
  if (result.suggestedReviews.length === 0 && (sector?.includes('horeca') || sector?.includes('ristoran') || sector?.includes('hotel'))) {
    result.suggestedReviews.push({
      platform: 'tripadvisor',
      url: `https://www.tripadvisor.it/Search?q=${encodeURIComponent(`${companyName} ${city || ''}`)}`,
      label: 'Cerca Scheda TripAdvisor',
    });
  }

  // Aggiunta link scheda Google Maps
  result.suggestedReviews.push({
    platform: 'google_maps',
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${companyName} ${city || ''}`)}`,
    label: 'Cerca Scheda Google Maps & Recensioni',
  });

  return result;
}
