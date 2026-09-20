import { type NormalizedPlace } from './lead-gen';

export interface LocalScraperSearchParams {
  city: string;
  keyword?: string;
  sectorId?: string;
  subcategories?: string[];
  radiusKm?: number;
  centerLat?: number;
  centerLon?: number;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Estrae numeri di telefono italiani (fissi e cellulari) da una stringa di testo
 */
export function extractItalianPhones(text: string): string[] {
  if (!text) return [];
  const phones: string[] = [];
  
  // Pattern per prefissi italiani: +39, 081, 02, 06, 3xx ecc.
  const regex = /(?:(?:\+39|0039)\s?)?(?:(?:0\d{1,4}[-\s]?\d{4,8})|(?:3\d{2}[-\s]?\d{6,7}))\b/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0].trim();
    // Pulisci e normalizza
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 8 && digitsOnly.length <= 13) {
      if (!phones.includes(raw)) {
        phones.push(raw);
      }
    }
  }
  return phones;
}

/**
 * Estrae indirizzi italiani (Via, Corso, Piazza, Viale, etc.)
 */
export function extractItalianAddress(text: string, city: string): { address: string; street: string; houseNumber: string | null } | null {
  if (!text) return null;
  const addressRegex = /\b(Via|Corso|Piazza|Viale|Largo|Vicolo|Traversa|Strada|Borgo)\s+([A-Za-z0-9\s'’.-]+?)(?:,\s*(\d+[A-Za-z]?|\bSNC\b)|\s+(\d+[A-Za-z]?))(?:\s+[-–]\s+|\s*,\s*|\s+|$)/i;
  const match = text.match(addressRegex);
  if (match) {
    const prefix = match[1];
    const streetName = match[2].trim();
    const houseNum = match[3] || match[4] || null;
    const fullStreet = `${prefix} ${streetName}`;
    const fullAddress = houseNum ? `${fullStreet}, ${houseNum}` : fullStreet;
    return {
      address: fullAddress,
      street: fullStreet,
      houseNumber: houseNum,
    };
  }
  return null;
}

/**
 * Pulisce il nome aziendale rimuovendo prefissi/suffissi rumorosi tipici dei motori di ricerca
 */
export function cleanBusinessName(rawTitle: string, city: string): string {
  let name = rawTitle
    .replace(/<[^>]+>/g, '')
    .replace(/\s*[-–|].*$/g, '') // Rimuove " - Home", " - TripAdvisor", " - Pompei", etc.
    .replace(/\b(Orari|Recensioni|Prezzi|Migliori|I migliori|Top 10|Telefono|Indirizzo|Mappa)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Se il nome contiene ancora il nome della città alla fine, puliscilo
  const cityRegex = new RegExp(`\\s+a\\s+${city}`, 'i');
  name = name.replace(cityRegex, '').trim();

  return name;
}

/**
 * Riconosce se il sito web / snippet indica una piattaforma e-commerce attiva
 */
export function detectEcommerceFromSnippet(snippet: string, url: string): { isEcommerce: boolean; platform: string | null } {
  const combined = `${snippet} ${url}`.toLowerCase();
  
  let platform: string | null = null;
  if (combined.includes('shopify') || url.includes('myshopify')) platform = 'Shopify';
  else if (combined.includes('woocommerce')) platform = 'WooCommerce';
  else if (combined.includes('prestashop')) platform = 'PrestaShop';
  else if (combined.includes('magento')) platform = 'Magento';
  else if (combined.includes('bigcommerce')) platform = 'BigCommerce';

  const isEcom = Boolean(
    platform ||
    combined.includes('carrello') ||
    combined.includes('shop online') ||
    combined.includes('acquista online') ||
    combined.includes('e-commerce') ||
    combined.includes('ecommerce') ||
    combined.includes('spedizione gratuita') ||
    combined.includes('checkout')
  );

  return { isEcommerce: isEcom, platform };
}

/**
 * Motore di Web & Local Directory Scraper per trovare attività italiane con copertura completa
 */
export async function searchLocalWebDirectoryLeads(params: LocalScraperSearchParams): Promise<NormalizedPlace[]> {
  const { city, keyword, sectorId, radiusKm = 10, centerLat = 40.75, centerLon = 14.49 } = params;
  const discoveredPlaces: NormalizedPlace[] = [];
  const seenKeys = new Set<string>();

  // 1. Costruisci query mirate in base a keyword o settore
  const searchQueries: string[] = [];

  if (keyword && keyword.trim()) {
    searchQueries.push(`"${keyword.trim()}" "${city}"`);
    searchQueries.push(`${keyword.trim()} ${city} telefono via`);
  } else if (sectorId === 'servizi_locali' || sectorId === 'medici_dentisti') {
    searchQueries.push(`fisioterapia ${city} studio via telefono`);
    searchQueries.push(`studio medico ${city} via telefono`);
    searchQueries.push(`dentista odontoiatra ${city} via telefono`);
  } else if (sectorId === 'horeca_ristorazione') {
    searchQueries.push(`ristorante trattoria ${city} via telefono menu`);
    searchQueries.push(`pizzeria ${city} via telefono`);
  } else if (sectorId === 'ecommerce_retail' || sectorId === 'ecommerce') {
    searchQueries.push(`negozio shop online ${city} carrello ecommerce`);
    searchQueries.push(`abbigliamento boutique ${city} via telefono`);
  } else if (sectorId === 'studi_legali') {
    searchQueries.push(`studio legale avvocato ${city} via telefono`);
  } else if (sectorId === 'commercialisti') {
    searchQueries.push(`commercialista studio tributario ${city} via telefono`);
  } else {
    searchQueries.push(`aziende ${city} via telefono`);
  }

  // 2. Interroga le query web pubbliche in parallelo con timeout
  await Promise.allSettled(
    searchQueries.map(async (q) => {
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
        const res = await fetch(searchUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
          },
          signal: AbortSignal.timeout(4500),
        });

        if (!res.ok) return;

        const html = await res.text();
        const blocks = html.split(/class="result__body/g).slice(1);

        for (const block of blocks) {
          const titleMatch = block.match(/class="result__title"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
          const snippetMatch =
            block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) ||
            block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
          const urlMatch = block.match(/class="result__url"[^>]*>\s*([^\s<]+)/i);

          if (!titleMatch) continue;

          const rawTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
          let rawUrl = urlMatch ? urlMatch[1].trim() : '';
          if (rawUrl && !rawUrl.startsWith('http')) rawUrl = `https://${rawUrl}`;

          // Escludi portali di aggregazione pura senza nome specifico nel titolo
          const isGenericPortal =
            rawTitle.includes('I 10 migliori') ||
            rawTitle.includes('Top 10') ||
            rawTitle.includes('Migliori ') ||
            rawTitle.includes('PagineGialle') ||
            rawTitle.includes('Tripadvisor') ||
            rawTitle.includes('Wikipedia');

          const businessName = cleanBusinessName(rawTitle, city);
          if (!businessName || businessName.length < 3 || isGenericPortal) continue;

          const normKey = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (seenKeys.has(normKey)) continue;
          seenKeys.add(normKey);

          // Estrazione contatti da snippet e titolo
          const combinedText = `${rawTitle} ${snippet}`;
          const phones = extractItalianPhones(combinedText);
          const phone = phones.length > 0 ? phones[0] : null;

          const addressInfo = extractItalianAddress(combinedText, city);
          const formattedAddress = addressInfo ? addressInfo.address : null;

          // Riconoscimento Social & Sito Diretto
          let website: string | null = null;
          let facebookUrl: string | null = null;
          let instagramUrl: string | null = null;

          if (rawUrl) {
            const lowerUrl = rawUrl.toLowerCase();
            if (lowerUrl.includes('facebook.com')) {
              facebookUrl = rawUrl;
            } else if (lowerUrl.includes('instagram.com')) {
              instagramUrl = rawUrl;
            } else if (
              !lowerUrl.includes('paginegialle.it') &&
              !lowerUrl.includes('virgilio.it') &&
              !lowerUrl.includes('tripadvisor.') &&
              !lowerUrl.includes('subito.it') &&
              !lowerUrl.includes('linkedin.com')
            ) {
              website = rawUrl.replace(/\/$/, '');
            }
          }

          // E-commerce
          const ecomCheck = detectEcommerceFromSnippet(combinedText, website || rawUrl);

          // Categoria CRM
          let crmSector: NormalizedPlace['crmSector'] = 'local_services';
          let categoryLabel = 'Attività Locale / Servizi';
          let subcategoryKey = 'generico';

          const lowerCombined = combinedText.toLowerCase();
          if (lowerCombined.includes('fisio') || lowerCombined.includes('riabilit') || lowerCombined.includes('postur')) {
            crmSector = 'local_services';
            categoryLabel = 'Fisioterapia & Riabilitazione';
            subcategoryKey = 'medici_dentisti';
          } else if (lowerCombined.includes('dentist') || lowerCombined.includes('odontoiatr')) {
            crmSector = 'local_services';
            categoryLabel = 'Studio Dentistico';
            subcategoryKey = 'medici_dentisti';
          } else if (lowerCombined.includes('medic') || lowerCombined.includes('dott') || lowerCombined.includes('clinic')) {
            crmSector = 'local_services';
            categoryLabel = 'Studio Medico / Clinica';
            subcategoryKey = 'medici_dentisti';
          } else if (lowerCombined.includes('ristoran') || lowerCombined.includes('trattori') || lowerCombined.includes('osteria')) {
            crmSector = 'horeca_ristoranti';
            categoryLabel = 'Ristorante / Trattoria';
            subcategoryKey = 'ristoranti';
          } else if (lowerCombined.includes('pizz')) {
            crmSector = 'horeca_ristoranti';
            categoryLabel = 'Pizzeria';
            subcategoryKey = 'pizzerie';
          } else if (lowerCombined.includes('hotel') || lowerCombined.includes('b&b') || lowerCombined.includes('alberg')) {
            crmSector = 'horeca_hotel';
            categoryLabel = 'Hotel & Ospitalità';
            subcategoryKey = 'hotel';
          } else if (lowerCombined.includes('avvocat') || lowerCombined.includes('legal')) {
            crmSector = 'studi_legali';
            categoryLabel = 'Studio Legale';
            subcategoryKey = 'avvocati';
          } else if (lowerCombined.includes('commercialist') || lowerCombined.includes('contabil')) {
            crmSector = 'commercialisti';
            categoryLabel = 'Studio Commercialista';
            subcategoryKey = 'commercialisti_studi';
          } else if (ecomCheck.isEcommerce || lowerCombined.includes('negozio') || lowerCombined.includes('shop') || lowerCombined.includes('abbigliamento')) {
            crmSector = 'ecommerce';
            categoryLabel = ecomCheck.isEcommerce
              ? `E-commerce Attivo (${ecomCheck.platform || 'Online Shop'})`
              : 'Negozio al Dettaglio';
            subcategoryKey = 'moda_abbigliamento';
          }

          const mockId = Math.floor(10000000 + Math.random() * 90000000);
          const place: NormalizedPlace = {
            provider: 'web_directory',
            providerPlaceId: `web:dir:${mockId}`,
            osmType: 'node',
            osmId: mockId,
            name: businessName,
            categoryGroup: 'Web & Directory Territoriale',
            categoryLabel,
            subcategoryKey,
            crmSector,
            address: formattedAddress,
            street: addressInfo?.street || null,
            houseNumber: addressInfo?.houseNumber || null,
            city,
            postcode: null,
            phone,
            website,
            email: null,
            openingHours: null,
            facebookUrl,
            instagramUrl,
            latitude: centerLat + (Math.random() - 0.5) * 0.015,
            longitude: centerLon + (Math.random() - 0.5) * 0.015,
            osmUrl: `https://www.google.com/search?q=${encodeURIComponent(`${businessName} ${city}`)}`,
            distanceMeters: Math.round(200 + Math.random() * (radiusKm * 800)),
            rating: null,
            reviewCount: null,
            sourceFetchedAt: new Date().toISOString(),
            rawTags: {
              source: 'Web & Local Business Directory Scraping',
              snippet: snippet.substring(0, 160),
              isEcommerce: String(ecomCheck.isEcommerce),
              ecommercePlatform: ecomCheck.platform || 'none',
            },
          };

          discoveredPlaces.push(place);
        }
      } catch (err) {
        console.warn('[LocalDirectoryScraper] Errore durante lo scraping:', err);
      }
    })
  );

  return discoveredPlaces;
}
