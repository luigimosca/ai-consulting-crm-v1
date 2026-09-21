/**
 * B2B Decision Maker & Role Contact Intelligence Engine
 * 
 * Modulo GDPR-compliant e a costo zero per identificare i decisori aziendali:
 * 1. Crawling multi-pagina profondo (Homepage + Subpages + Link dinamici da menu)
 * 2. Parsing Schema.org JSON-LD (Person, LocalBusiness, founder, employee, director)
 * 3. Pattern matching semantico su titoli, ruoli e diciture legali italiane
 * 4. Dati camerali / denominazione registrata / note CRM
 * 5. Generazione pattern email con tracciabilità e livello di confidenza
 * 6. Piena tracciabilità: extractedAt, sourceUrl, rawData, lastVerifiedAt, verificationMethod
 */

import { classifyRoleWithTaxonomy, type Department, type Seniority } from './role-taxonomy';

export interface DiscoveredDecisionMaker {
  id: string;
  fullName: string;
  role: string;
  department: Department;
  seniority: Seniority;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  avatarUrl?: string | null;
  confidence: number;
  source: 'team_page' | 'corporate_record' | 'web_discovery' | 'pattern_deduction' | 'manual_input';
  sourceUrl?: string | null;
  rawData?: string | null;
  extractedAt: string;
  lastVerifiedAt?: string | null;
  verificationMethod: 'website_published' | 'pattern_inferred' | 'manual_verified' | 'unverified';
  isVerified: boolean;
  notes?: string | null;
}

export interface DecisionMakerSearchParams {
  companyName: string;
  website?: string | null;
  sector?: string | null;
  city?: string | null;
  address?: string | null;
  notes?: string | null;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Valida la sintassi RFC di base di un indirizzo email
 */
export function isValidEmailSyntax(email: string): boolean {
  if (!email || email.length > 254) return false;
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email);
}

/**
 * Normalizza e pulisce titoli professionali italiani (Dott., Dott.ssa, Avv., ecc.)
 */
export function cleanItalianTitleAndName(raw: string): { titlePrefix: string | null; cleanName: string } {
  let text = raw.replace(/<[^>]+>/g, '').trim();
  
  let titlePrefix: string | null = null;
  const prefixMatch = text.match(/^(Dott\.ssa|Dott\.sa|Dottoressa|Dott\.|Dr\.ssa|Dr\.|Avv\.ssa|Avv\.|Prof\.ssa|Prof\.|Ing\.|Rag\.|Arch\.|Geom\.|Notaio)\s+/i);
  if (prefixMatch) {
    titlePrefix = prefixMatch[1];
    text = text.replace(prefixMatch[0], '').trim();
  }

  // Rimuovi parole di stop e ruoli appesi
  text = text
    .replace(/\s*[-–|].*$/g, '')
    .replace(/\b(Titolare|Fondatore|CEO|Founder|Direttore|Responsabile|Studio|Clinica|Pizzeria|Ristorante|Bar|Hotel)\b.*$/gi, '')
    .trim();

  // Pulisci caratteri non alfabetici mantenendo accenti e apostrofi
  text = text.replace(/[^\p{L}\s'’-]/gu, '').replace(/\s+/g, ' ').trim();

  return { titlePrefix, cleanName: text };
}

/**
 * Deduce pattern di email aziendale nominativa dal dominio con calcolo della confidenza
 */
export function generateProbableEmails(
  fullName: string, 
  domain: string | null
): { email: string; pattern: string; confidence: number }[] {
  if (!domain || !fullName) return [];
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
  
  // Escludi domini di hosting gratuiti o social per email aziendali
  if (
    !cleanDomain || 
    cleanDomain.includes('altervista') || 
    cleanDomain.includes('facebook') || 
    cleanDomain.includes('instagram') ||
    cleanDomain.includes('wixsite') ||
    cleanDomain.includes('wordpress.com')
  ) {
    return [];
  }

  const parts = fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(dott\.ssa|dott\.sa|dottoressa|dott|dr\.ssa|dr|avv\.ssa|avv|ing|prof\.ssa|prof|arch|geom|rag|notaio)\.?\s+/gi, '')
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 1);

  if (parts.length === 0) return [];

  if (parts.length < 2) {
    const single = `${parts[0]}@${cleanDomain}`;
    return [{ email: single, pattern: 'first@domain', confidence: 0.65 }];
  }

  const first = parts[0];
  const last = parts[parts.length - 1];

  return [
    { email: `${first}.${last}@${cleanDomain}`, pattern: 'first.last@domain', confidence: 0.85 },
    { email: `${first[0]}.${last}@${cleanDomain}`, pattern: 'first_initial.last@domain', confidence: 0.75 },
    { email: `${first}@${cleanDomain}`, pattern: 'first@domain', confidence: 0.70 },
    { email: `${last}@${cleanDomain}`, pattern: 'last@domain', confidence: 0.60 },
    { email: `direzione@${cleanDomain}`, pattern: 'role@domain', confidence: 0.75 },
  ];
}

/**
 * Valida che una stringa sia effettivamente un nome di persona fisica e non una ragione sociale
 */
export function isValidPersonName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim();
  if (clean.length < 3 || clean.length > 50) return false;
  const lower = clean.toLowerCase();

  // Escludi ragioni sociali ed entità non persone fisiche
  if (
    /\b(srl|s\.r\.l|spa|s\.p\.a|snc|s\.n\.c|sas|s\.a\.s|ss|s\.s|coop|società|azienda|fisioterapia|recura|studio|clinica|ristorante|pizzeria|hotel|resort|boutique|store|shop|bar|lab|group|holding|agency|italia|pompei|milano|napoli|roma|firenze|torino|bologna|verona|genova)\b/i.test(lower)
  ) {
    return false;
  }

  // Deve contenere solo caratteri alfabetici, spazi, trattini o apostrofi
  return /^[\p{L}\s'’.-]+$/u.test(clean);
}

/**
 * Estrae link verso pagine team/chi-siamo/medici/privacy dal menu di navigazione della homepage
 */
function extractNavigationTeamLinks(html: string, baseUrl: string): string[] {
  let origin = '';
  try {
    origin = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`).origin;
  } catch {
    return [];
  }

  const links = new Set<string>();
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1].trim();
    const anchorText = match[2].replace(/<[^>]+>/g, '').trim().toLowerCase();
    
    const isTeamRelated = 
      /chi[\s\-_]?siam|chi[\s\-_]?son|about|team|staff|medic|dottor|avvocat|professionist|persone|fondator|storia|contatt|privacy/i.test(href) ||
      /chi siamo|chi sono|about|team|staff|i medici|nostri medici|avvocati|professionisti|fondatori|nostra storia|contatti|privacy/i.test(anchorText);

    if (isTeamRelated && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
      try {
        let fullUrl = '';
        if (href.startsWith('http')) {
          if (href.startsWith(origin)) fullUrl = href;
        } else if (href.startsWith('/')) {
          fullUrl = `${origin}${href}`;
        } else {
          fullUrl = `${origin}/${href}`;
        }

        if (fullUrl && fullUrl !== origin && fullUrl !== `${origin}/`) {
          links.add(fullUrl.split('#')[0].split('?')[0]);
        }
      } catch {}
    }
  }

  return Array.from(links).slice(0, 8);
}

/**
 * Estrae candidati persone da una stringa HTML (JSON-LD + Microdata + Regex)
 */
function extractPersonsFromHtml(html: string, pageUrl: string, sector?: string | null): {
  persons: DiscoveredDecisionMaker[];
  detectedEmail: string | null;
  detectedPhone: string | null;
} {
  const discovered: DiscoveredDecisionMaker[] = [];
  const seenNames = new Set<string>();
  const now = new Date().toISOString();

  // Rileva email e telefono dalla pagina
  let detectedEmail: string | null = null;
  let detectedPhone: string | null = null;

  const emailMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
    html.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i);
  if (emailMatch) {
    const em = emailMatch[1].toLowerCase();
    if (!em.includes('wix') && !em.includes('wordpress') && !em.includes('sentry') && !em.includes('example')) {
      detectedEmail = em;
    }
  }

  const phoneMatch = html.match(/tel:([+0-9\s-]{8,20})/i) || html.match(/(?:\+39\s*|0\d{1,4}\s*)[\d\s-]{6,14}/);
  if (phoneMatch) {
    detectedPhone = (phoneMatch[1] || phoneMatch[0]).trim();
  }

  // 1. JSON-LD Extraction
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const script of jsonLdMatches) {
    try {
      const jsonStr = script.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
      const data = JSON.parse(jsonStr);
      const items = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);

      for (const item of items) {
        if (item['@type'] === 'Person' && item.name) {
          const name = String(item.name).trim();
          if (isValidPersonName(name) && !seenNames.has(name.toLowerCase())) {
            seenNames.add(name.toLowerCase());
            const role = item.jobTitle || 'Titolare / Referente';
            const classification = classifyRoleWithTaxonomy(role, sector);
            const emails = generateProbableEmails(name, pageUrl);

            discovered.push({
              id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              fullName: name,
              role: classification.normalizedTitleIt || role,
              department: classification.department,
              seniority: classification.seniority,
              email: item.email || emails[0]?.email || null,
              phone: item.telephone || null,
              linkedinUrl: item.sameAs || null,
              avatarUrl: item.image || null,
              confidence: 0.98,
              source: 'team_page',
              sourceUrl: pageUrl,
              rawData: JSON.stringify(item),
              extractedAt: now,
              lastVerifiedAt: now,
              verificationMethod: 'website_published',
              isVerified: true,
              notes: `Estratto da dati strutturati Schema.org JSON-LD (${pageUrl})`,
            });
          }
        }

        const checkOrgField = (field: any, defaultRole: string) => {
          if (!field) return;
          const people = Array.isArray(field) ? field : [field];
          for (const p of people) {
            const pName = typeof p === 'string' ? p : p.name;
            const pRole = (typeof p === 'object' && p.jobTitle) ? p.jobTitle : defaultRole;
            if (pName && isValidPersonName(pName) && !seenNames.has(pName.toLowerCase())) {
              seenNames.add(pName.toLowerCase());
              const classification = classifyRoleWithTaxonomy(pRole, sector);
              const emails = generateProbableEmails(pName, pageUrl);

              discovered.push({
                id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                fullName: pName,
                role: classification.normalizedTitleIt || pRole,
                department: classification.department,
                seniority: classification.seniority,
                email: (typeof p === 'object' && p.email) ? p.email : (emails[0]?.email || null),
                phone: (typeof p === 'object' && p.telephone) ? p.telephone : null,
                linkedinUrl: (typeof p === 'object' && p.sameAs) ? p.sameAs : null,
                avatarUrl: null,
                confidence: 0.95,
                source: 'team_page',
                sourceUrl: pageUrl,
                rawData: JSON.stringify(p),
                extractedAt: now,
                lastVerifiedAt: now,
                verificationMethod: 'website_published',
                isVerified: true,
                notes: `Estratto da organigramma Schema.org (${pageUrl})`,
              });
            }
          }
        };

        checkOrgField(item.founder, 'Fondatore & Titolare');
        checkOrgField(item.employee, 'Specialista / Team');
        checkOrgField(item.director, 'Direttore');
        checkOrgField(item.member, 'Socio / Membro del Team');
      }
    } catch {}
  }

  // 2. Clean Text for Pattern Matching
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  // 3. Regular Expression Patterns
  const patterns: { regex: RegExp; defaultRole: string; nameGroup: number; roleGroup?: number }[] = [
    {
      regex: /\b(Dott\.ssa|Dott\.sa|Dottoressa|Dott\.|Dr\.ssa|Dr\.|Avv\.ssa|Avv\.|Prof\.ssa|Prof\.|Ing\.|Notaio)\s+([A-ZÀ-Ú][a-zà-ú']+(?:\s+[A-ZÀ-Ú][a-zà-ú']+){1,2})/g,
      defaultRole: 'Titolare & Specialista',
      nameGroup: 0
    },
    {
      regex: /(?:Titolare|Fondatore|Proprietario|Amministratore|Direttore|Responsabile|Founder|CEO|Chef|Maestro|Dottore|Avvocato)\s*[:\-–]\s*([A-ZÀ-Ú][a-zà-ú']+(?:\s+[A-ZÀ-Ú][a-zà-ú']+){1,2})/gi,
      defaultRole: 'Titolare / Direzione',
      nameGroup: 1
    },
    {
      regex: /\b([A-ZÀ-Ú][a-zà-ú']+\s+[A-ZÀ-Ú][a-zà-ú']+)\s*[,|\-–]\s*(Titolare|Fondatore|Proprietario|Amministratore\s+Unico|Direttore\s+Sanitario|Direttrice\s+Sanitaria|Responsabile\s+Marketing|Managing\s+Director|CEO|Founder|Chef\s+Patron|Avvocato|Commercialista|Fisioterapista|Odontoiatra)/g,
      defaultRole: 'Titolare',
      nameGroup: 1,
      roleGroup: 2
    },
    {
      regex: /\bSono\s+([A-ZÀ-Ú][a-zà-ú']+(?:\s+[A-ZÀ-Ú][a-zà-ú']+){0,2})[,\s]+(fisioterapista|osteopata|avvocato|commercialista|medico|consulente|fondatore|titolare)/gi,
      defaultRole: 'Specialista',
      nameGroup: 1,
      roleGroup: 2
    },
    {
      regex: /(?:Ditta\s+Individuale|Studio\s+Professionale|P\.?\s*IVA[^\n,;]{5,30})\s+di\s+([A-ZÀ-Ú][a-zà-ú']+\s+[A-ZÀ-Ú][a-zà-ú']+)/gi,
      defaultRole: 'Titolare & Legale Rappresentante',
      nameGroup: 1
    },
    {
      regex: /Titolare\s+del\s+trattamento(?:\s+dei\s+dati)?\s*[:\-–]\s*([A-ZÀ-Ú][a-zà-ú']+\s+[A-ZÀ-Ú][a-zà-ú']+)/gi,
      defaultRole: 'Titolare del Trattamento (Privacy)',
      nameGroup: 1
    }
  ];

  for (const p of patterns) {
    let match;
    while ((match = p.regex.exec(cleanHtml)) !== null) {
      let rawName = match[p.nameGroup] ? match[p.nameGroup].trim() : '';
      let rawRole = (p.roleGroup && match[p.roleGroup]) ? match[p.roleGroup].trim() : p.defaultRole;

      rawName = rawName.replace(/<[^>]+>/g, '').trim();
      const { cleanName, titlePrefix } = cleanItalianTitleAndName(rawName);
      const fullName = titlePrefix ? `${titlePrefix} ${cleanName}` : cleanName;

      if (isValidPersonName(cleanName) && !seenNames.has(cleanName.toLowerCase())) {
        seenNames.add(cleanName.toLowerCase());
        const classification = classifyRoleWithTaxonomy(rawRole, sector);
        const emails = generateProbableEmails(cleanName, pageUrl);

        discovered.push({
          id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          fullName,
          role: classification.normalizedTitleIt || rawRole,
          department: classification.department,
          seniority: classification.seniority,
          email: emails[0]?.email || null,
          phone: null,
          linkedinUrl: null,
          avatarUrl: null,
          confidence: titlePrefix ? 0.94 : 0.88,
          source: 'team_page',
          sourceUrl: pageUrl,
          rawData: JSON.stringify({ match: match[0], pageUrl }),
          extractedAt: now,
          lastVerifiedAt: now,
          verificationMethod: 'website_published',
          isVerified: true,
          notes: `Identificato nella pagina web aziendale (${pageUrl})`,
        });
      }
    }
  }

  return { persons: discovered, detectedEmail, detectedPhone };
}

/**
 * Scansione multi-pagina sicura del sito web aziendale
 */
async function scrapeTeamPages(baseUrl: string, companyName: string, sector?: string | null): Promise<{
  persons: DiscoveredDecisionMaker[];
  siteEmail: string | null;
  sitePhone: string | null;
}> {
  const discovered: DiscoveredDecisionMaker[] = [];
  const normalizedUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  
  let origin = '';
  try {
    origin = new URL(normalizedUrl).origin;
  } catch {
    return { persons: [], siteEmail: null, sitePhone: null };
  }

  const seenUrls = new Set<string>();
  const targetUrls: string[] = [];
  let siteEmail: string | null = null;
  let sitePhone: string | null = null;

  // Includi sempre la homepage / base URL
  targetUrls.push(normalizedUrl);
  if (normalizedUrl !== origin && normalizedUrl !== `${origin}/`) {
    targetUrls.push(origin);
  }
  seenUrls.add(normalizedUrl);
  seenUrls.add(origin);

  // 1. Scansiona prima la homepage per estrarre sia persone sia link del menu
  let homepageHtml = '';
  try {
    const res = await fetch(origin, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      homepageHtml = await res.text();
      const hpResult = extractPersonsFromHtml(homepageHtml, origin, sector);
      discovered.push(...hpResult.persons);
      if (hpResult.detectedEmail) siteEmail = hpResult.detectedEmail;
      if (hpResult.detectedPhone) sitePhone = hpResult.detectedPhone;

      // Trova link dinamici alle pagine team/chi-siamo
      const dynamicLinks = extractNavigationTeamLinks(homepageHtml, origin);
      for (const dl of dynamicLinks) {
        if (!seenUrls.has(dl)) {
          seenUrls.add(dl);
          targetUrls.push(dl);
        }
      }
    }
  } catch {}

  // 2. Aggiungi candidate subpaths classiche
  const candidatePaths = [
    '/chi-siamo',
    '/chi-sono',
    '/about',
    '/about-us',
    '/team',
    '/staff',
    '/medici',
    '/dottori',
    '/professionisti',
    '/avvocati',
    '/contatti',
    '/privacy-policy',
    '/note-legali',
  ];

  for (const cp of candidatePaths) {
    const full = `${origin}${cp}`;
    if (!seenUrls.has(full)) {
      seenUrls.add(full);
      targetUrls.push(full);
    }
  }

  // 3. Esegui crawling parallelo delle subpage (massimo 8 URL)
  const toScan = targetUrls.filter((u) => u !== origin).slice(0, 8);
  await Promise.allSettled(
    toScan.map(async (targetUrl) => {
      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(4000),
        });

        if (!res.ok) return;
        const html = await res.text();
        const result = extractPersonsFromHtml(html, targetUrl, sector);
        discovered.push(...result.persons);
        if (!siteEmail && result.detectedEmail) siteEmail = result.detectedEmail;
        if (!sitePhone && result.detectedPhone) sitePhone = result.detectedPhone;
      } catch {}
    })
  );

  return { persons: discovered, siteEmail, sitePhone };
}

/**
 * Estrazione da ragione sociale registrata, dati camerali e note CRM
 */
function extractFromCorporateRecords(params: DecisionMakerSearchParams): DiscoveredDecisionMaker[] {
  const { companyName, notes, website, sector } = params;
  const discovered: DiscoveredDecisionMaker[] = [];
  const now = new Date().toISOString();
  const seenNames = new Set<string>();

  const combined = `${companyName} ${notes || ''}`;

  // 1. Pattern: "Attività di Nome Cognome" (Chatbot & Inbound)
  const inboundMatch = combined.match(/Attività di\s+([A-ZÀ-Ú][a-zà-ú']+\s+[A-ZÀ-Ú][a-zà-ú']+)/i);
  if (inboundMatch) {
    const name = inboundMatch[1].trim();
    if (!seenNames.has(name.toLowerCase())) {
      seenNames.add(name.toLowerCase());
      const classification = classifyRoleWithTaxonomy('Titolare & Founder', sector);
      const probableEmails = generateProbableEmails(name, website || null);

      discovered.push({
        id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fullName: name,
        role: classification.normalizedTitleIt || 'Titolare & Founder',
        department: classification.department,
        seniority: classification.seniority,
        email: probableEmails[0]?.email || null,
        phone: null,
        linkedinUrl: null,
        avatarUrl: null,
        confidence: 0.96,
        source: 'corporate_record',
        sourceUrl: website || null,
        rawData: JSON.stringify({ source: 'inbound_request', match: inboundMatch[0] }),
        extractedAt: now,
        lastVerifiedAt: now,
        verificationMethod: 'website_published',
        isVerified: true,
        notes: `Titolare registrato dal modulo di contatto/richiesta demo`,
      });
    }
  }

  // 2. Pattern: "Studio Legale / Commercialisti / Notarile [Associati] [Cognome] & Partners"
  const studioMatch = companyName.match(/Studio\s+(Legale|Commercialisti|Notarile|Dentistico|Fiscale|Tributario)?\s*(?:Associato)?\s*(?:Dott\.ssa|Avv\.ssa|Dott\.|Avv\.|Notaio)?\s*([A-ZÀ-Ú][a-zà-ú']+)/i);
  if (studioMatch) {
    const studioType = (studioMatch[1] || '').toLowerCase();
    const surname = studioMatch[2].trim();

    let prefix = 'Dott.';
    let role = 'Partner & Titolare di Studio';
    if (studioType.includes('legal') || studioType.includes('avvocat')) {
      prefix = 'Avv.';
      role = 'Avvocato Partner / Titolare di Studio';
    } else if (studioType.includes('notar')) {
      prefix = 'Notaio';
      role = 'Notaio Titolare';
    } else if (studioType.includes('commercialist') || studioType.includes('fiscal') || studioType.includes('tributar')) {
      prefix = 'Dott.';
      role = 'Dottore Commercialista & Partner';
    }

    const full = `${prefix} ${surname}`;
    if (!seenNames.has(full.toLowerCase())) {
      seenNames.add(full.toLowerCase());
      const classification = classifyRoleWithTaxonomy(role, sector);
      const probableEmails = generateProbableEmails(surname, website || null);

      discovered.push({
        id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fullName: full,
        role: classification.normalizedTitleIt || role,
        department: classification.department,
        seniority: classification.seniority,
        email: probableEmails[0]?.email || null,
        phone: null,
        linkedinUrl: null,
        avatarUrl: null,
        confidence: 0.93,
        source: 'corporate_record',
        sourceUrl: website || null,
        rawData: JSON.stringify({ entityName: companyName, titleFound: full }),
        extractedAt: now,
        lastVerifiedAt: now,
        verificationMethod: 'pattern_inferred',
        isVerified: true,
        notes: `Managing Partner identificato dalla denominazione dello Studio Professionale`,
      });
    }
  }

  // 3. Cerca pattern "Dott.ssa Silvia Mirabella", "Avv. ...", ecc.
  const namePattern = /\b(Dott\.ssa|Dott\.sa|Dottoressa|Dott\.|Dr\.ssa|Dr\.|Avv\.ssa|Avv\.|Prof\.ssa|Prof\.|Ing\.|Notaio)\s+([A-ZÀ-Ú][a-zà-ú']+(?:\s+[A-ZÀ-Ú][a-zà-ú']+){1,2})/g;
  let match;

  while ((match = namePattern.exec(combined)) !== null) {
    const prefix = match[1];
    const { cleanName } = cleanItalianTitleAndName(match[2].trim());
    const full = `${prefix} ${cleanName}`;

    if (cleanName.length > 3 && !seenNames.has(cleanName.toLowerCase())) {
      seenNames.add(cleanName.toLowerCase());

      let role = 'Titolare & Responsabile Legale';
      if (combined.toLowerCase().includes('fisioterap')) {
        role = 'Titolare & Fisioterapista Specializzata';
      } else if (combined.toLowerCase().includes('legale') || combined.toLowerCase().includes('avvocat')) {
        role = 'Avvocato Titolare';
      } else if (combined.toLowerCase().includes('commercialist')) {
        role = 'Dottore Commercialista Titolare';
      }

      const classification = classifyRoleWithTaxonomy(role, sector);
      const probableEmails = generateProbableEmails(cleanName, website || null);

      discovered.push({
        id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fullName: full,
        role: classification.normalizedTitleIt || role,
        department: classification.department,
        seniority: classification.seniority,
        email: probableEmails[0]?.email || null,
        phone: null,
        linkedinUrl: null,
        avatarUrl: null,
        confidence: 0.95,
        source: 'corporate_record',
        sourceUrl: website || null,
        rawData: JSON.stringify({ entityName: companyName, titleFound: full }),
        extractedAt: now,
        lastVerifiedAt: now,
        verificationMethod: 'website_published',
        isVerified: true,
        notes: `Titolare identificato nella denominazione ufficiale o nelle note dell'attività`,
      });
    }
  }

  return discovered;
}

/**
 * MOTORE PRINCIPALE: DISCOVER DECISION MAKERS
 */
export async function discoverDecisionMakers(params: DecisionMakerSearchParams): Promise<{
  decisionMakers: DiscoveredDecisionMaker[];
  emailPattern: string | null;
  summary: {
    totalFound: number;
    cLevelCount: number;
    verifiedCount: number;
  };
}> {
  const allDiscovered: DiscoveredDecisionMaker[] = [];
  const seenNameKeys = new Set<string>();
  const now = new Date().toISOString();

  // 1. Dati societari e note CRM
  const fromCorporate = extractFromCorporateRecords(params);
  for (const dm of fromCorporate) {
    const key = dm.fullName.toLowerCase().replace(/^(dott\.ssa|dott|avv|ing|dr|prof|notaio)\.?\s+/gi, '').trim();
    if (!seenNameKeys.has(key)) {
      seenNameKeys.add(key);
      allDiscovered.push(dm);
    }
  }

  // 2. Multi-page Website Crawler & JSON-LD Extractor
  let siteDetectedEmail: string | null = null;
  let siteDetectedPhone: string | null = null;

  if (params.website) {
    try {
      const fromTeam = await scrapeTeamPages(params.website, params.companyName, params.sector);
      siteDetectedEmail = fromTeam.siteEmail;
      siteDetectedPhone = fromTeam.sitePhone;

      for (const dm of fromTeam.persons) {
        const key = dm.fullName.toLowerCase().replace(/^(dott\.ssa|dott|avv|ing|dr|prof|notaio)\.?\s+/gi, '').trim();
        if (!seenNameKeys.has(key)) {
          seenNameKeys.add(key);
          allDiscovered.push(dm);
        }
      }
    } catch {}
  }

  // Se nessun nominativo specifico è stato trovato, crea il referente direzionale di default
  if (allDiscovered.length === 0) {
    let defaultRole = 'Titolare / Direzione Generale';
    if (params.sector === 'ecommerce') defaultRole = 'Head of E-Commerce / Titolare';
    else if (params.sector === 'local_services') defaultRole = 'Titolare / Responsabile Attività';
    else if (params.sector === 'horeca_ristoranti') defaultRole = 'Titolare & Gestore';
    else if (params.sector === 'studi_legali' || params.sector === 'commercialisti') defaultRole = 'Partner / Titolare di Studio';
    else if (params.sector === 'horeca_hotel') defaultRole = 'Direttore Generale / Hotel Manager';

    const classification = classifyRoleWithTaxonomy(defaultRole, params.sector);
    const probableEmails = generateProbableEmails('Direzione', params.website || null);

    const fallbackEmail = siteDetectedEmail || probableEmails[0]?.email || (params.website ? `info@${params.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}` : null);

    allDiscovered.push({
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: `Direzione Generale (${params.companyName})`,
      role: classification.normalizedTitleIt || defaultRole,
      department: classification.department,
      seniority: 'owner',
      email: fallbackEmail,
      phone: siteDetectedPhone || null,
      linkedinUrl: null,
      avatarUrl: null,
      confidence: 0.70,
      source: 'web_discovery',
      sourceUrl: params.website || null,
      rawData: JSON.stringify({ defaultGenerated: true, companyName: params.companyName }),
      extractedAt: now,
      lastVerifiedAt: now,
      verificationMethod: 'pattern_inferred',
      isVerified: false,
      notes: `Referente direzionale dedotto per ${params.companyName}`,
    });
  }

  // Ordina per confidenza decrescente (i verificati con titolo e fonte certa in cima)
  allDiscovered.sort((a, b) => b.confidence - a.confidence);

  const cLevelCount = allDiscovered.filter((dm) => dm.seniority === 'c_level' || dm.seniority === 'owner').length;
  const verifiedCount = allDiscovered.filter((dm) => dm.isVerified).length;

  return {
    decisionMakers: allDiscovered,
    emailPattern: params.website ? `nome.cognome@${params.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}` : null,
    summary: {
      totalFound: allDiscovered.length,
      cLevelCount,
      verifiedCount,
    },
  };
}
