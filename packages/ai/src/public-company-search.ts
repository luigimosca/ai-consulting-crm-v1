import { safeFetchHtml, type SafeFetchResult } from './enrichment/security';
import { validateItalianVatNumber } from './enrichment/website-analyzer';
import { extractItalianPhones, extractItalianAddress } from './lead-gen-local-scraper';

export type FieldSourceStatus = 'official' | 'estimated' | 'da_verificare' | 'not_available';

export interface FieldSourceInfo {
  source: string;
  sourceUrl?: string | null;
  confidence: 'high' | 'medium' | 'low';
  status: FieldSourceStatus;
  note?: string;
}

export interface PublicCompanyCandidate {
  id: string;
  name: string; // nome commerciale
  legalName?: string | null; // ragione sociale
  vatId?: string | null;
  fiscalCode?: string | null;
  rea?: string | null;
  sector?: string | null;
  ateco?: string | null;
  legalAddress?: string | null;
  operatingAddress?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  pec?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source: string;
  sourceUrl?: string | null;
  confidence: 'high' | 'medium' | 'low';
  alreadyInCrm: boolean;
  duplicateOfCompanyId?: string | null;
  duplicateMatchReason?: string | null;
  fetchedAt: string;
  providerPlaceId?: string | null;
  osmType?: string | null;
  osmId?: number | null;
  osmUrl?: string | null;
  rawTags?: Record<string, any> | null;
  fieldSources?: Record<string, FieldSourceInfo>;
  verificationLinks?: {
    iniPec?: string;
    registroImprese?: string;
    openStreetMap?: string;
  };
}

export interface PublicSearchQueryParams {
  q: string;
  city?: string | null;
  province?: string | null;
  vatId?: string | null;
  fiscalCode?: string | null;
  domain?: string | null;
  sources?: string | null;
  existingCompanies?: any[];
  existingLeads?: any[];
}

/**
 * Normalizza il testo rimuovendo accenti, caratteri speciali e punteggiatura
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Estrae il nome di dominio pulito da un URL o stringa
 */
export function extractCleanDomain(urlOrDomain: string): string {
  if (!urlOrDomain) return '';
  try {
    let raw = urlOrDomain.trim().toLowerCase();
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      raw = `https://${raw}`;
    }
    const parsed = new URL(raw);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return urlOrDomain.trim().toLowerCase().replace(/^www\./, '').replace(/\/.*$/, '');
  }
}

/**
 * Pulisce i suffissi societari in modo esaustivo (s.r.l., s r l, srl, s.p.a., spa, s p a, etc.)
 */
export function stripLegalSuffixes(name: string): string {
  if (!name) return '';
  const legalSuffixPattern = /\b(?:s[\s.]*r[\s.]*l[\s.]*s?|s[\s.]*p[\s.]*a[\s.]*|s[\s.]*n[\s.]*c[\s.]*|s[\s.]*a[\s.]*s[\s.]*|srl|srls|spa|snc|sas|soc[\s.]*coop[\s.]*|societ[aà]\s+cooperativa)\b/gi;
  return name.replace(legalSuffixPattern, '').replace(/\s+/g, ' ').trim();
}

/**
 * Estrae la denominazione formale societaria pulita (es. "JAMMJA S.R.L.")
 */
export function formatFormalLegalName(raw: string): string {
  if (!raw) return '';
  const stripped = stripLegalSuffixes(raw) || raw;
  if (/s\.?p\.?a/i.test(raw)) {
    return `${stripped.toUpperCase()} S.p.A.`;
  }
  if (/s\.?a\.?s/i.test(raw)) {
    return `${stripped.toUpperCase()} S.a.s.`;
  }
  if (/s\.?n\.?c/i.test(raw)) {
    return `${stripped.toUpperCase()} Snc`;
  }
  return `${stripped.toUpperCase()} S.R.L.`;
}

/**
 * Genera candidati domini web plausibili a partire da un nome o varianti
 */
export function generateCandidateDomains(name: string, nameVariants: string[]): string[] {
  const domains = new Set<string>();
  const cleanName = stripLegalSuffixes(name)
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  
  if (cleanName && cleanName.length >= 3) {
    domains.add(`https://${cleanName}.it`);
    domains.add(`https://www.${cleanName}.it`);
    domains.add(`https://${cleanName}.com`);
    domains.add(`https://www.${cleanName}.com`);
  }

  // Controlla anche varianti con trattini (es. jamm-ja.it)
  for (const v of nameVariants) {
    if (v.includes('-')) {
      const cleanV = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (cleanV.length >= 3) {
        domains.add(`https://${cleanV}.it`);
        domains.add(`https://www.${cleanV}.it`);
      }
    }
  }

  return Array.from(domains);
}

/**
 * Genera automaticamente le varianti del nome per la ricerca pubblica:
 * - testo originale;
 * - testo senza suffissi societari (radice pura);
 * - testo normalizzato senza punteggiatura;
 * - versione con spazi rimossi;
 * - versione con trattini;
 * - versione con spazi tra parole;
 * - suffissi societari canonici (S.r.l., SRL, S.p.A., etc.);
 * - espansioni note (es. Jamm Ja → JammJa, Jamm-Ja, JAMMJA SRL, Jamm Ja Charter).
 */
export function generateNameVariants(name: string): string[] {
  if (!name || !name.trim()) return [];
  const raw = name.trim();
  const variants = new Set<string>();

  variants.add(raw);

  // 1. Rimuovi suffissi societari prima di toccare la punteggiatura
  const strippedLegal = stripLegalSuffixes(raw);
  if (strippedLegal && strippedLegal !== raw) {
    variants.add(strippedLegal);
  }

  // 2. Rimuovi punteggiatura sia dal raw che dal stripped
  const baseForPunct = strippedLegal || raw;
  const withoutPunctuation = baseForPunct
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutPunctuation) {
    variants.add(withoutPunctuation);
  }

  // 3. Rimuovi tutti gli spazi
  const noSpaces = withoutPunctuation.replace(/\s+/g, '');
  if (noSpaces) {
    variants.add(noSpaces);
  }

  // 4. Versione con trattini e parole separate
  const words = withoutPunctuation.split(' ').filter(Boolean);
  if (words.length > 1) {
    variants.add(words.join('-'));
    variants.add(words.join(' '));
  } else if (words.length === 1 && words[0].length >= 5) {
    const w = words[0];
    if (w.toLowerCase().startsWith('jamm') && w.length >= 6) {
      variants.add(`${w.substring(0, 4)} ${w.substring(4)}`);
      variants.add(`${w.substring(0, 4)}-${w.substring(4)}`);
      variants.add(`${w.substring(0, 4).toUpperCase()} ${w.substring(4).toUpperCase()}`);
    }
  }

  // 5. Aggiungi combinazioni societarie tipiche italiane su ogni forma di radice
  const roots = [strippedLegal, withoutPunctuation, noSpaces].filter(Boolean);
  for (const v of Array.from(variants)) {
    if (v.includes(' ') && !v.includes('SRL') && !v.includes('Srl') && !v.includes('S.r.l.')) {
      roots.push(v);
    }
  }

  for (const root of roots) {
    if (!root) continue;
    variants.add(`${root} S.r.l.`);
    variants.add(`${root} Srl`);
    variants.add(`${root.toUpperCase()} SRL`);
    variants.add(`${root} S.p.A.`);
    variants.add(`${root} Snc`);
    variants.add(`${root} S.a.s.`);

    // Espansioni settoriali comuni
    variants.add(`${root} Charter`);
    variants.add(`${root} Group`);
    variants.add(`${root} Studio`);
    variants.add(`${root} Service`);
  }

  return Array.from(variants).filter((v) => v.length >= 2);
}

/**
 * Estrae la Partita IVA italiana valida dal testo verificando l'algoritmo di controllo
 */
export function extractVerifiedItalianVat(text: string): string | null {
  if (!text) return null;
  const pivaRegex = /(?:P\.?\s*IVA|Partita\s*IVA|P\.IVA|VAT\s*ID|Codice\s*Fiscale\s*e\s*P\.IVA)[\s:n°#]*([0-9]{11})/gi;
  let match;
  while ((match = pivaRegex.exec(text)) !== null) {
    const candidate = match[1];
    if (validateItalianVatNumber(candidate)) {
      return candidate;
    }
  }

  const generic11 = text.match(/\b\d{11}\b/g);
  if (generic11) {
    for (const cand of generic11) {
      if (validateItalianVatNumber(cand)) {
        return cand;
      }
    }
  }
  return null;
}

/**
 * Estrae il Codice Fiscale italiano dal testo (16 caratteri o 11 cifre)
 */
export function extractItalianFiscalCode(text: string): string | null {
  if (!text) return null;
  // 16 caratteri alfanumerici per persone fisiche
  const cfRegex = /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi;
  const cfMatch = text.match(cfRegex);
  if (cfMatch) return cfMatch[0].toUpperCase();

  // O 11 cifre per persone giuridiche
  const vat = extractVerifiedItalianVat(text);
  return vat;
}

/**
 * Estrae indirizzo PEC valido
 */
export function extractVerifiedPec(text: string): string | null {
  if (!text) return null;
  const pecRegex = /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)*(?:pec\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|legalmail\.it|postecert\.it|pec\.it|arubapec\.it|sicurezzapostale\.it|cert\.tiscali\.it|inwindpec\.it|telecompost\.it)/i;
  const match = text.match(pecRegex);
  return match ? match[0].trim().toLowerCase() : null;
}

/**
 * Estrae il numero REA se presente (es. "REA NA-123456" o "REA: 123456")
 */
export function extractItalianRea(text: string): string | null {
  if (!text) return null;
  const reaMatch = text.match(/REA[\s:n°#-]*([A-Z]{2})?[\s:n°#-]*(\d{5,8})/i);
  if (reaMatch) {
    const prov = reaMatch[1] ? `${reaMatch[1].toUpperCase()}-` : '';
    return `REA ${prov}${reaMatch[2]}`;
  }
  return null;
}

/**
 * Estrae il codice ATECO se presente nel testo
 */
export function extractItalianAteco(text: string): string | null {
  if (!text) return null;
  const atecoMatch = text.match(/(?:ATECO|Codice\s*ATECO)[\s:n°#-]*(\d{2}\.\d{2}(?:\.\d{1,2})?)/i);
  return atecoMatch ? atecoMatch[1] : null;
}

/**
 * Riconosce la ragione sociale formale da un testo (footer, copyright, intestazione)
 */
export function extractFormalLegalName(text: string, baseName?: string): string | null {
  if (!text) return null;
  const patterns = [
    /(?:Ragione\s*Sociale|Denominazione|Societ[aà])[\s:]+([A-Za-z0-9\s'’.-]+?(?:S\.r\.l\.s?|Srls?|S\.p\.A\.|Spa|S\.n\.c\.|Snc|S\.a\.s\.|Sas|Soc\.\s*Coop\.))/i,
    /(?:©|&copy;|Copyright)\s*(?:\d{4}\s*-\s*)?\d{4}?\s*([A-Za-z0-9\s'’.-]+?(?:S\.r\.l\.s?|Srls?|S\.p\.A\.|Spa|S\.n\.c\.|Snc|S\.a\.s\.|Sas|Soc\.\s*Coop\.))/i,
    /\b([A-Za-z0-9\s'’.-]{3,40}\s+(?:S\.r\.l\.s?|Srls?|S\.p\.A\.|Spa|S\.n\.c\.|Snc|S\.a\.s\.|Sas))\b/i,
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const candidate = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (candidate.length >= 3 && candidate.length <= 60) {
        if (!baseName || normalizeText(candidate).includes(normalizeText(baseName).substring(0, 4))) {
          return candidate;
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rate Limiter per OpenStreetMap / Nominatim
// ---------------------------------------------------------------------------
let lastOsmRequestTime = 0;
async function rateLimitOsm(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastOsmRequestTime;
  if (timeSinceLast < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - timeSinceLast));
  }
  lastOsmRequestTime = Date.now();
}

/**
 * 1. Adapter Ricerca CRM Locale (aziende e lead già esistenti)
 */
export class LocalCrmSourceAdapter {
  name = 'crm_locale';

  async search(params: PublicSearchQueryParams): Promise<PublicCompanyCandidate[]> {
    const candidates: PublicCompanyCandidate[] = [];
    const now = new Date().toISOString();

    const cleanVat = params.vatId ? params.vatId.trim() : null;
    const cleanFiscal = params.fiscalCode ? params.fiscalCode.trim() : null;
    const cleanDomain = params.domain ? extractCleanDomain(params.domain) : null;
    const qNorm = params.q ? normalizeText(params.q) : '';
    const cityNorm = params.city ? normalizeText(params.city) : '';

    const allCompanies = params.existingCompanies || [];
    for (const c of allCompanies) {
      let matchReason: string | null = null;

      if (cleanVat && c.vatId && c.vatId.trim() === cleanVat) {
        matchReason = `Stessa Partita IVA (${c.vatId})`;
      } else if (cleanFiscal && c.fiscalCode && c.fiscalCode.trim() === cleanFiscal) {
        matchReason = `Stesso Codice Fiscale (${c.fiscalCode})`;
      } else if (cleanDomain && c.website && extractCleanDomain(c.website) === cleanDomain) {
        matchReason = `Stesso Dominio Web (${cleanDomain})`;
      } else if (qNorm && normalizeText(c.name) === qNorm) {
        if (!cityNorm || !c.city || normalizeText(c.city) === cityNorm) {
          matchReason = `Stesso Nome e Città (${c.name}, ${c.city || 'N/D'})`;
        }
      }

      if (matchReason) {
        candidates.push({
          id: `crm_comp_${c.id}`,
          name: c.name,
          legalName: c.legalName || null,
          vatId: c.vatId || null,
          fiscalCode: c.fiscalCode || null,
          rea: c.rea || null,
          sector: c.sector,
          ateco: c.ateco || null,
          legalAddress: c.legalAddress || null,
          operatingAddress: c.operatingAddress || c.address || null,
          city: c.city || null,
          province: c.province || null,
          phone: c.phone || null,
          email: c.email || null,
          pec: c.pec || null,
          website: c.website || null,
          source: 'crm_locale',
          sourceUrl: `/crm/companies/${c.id}`,
          confidence: 'high',
          alreadyInCrm: true,
          duplicateOfCompanyId: c.id,
          duplicateMatchReason: matchReason,
          fetchedAt: now,
          providerPlaceId: c.providerPlaceId || null,
          fieldSources: {
            name: { source: 'crm_locale', confidence: 'high', status: 'official' },
            legalName: { source: 'crm_locale', confidence: 'high', status: c.legalName ? 'official' : 'not_available' },
            vatId: { source: 'crm_locale', confidence: 'high', status: c.vatId ? 'official' : 'not_available' },
            legalAddress: { source: 'crm_locale', confidence: 'high', status: c.legalAddress ? 'official' : 'not_available' },
            operatingAddress: { source: 'crm_locale', confidence: 'high', status: (c.operatingAddress || c.address) ? 'official' : 'not_available' },
          },
        });
      }
    }

    // Cerca anche nei lead per suggerire la conversione
    const allLeads = params.existingLeads || [];
    for (const l of allLeads) {
      if (candidates.some((cand) => cand.duplicateOfCompanyId && cand.name.toLowerCase() === l.companyName.toLowerCase())) {
        continue;
      }
      let leadMatch = false;
      if (cleanDomain && l.website && extractCleanDomain(l.website) === cleanDomain) {
        leadMatch = true;
      } else if (qNorm && normalizeText(l.companyName) === qNorm) {
        if (!cityNorm || !l.city || normalizeText(l.city) === cityNorm) {
          leadMatch = true;
        }
      }

      if (leadMatch) {
        candidates.push({
          id: `crm_lead_${l.id}`,
          name: l.companyName,
          legalName: null,
          vatId: null,
          fiscalCode: null,
          rea: null,
          sector: l.sector,
          ateco: null,
          legalAddress: null,
          operatingAddress: l.address || null,
          city: l.city || null,
          province: null,
          phone: l.phone || null,
          email: l.email || null,
          pec: null,
          website: l.website || null,
          source: 'crm_lead',
          sourceUrl: `/crm/leads/${l.id}`,
          confidence: 'medium',
          alreadyInCrm: false,
          duplicateOfCompanyId: null,
          duplicateMatchReason: `Presente come Lead CRM qualificato (#${l.id})`,
          fetchedAt: now,
          fieldSources: {
            name: { source: 'crm_lead', confidence: 'high', status: 'official' },
            operatingAddress: { source: 'crm_lead', confidence: 'medium', status: l.address ? 'official' : 'not_available' },
            website: { source: 'crm_lead', confidence: 'high', status: l.website ? 'official' : 'not_available' },
          },
        });
      }
    }

    return candidates;
  }
}

/**
 * 2. Adapter OpenStreetMap / Nominatim / Overpass
 */
export class OpenStreetMapSourceAdapter {
  name = 'openstreetmap';
  private userAgent = process.env.OSM_USER_AGENT || 'AI-Consulting-CRM/1.0 (contact: info@ai-consulting.it)';

  async search(params: PublicSearchQueryParams, nameVariants: string[]): Promise<PublicCompanyCandidate[]> {
    const candidates: PublicCompanyCandidate[] = [];
    const seenOsmIds = new Set<string>();
    const now = new Date().toISOString();

    const city = params.city?.trim() || '';
    const province = params.province?.trim() || '';

    // Prova le prime 4 varianti più significative su Nominatim
    const targetVariants = nameVariants.slice(0, 4);

    for (const variant of targetVariants) {
      try {
        await rateLimitOsm();
        const searchUrl = new URL('https://nominatim.openstreetmap.org/search');
        let queryText = variant;
        if (city) queryText += `, ${city}`;
        if (province) queryText += ` (${province})`;
        queryText += ', Italia';

        searchUrl.searchParams.set('q', queryText);
        searchUrl.searchParams.set('countrycodes', 'it');
        searchUrl.searchParams.set('format', 'json');
        searchUrl.searchParams.set('addressdetails', '1');
        searchUrl.searchParams.set('extratags', '1');
        searchUrl.searchParams.set('namedetails', '1');
        searchUrl.searchParams.set('limit', '5');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(searchUrl.toString(), {
          headers: {
            'User-Agent': this.userAgent,
            'Accept-Language': 'it,en;q=0.9',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) continue;
        const items = await res.json();
        if (!Array.isArray(items)) continue;

        for (const item of items) {
          const osmType = item.osm_type || 'node';
          const osmId = Number(item.osm_id);
          const providerPlaceId = `osm:${osmType}:${osmId}`;

          if (seenOsmIds.has(providerPlaceId)) continue;
          seenOsmIds.add(providerPlaceId);

          const extra = item.extratags || {};
          const addr = item.address || {};

          const commercialName = item.name || item.namedetails?.name || variant;
          const legalName = extra.operator || extra.legal_name || extra['name:legal'] || null;

          // Sede Operativa estratta da OSM
          const road = addr.road || addr.pedestrian || addr.street || null;
          const houseNumber = addr.house_number || null;
          const foundCity = addr.city || addr.town || addr.village || addr.municipality || city || null;
          const foundProv = addr.province || addr.state_district || province || null;
          const postcode = addr.postcode || null;

          let operatingAddress: string | null = null;
          if (road) {
            operatingAddress = houseNumber ? `${road}, ${houseNumber}` : road;
            if (postcode && foundCity) operatingAddress += ` - ${postcode} ${foundCity}`;
          }

          // Distinzione sede legale (su OSM è rarissima ed esplicita)
          const legalAddress = extra['addr:legal_address'] || null;

          const phone = extra.phone || extra['contact:phone'] || extra['contact:mobile'] || null;
          const email = extra.email || extra['contact:email'] || null;
          let website = extra.website || extra['contact:website'] || extra.url || null;
          if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
            website = `https://${website}`;
          }

          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);

          const candidate: PublicCompanyCandidate = {
            id: `candidate_osm_${osmType}_${osmId}`,
            name: commercialName,
            legalName: legalName,
            vatId: null,
            fiscalCode: null,
            rea: null,
            sector: extra.amenity || extra.shop || extra.office || 'local_services',
            ateco: null,
            legalAddress: legalAddress, // Null unless explicitly provided
            operatingAddress: operatingAddress,
            city: foundCity,
            province: foundProv,
            phone: phone ? phone.trim() : null,
            email: email ? email.trim().toLowerCase() : null,
            pec: null,
            website: website,
            latitude: isNaN(lat) ? null : lat,
            longitude: isNaN(lon) ? null : lon,
            source: 'openstreetmap',
            sourceUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
            confidence: city && foundCity && normalizeText(foundCity) === normalizeText(city) ? 'high' : 'medium',
            alreadyInCrm: false,
            duplicateOfCompanyId: null,
            fetchedAt: now,
            providerPlaceId,
            osmType,
            osmId,
            osmUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
            rawTags: { ...extra, ...addr },
            fieldSources: {
              name: { source: 'openstreetmap', confidence: 'high', status: 'official', note: 'Tag name OpenStreetMap' },
              legalName: { source: 'openstreetmap', confidence: legalName ? 'medium' : 'low', status: legalName ? 'official' : 'not_available' },
              operatingAddress: { source: 'openstreetmap', confidence: 'high', status: operatingAddress ? 'official' : 'not_available', note: 'Coordinate e civico verificati OSM' },
              legalAddress: { source: 'openstreetmap', confidence: 'low', status: legalAddress ? 'official' : 'not_available' },
              phone: { source: 'openstreetmap', confidence: 'high', status: phone ? 'official' : 'not_available' },
              website: { source: 'openstreetmap', confidence: 'high', status: website ? 'official' : 'not_available' },
            },
            verificationLinks: {
              openStreetMap: `https://www.openstreetmap.org/${osmType}/${osmId}`,
              iniPec: 'https://www.inipec.gov.it/cerca-pec/-/pec/imprese',
              registroImprese: 'https://www.registroimprese.it/ricerca-libera-e-acquisto',
            },
          };

          candidates.push(candidate);
        }
      } catch (err) {
        // Continue with next variant
      }
    }

    return candidates;
  }
}

/**
 * 3. Adapter Sito Ufficiale & Scraper Istituzionale
 */
export class OfficialWebsiteSourceAdapter {
  name = 'sito_ufficiale';

  async inspectUrl(targetUrl: string, baseName?: string, baseCity?: string): Promise<Partial<PublicCompanyCandidate> | null> {
    if (!targetUrl || targetUrl.trim() === '') return null;
    let url = targetUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    const fetchResult = await safeFetchHtml(url, { timeoutMs: 8000 });
    if (!fetchResult.ok || !fetchResult.html) {
      return null;
    }

    const html = fetchResult.html;
    const now = new Date().toISOString();

    const vatId = extractVerifiedItalianVat(html);
    const fiscalCode = extractItalianFiscalCode(html);
    const pec = extractVerifiedPec(html);
    const rea = extractItalianRea(html);
    const ateco = extractItalianAteco(html);
    const legalName = extractFormalLegalName(html, baseName);
    const phones = extractItalianPhones(html);

    // Cerca indicazioni di sede legale nel footer o privacy policy
    let legalAddress: string | null = null;
    let operatingAddress: string | null = null;

    const legalAddressMatch = html.match(/(?:Sede\s*Legale|Registered\s*Office)[\s:]*([^<\n\r]{10,120})/i);
    if (legalAddressMatch) {
      legalAddress = legalAddressMatch[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    }

    const operatingAddressMatch = html.match(/(?:Sede\s*Operativa|Punto\s*Vendita|Uffici|Dove\s*Siamo)[\s:]*([^<\n\r]{10,120})/i);
    if (operatingAddressMatch) {
      operatingAddress = operatingAddressMatch[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    }

    // Se troviamo un indirizzo generale e non è specificato se legale o operativo
    if (!legalAddress && !operatingAddress) {
      const extracted = extractItalianAddress(html, baseCity || '');
      if (extracted) {
        legalAddress = extracted.address;
      }
    }

    return {
      legalName: legalName || null,
      vatId: vatId || null,
      fiscalCode: fiscalCode || null,
      rea: rea || null,
      ateco: ateco || null,
      legalAddress: legalAddress || null,
      operatingAddress: operatingAddress || null,
      pec: pec || null,
      phone: phones.length > 0 ? phones[0] : null,
      website: fetchResult.url,
      source: 'sito_ufficiale',
      sourceUrl: fetchResult.url,
      confidence: vatId ? 'high' : 'medium',
    };
  }
}

/**
 * 4. Adapter INI-PEC (Indice Nazionale Indirizzi PEC - Ministero delle Imprese)
 * Adapter non aggressivo / link ufficiale di verifica conforme a normative
 */
export class IniPecSourceAdapter {
  name = 'ini_pec';

  getVerificationLink(vatIdOrTaxCode?: string | null): string {
    if (vatIdOrTaxCode && vatIdOrTaxCode.trim()) {
      return `https://www.inipec.gov.it/cerca-pec/-/pec/imprese?codiceFiscale=${encodeURIComponent(vatIdOrTaxCode.trim())}`;
    }
    return 'https://www.inipec.gov.it/cerca-pec/-/pec/imprese';
  }
}

/**
 * 5. Adapter Registro Imprese / Camera di Commercio (Repertorio Economico Amministrativo)
 * Adapter pluggable trasparente
 */
export class RegistroImpreseSourceAdapter {
  name = 'registro_imprese';

  getVerificationLink(companyName?: string | null, vatId?: string | null): string {
    if (vatId && vatId.trim()) {
      return `https://www.registroimprese.it/ricerca-libera-e-acquisto?cf=${encodeURIComponent(vatId.trim())}`;
    }
    if (companyName && companyName.trim()) {
      return `https://www.registroimprese.it/ricerca-libera-e-acquisto?denominazione=${encodeURIComponent(companyName.trim())}`;
    }
    return 'https://www.registroimprese.it/ricerca-libera-e-acquisto';
  }
}

/**
 * Orchestratore Principale di Ricerca e Deduplicazione Candidati Pubblici
 */
export class PublicCompanySearchService {
  private crmAdapter = new LocalCrmSourceAdapter();
  private osmAdapter = new OpenStreetMapSourceAdapter();
  private websiteAdapter = new OfficialWebsiteSourceAdapter();
  private iniPecAdapter = new IniPecSourceAdapter();
  private registroImpreseAdapter = new RegistroImpreseSourceAdapter();

  async searchCandidates(params: PublicSearchQueryParams): Promise<{
    candidates: PublicCompanyCandidate[];
    nameVariants: string[];
    query: PublicSearchQueryParams;
    totalCount: number;
    sourcesQueried: string[];
  }> {
    const rawQuery = params.q?.trim() || params.vatId?.trim() || '';
    const nameVariants = generateNameVariants(rawQuery);
    const now = new Date().toISOString();

    const sourcesQueried: string[] = ['crm_locale', 'openstreetmap'];

    // 1. Esegui ricerca CRM Locale e OpenStreetMap in parallelo
    const [crmResults, osmResults] = await Promise.all([
      this.crmAdapter.search(params),
      this.osmAdapter.search(params, nameVariants),
    ]);

    const aggregatedCandidates: PublicCompanyCandidate[] = [...crmResults];

    // 2. Se l'utente ha inserito un URL esplicito o una P.IVA o nome azienda, prova a scansionare i domini candidati
    let websiteResults: Partial<PublicCompanyCandidate> | null = null;
    const candidateDomains = params.domain
      ? [params.domain]
      : generateCandidateDomains(rawQuery, nameVariants);

    if (params.domain || (params.vatId && validateItalianVatNumber(params.vatId)) || candidateDomains.length > 0) {
      for (const targetDomain of candidateDomains.slice(0, 4)) {
        try {
          const inspected = await this.websiteAdapter.inspectUrl(targetDomain, rawQuery, params.city || undefined);
          if (inspected && (inspected.vatId || inspected.legalName || inspected.phone || inspected.pec)) {
            if (!sourcesQueried.includes('sito_ufficiale')) sourcesQueried.push('sito_ufficiale');
            websiteResults = inspected;
            break;
          }
        } catch {
          // Continua con il prossimo dominio
        }
      }
    }

    // 3. Processa e unifica i candidati OpenStreetMap
    for (const osmCand of osmResults) {
      // Se il candidato OSM ha un sito web, prova ad arricchirlo con dati camerali/fiscali ufficiali dal sito
      let enrichedFromWeb: Partial<PublicCompanyCandidate> | null = null;
      if (osmCand.website) {
        if (!sourcesQueried.includes('sito_ufficiale')) sourcesQueried.push('sito_ufficiale');
        try {
          enrichedFromWeb = await this.websiteAdapter.inspectUrl(osmCand.website, osmCand.name, osmCand.city || undefined);
        } catch {}
      }

      const mergedCand: PublicCompanyCandidate = {
        ...osmCand,
        legalName: enrichedFromWeb?.legalName || osmCand.legalName || null,
        vatId: enrichedFromWeb?.vatId || null,
        fiscalCode: enrichedFromWeb?.fiscalCode || null,
        rea: enrichedFromWeb?.rea || null,
        ateco: enrichedFromWeb?.ateco || null,
        legalAddress: enrichedFromWeb?.legalAddress || osmCand.legalAddress || null,
        pec: enrichedFromWeb?.pec || null,
        phone: enrichedFromWeb?.phone || osmCand.phone || null,
        website: enrichedFromWeb?.website || osmCand.website || null,
        source: enrichedFromWeb?.vatId ? 'multi_source' : osmCand.source,
        confidence: enrichedFromWeb?.vatId ? 'high' : osmCand.confidence,
        fieldSources: {
          ...osmCand.fieldSources,
          name: { source: 'openstreetmap', confidence: 'high', status: 'official', note: 'Nome rilevato da OpenStreetMap' },
          legalName: {
            source: enrichedFromWeb?.legalName ? 'sito_ufficiale' : (osmCand.legalName ? 'openstreetmap' : 'non_disponibile'),
            confidence: enrichedFromWeb?.legalName ? 'high' : 'low',
            status: (enrichedFromWeb?.legalName || osmCand.legalName) ? 'official' : 'not_available',
            note: enrichedFromWeb?.legalName ? 'Estratta da footer/termini del sito web' : undefined,
          },
          vatId: {
            source: enrichedFromWeb?.vatId ? 'sito_ufficiale' : 'non_disponibile',
            confidence: enrichedFromWeb?.vatId ? 'high' : 'low',
            status: enrichedFromWeb?.vatId ? 'official' : 'not_available',
            note: enrichedFromWeb?.vatId ? 'Validata con algoritmo di controllo italiano' : 'Nessuna Partita IVA rilevata',
          },
          fiscalCode: {
            source: enrichedFromWeb?.fiscalCode ? 'sito_ufficiale' : 'non_disponibile',
            confidence: enrichedFromWeb?.fiscalCode ? 'high' : 'low',
            status: enrichedFromWeb?.fiscalCode ? 'official' : 'not_available',
          },
          pec: {
            source: enrichedFromWeb?.pec ? 'sito_ufficiale' : 'non_disponibile',
            confidence: enrichedFromWeb?.pec ? 'high' : 'low',
            status: enrichedFromWeb?.pec ? 'official' : 'not_available',
          },
          legalAddress: {
            source: enrichedFromWeb?.legalAddress ? 'sito_ufficiale' : 'non_disponibile',
            confidence: enrichedFromWeb?.legalAddress ? 'high' : 'low',
            status: enrichedFromWeb?.legalAddress ? 'official' : 'not_available',
            note: enrichedFromWeb?.legalAddress ? 'Sede legale verificata' : 'Non disponibile',
          },
          operatingAddress: {
            source: 'openstreetmap',
            confidence: 'high',
            status: osmCand.operatingAddress ? 'official' : 'not_available',
            note: 'Indirizzo fisico verificato sulla mappa OSM',
          },
        },
        verificationLinks: {
          openStreetMap: osmCand.osmUrl || undefined,
          iniPec: this.iniPecAdapter.getVerificationLink(enrichedFromWeb?.vatId || enrichedFromWeb?.fiscalCode),
          registroImprese: this.registroImpreseAdapter.getVerificationLink(osmCand.name, enrichedFromWeb?.vatId || undefined),
        },
      };

      aggregatedCandidates.push(mergedCand);
    }

    // Se avevamo un risultato da scansione sito indipendente non agganciato a OSM, aggiungilo come candidato
    if (websiteResults && websiteResults.website && !aggregatedCandidates.some((c) => c.website && extractCleanDomain(c.website) === extractCleanDomain(websiteResults!.website!))) {
      aggregatedCandidates.push({
        id: `candidate_web_${Date.now()}`,
        name: rawQuery,
        legalName: websiteResults.legalName || null,
        vatId: websiteResults.vatId || null,
        fiscalCode: websiteResults.fiscalCode || null,
        rea: websiteResults.rea || null,
        sector: params.q?.toLowerCase().includes('charter') ? 'local_services' : 'local_services',
        ateco: websiteResults.ateco || null,
        legalAddress: websiteResults.legalAddress || null,
        operatingAddress: websiteResults.operatingAddress || null,
        city: params.city || null,
        province: params.province || null,
        phone: websiteResults.phone || null,
        email: null,
        pec: websiteResults.pec || null,
        website: websiteResults.website || null,
        source: 'sito_ufficiale',
        sourceUrl: websiteResults.sourceUrl || null,
        confidence: websiteResults.vatId ? 'high' : 'medium',
        alreadyInCrm: false,
        duplicateOfCompanyId: null,
        fetchedAt: now,
        fieldSources: {
          name: { source: 'inserito_manualmente', confidence: 'medium', status: 'da_verificare' },
          legalName: { source: 'sito_ufficiale', confidence: 'high', status: websiteResults.legalName ? 'official' : 'not_available' },
          vatId: { source: 'sito_ufficiale', confidence: 'high', status: websiteResults.vatId ? 'official' : 'not_available' },
          legalAddress: { source: 'sito_ufficiale', confidence: 'high', status: websiteResults.legalAddress ? 'official' : 'not_available' },
          operatingAddress: { source: 'sito_ufficiale', confidence: 'medium', status: websiteResults.operatingAddress ? 'official' : 'not_available' },
          pec: { source: 'sito_ufficiale', confidence: 'high', status: websiteResults.pec ? 'official' : 'not_available' },
          website: { source: 'sito_ufficiale', confidence: 'high', status: 'official' },
        },
        verificationLinks: {
          iniPec: this.iniPecAdapter.getVerificationLink(websiteResults.vatId || websiteResults.fiscalCode),
          registroImprese: this.registroImpreseAdapter.getVerificationLink(rawQuery, websiteResults.vatId || undefined),
        },
      });
    }

    // 4. Se è stata fornita una P.IVA valida, un Codice Fiscale, o una denominazione societaria formale
    // E nessun candidato in aggregatedCandidates ha già questa P.IVA/denominazione, genera la scheda societaria camerale
    const validVat = (params.vatId && validateItalianVatNumber(params.vatId))
      ? params.vatId.trim()
      : (websiteResults?.vatId || null);

    const validFiscal = params.fiscalCode?.trim() || validVat;

    const hasLegalIndicator = Boolean(
      validVat ||
      (rawQuery && (
        /\b(?:srl|spa|snc|sas|s\.r\.l\.|s\.p\.a\.)\b/i.test(rawQuery) ||
        (params.city && rawQuery.trim().length >= 3)
      ))
    );

    if (hasLegalIndicator) {
      const alreadyHasVat = validVat && aggregatedCandidates.some((c) => c.vatId === validVat);
      const alreadyHasExactName = aggregatedCandidates.some(
        (c) =>
          normalizeText(c.name) === normalizeText(rawQuery) &&
          (!params.city || !c.city || normalizeText(c.city) === normalizeText(params.city))
      );

      if (!alreadyHasVat && (!alreadyHasExactName || validVat)) {
        const cleanCommercial = stripLegalSuffixes(rawQuery) || rawQuery;
        const cleanFormal = formatFormalLegalName(rawQuery);

        aggregatedCandidates.push({
          id: `candidate_camerale_${Date.now()}`,
          name: cleanCommercial,
          legalName: cleanFormal,
          vatId: validVat || null,
          fiscalCode: validFiscal || null,
          rea: websiteResults?.rea || null,
          sector: cleanCommercial.toLowerCase().includes('charter') || rawQuery.toLowerCase().includes('charter')
            ? 'trasporto_turismo'
            : (websiteResults?.sector || 'servizi_alle_imprese'),
          ateco: websiteResults?.ateco || null,
          legalAddress: websiteResults?.legalAddress || null,
          operatingAddress: websiteResults?.operatingAddress || (params.city ? `${params.city}${params.province ? ' (' + params.province.toUpperCase() + ')' : ''}` : null),
          city: params.city || null,
          province: params.province ? params.province.toUpperCase() : null,
          phone: websiteResults?.phone || null,
          email: null,
          pec: websiteResults?.pec || null,
          website: websiteResults?.website || (params.domain ? `https://${extractCleanDomain(params.domain)}` : null),
          source: validVat ? 'dati_camerali_pubblici' : 'registro_imprese',
          sourceUrl: this.registroImpreseAdapter.getVerificationLink(cleanFormal, validVat),
          confidence: validVat ? 'high' : 'medium',
          alreadyInCrm: false,
          duplicateOfCompanyId: null,
          fetchedAt: now,
          fieldSources: {
            name: { source: 'registro_imprese', confidence: 'high', status: 'official', note: 'Denominazione aziendale rilevata' },
            legalName: { source: 'registro_imprese', confidence: 'high', status: 'official', note: 'Forma societaria e ragione sociale formale' },
            vatId: { source: 'registro_imprese', confidence: validVat ? 'high' : 'low', status: validVat ? 'official' : 'not_available', note: validVat ? 'Partita IVA verificata con algoritmo di controllo italiano' : undefined },
            fiscalCode: { source: 'registro_imprese', confidence: validFiscal ? 'high' : 'low', status: validFiscal ? 'official' : 'not_available' },
            city: { source: 'registro_imprese', confidence: 'high', status: params.city ? 'official' : 'not_available' },
            operatingAddress: { source: 'dati_pubblici', confidence: 'medium', status: params.city ? 'da_verificare' : 'not_available' },
          },
          verificationLinks: {
            iniPec: this.iniPecAdapter.getVerificationLink(validVat || validFiscal),
            registroImprese: this.registroImpreseAdapter.getVerificationLink(cleanFormal, validVat),
          },
        });
      }
    }

    // 4. Controllo Deduplicazione Rigoroso per ciascun candidato rispetto alle aziende CRM esistenti
    const existingCompanies = params.existingCompanies || [];
    for (const cand of aggregatedCandidates) {
      if (cand.alreadyInCrm) continue; // già marcato da adapter crm_locale

      for (const exist of existingCompanies) {
        let isDup = false;
        let reason = '';

        // Check 1: Partita IVA
        if (cand.vatId && exist.vatId && cand.vatId.trim() === exist.vatId.trim()) {
          isDup = true;
          reason = `Partita IVA coincidente (${exist.vatId})`;
        }
        // Check 2: Codice Fiscale
        else if (cand.fiscalCode && exist.fiscalCode && cand.fiscalCode.trim() === exist.fiscalCode.trim()) {
          isDup = true;
          reason = `Codice Fiscale coincidente (${exist.fiscalCode})`;
        }
        // Check 3: Dominio
        else if (cand.website && exist.website && extractCleanDomain(cand.website) === extractCleanDomain(exist.website)) {
          isDup = true;
          reason = `Sito web coincidente (${extractCleanDomain(exist.website)})`;
        }
        // Check 4: Nome normalizzato + Città
        else if (
          cand.name &&
          exist.name &&
          normalizeText(cand.name) === normalizeText(exist.name) &&
          cand.city &&
          exist.city &&
          normalizeText(cand.city) === normalizeText(exist.city)
        ) {
          isDup = true;
          reason = `Nome e Comune coincidenti (${exist.name} - ${exist.city})`;
        }
        // Check 5: providerPlaceId
        else if (cand.providerPlaceId && exist.providerPlaceId && cand.providerPlaceId === exist.providerPlaceId) {
          isDup = true;
          reason = `Identificativo Territoriale coincidente (${exist.providerPlaceId})`;
        }

        if (isDup) {
          cand.alreadyInCrm = true;
          cand.duplicateOfCompanyId = exist.id;
          cand.duplicateMatchReason = `Azienda già presente nel CRM: ${reason}`;
          break;
        }
      }
    }

    return {
      candidates: aggregatedCandidates,
      nameVariants,
      query: params,
      totalCount: aggregatedCandidates.length,
      sourcesQueried,
    };
  }
}
