import { URL } from 'url';
import { safeFetchHtml, type SafeFetchResult } from './security';
import {
  type WebsiteAnalysisData,
  type EnrichedField,
  type PublicContactItem,
} from './types';

/**
 * Validazione dell'algoritmo del Codice di Controllo per Partite IVA italiane (11 cifre).
 */
export function validateItalianVatNumber(vat: string): boolean {
  if (!vat || !/^\d{11}$/.test(vat)) return false;
  let s = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(vat[i], 10);
    if (i % 2 === 0) {
      // Posizioni dispari (1°, 3°, 5°... indice pari 0, 2, 4...)
      s += digit;
    } else {
      // Posizioni pari (2°, 4°, 6°... moltiplicate per 2)
      let doubled = digit * 2;
      if (doubled > 9) doubled -= 9;
      s += doubled;
    }
  }
  return s % 10 === 0;
}

export class WebsiteAnalyzerAdapter {
  name = 'WebsiteAnalyzerAdapter';

  async analyze(
    rawDomainOrUrl?: string | null,
    leadSector?: string | null
  ): Promise<{
    data: WebsiteAnalysisData;
    discoveredContacts: PublicContactItem[];
    extractedVat?: string | null;
    extractedPec?: string | null;
  }> {
    const now = new Date().toISOString();

    if (!rawDomainOrUrl || rawDomainOrUrl.trim() === '') {
      return {
        data: this.createEmptyWebsiteAnalysis('', now),
        discoveredContacts: [],
      };
    }

    let targetUrl = rawDomainOrUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    // 1. Scansione Homepage
    const homeResult = await safeFetchHtml(targetUrl, { timeoutMs: 8000 });
    if (!homeResult.ok || !homeResult.html) {
      // Se HTTPS fallisce, prova fallback su HTTP solo se non era specificato
      let finalResult = homeResult;
      if (targetUrl.startsWith('https://') && !rawDomainOrUrl.startsWith('https://')) {
        const httpFallback = await safeFetchHtml(targetUrl.replace('https://', 'http://'), { timeoutMs: 6000 });
        if (httpFallback.ok) finalResult = httpFallback;
      }

      if (!finalResult.ok || !finalResult.html) {
        return {
          data: {
            ...this.createEmptyWebsiteAnalysis(targetUrl, now),
            isReachable: false,
            httpStatus: finalResult.status || null,
          },
          discoveredContacts: [],
        };
      }
    }

    const htmlPages: { path: string; status: number; html: string; url: string; title?: string | null }[] = [];
    htmlPages.push({
      path: '/',
      status: homeResult.status,
      html: homeResult.html,
      url: homeResult.url,
      title: this.extractTitle(homeResult.html),
    });

    // 2. Rileva e scansiona subpage chiave (fino a 4 subpage selezionate)
    const discoveredLinks = this.extractInternalSubpageLinks(homeResult.html, homeResult.url);
    const candidateSubpaths = ['contatti', 'chi-siamo', 'menu', 'servizi', 'prenota', 'lavora-con-noi', 'privacy'];
    const chosenLinks: string[] = [];

    for (const key of candidateSubpaths) {
      const found = discoveredLinks.find((l) => l.toLowerCase().includes(key));
      if (found && !chosenLinks.includes(found) && chosenLinks.length < 4) {
        chosenLinks.push(found);
      }
    }

    for (const subUrl of chosenLinks) {
      try {
        const subRes = await safeFetchHtml(subUrl, { timeoutMs: 5000 });
        if (subRes.ok && subRes.html) {
          try {
            const parsed = new URL(subUrl);
            htmlPages.push({
              path: parsed.pathname,
              status: subRes.status,
              html: subRes.html,
              url: subUrl,
              title: this.extractTitle(subRes.html),
            });
          } catch {
            // Ignora errore URL subpage
          }
        }
      } catch {
        // Nessun blocco se una subpage non risponde
      }
    }

    // 3. Analisi aggregata su tutte le pagine scaricate
    const combinedHtml = htmlPages.map((p) => p.html).join('\n');
    const metaTitle = htmlPages[0].title || this.extractTitle(homeResult.html);
    const metaDescription = this.extractMetaDescription(homeResult.html);

    // CMS
    const cmsInfo = this.detectCms(combinedHtml);
    // E-commerce
    const ecommerceInfo = this.detectEcommerce(combinedHtml);
    // Chatbot
    const chatbotInfo = this.detectChatbot(combinedHtml);
    // WhatsApp
    const whatsappInfo = this.detectWhatsapp(combinedHtml);
    // Booking
    const bookingInfo = this.detectBooking(combinedHtml, leadSector);
    // Form
    const formInfo = this.detectContactForm(combinedHtml);
    // Analytics
    const analyticsInfo = this.detectAnalytics(combinedHtml);
    // Pixel
    const pixelInfo = this.detectPixel(combinedHtml);
    // Newsletter
    const newsletterInfo = this.detectNewsletter(combinedHtml);
    // Multilingual
    const multilingualInfo = this.detectMultilingual(combinedHtml);

    // Tecnologie rilevate
    const detectedTechnologies: string[] = [];
    if (cmsInfo.value) detectedTechnologies.push(cmsInfo.value);
    if (ecommerceInfo.value) detectedTechnologies.push('E-commerce');
    if (chatbotInfo.value) detectedTechnologies.push(`Chatbot (${chatbotInfo.value})`);
    if (whatsappInfo.value) detectedTechnologies.push('WhatsApp Widget');
    if (bookingInfo.value) detectedTechnologies.push(`Booking (${bookingInfo.value})`);
    if (analyticsInfo.value) detectedTechnologies.push(`Analytics (${analyticsInfo.value})`);
    if (pixelInfo.value) detectedTechnologies.push('Meta Pixel');
    if (newsletterInfo.value) detectedTechnologies.push('Newsletter');
    if (multilingualInfo.value) detectedTechnologies.push('Multilingua');

    // Social Links
    const socialLinks = this.extractSocialLinks(combinedHtml);

    // Contatti & Identificatori
    const extractedPiva = this.extractItalianPiva(combinedHtml);
    const extractedPec = this.extractPec(combinedHtml);
    const extractedEmails = this.extractEmails(combinedHtml);
    const extractedPhones = this.extractPhones(combinedHtml);
    const copyrightYear = this.extractCopyrightYear(combinedHtml);
    const hasCareersPage = this.detectCareersPage(combinedHtml, discoveredLinks);

    // Costruzione contatti pubblici normalizzati
    const discoveredContacts: PublicContactItem[] = [];

    if (extractedPec) {
      discoveredContacts.push({
        type: 'pec',
        value: extractedPec,
        sourceUrl: homeResult.url,
        confidence: 0.95,
        isVerified: false,
        verificationStatus: 'da_verificare',
        collectedAt: now,
      });
    }

    for (const email of extractedEmails) {
      if (email.toLowerCase() === (extractedPec || '').toLowerCase()) continue;
      const isGeneric = /^(info|contatt[io]|segreteria|amministrazione|support|prenotazion[ei]|commerciale|ufficio)@/i.test(email);
      discoveredContacts.push({
        type: isGeneric ? 'generic_email' : 'named_email',
        value: email,
        sourceUrl: homeResult.url,
        confidence: isGeneric ? 0.9 : 0.8,
        isVerified: false,
        verificationStatus: 'da_verificare',
        collectedAt: now,
      });
    }

    for (const phone of extractedPhones) {
      discoveredContacts.push({
        type: 'phone',
        value: phone,
        sourceUrl: homeResult.url,
        confidence: 0.85,
        isVerified: false,
        verificationStatus: 'da_verificare',
        collectedAt: now,
      });
    }

    // Estrazione esplicita link/numeri WhatsApp
    const whatsappMatches = combinedHtml.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d{8,15})/gi);
    if (whatsappMatches) {
      const seenWa = new Set<string>();
      for (const rawWa of whatsappMatches) {
        const digits = rawWa.replace(/[^0-9+]/g, '');
        if (digits.length >= 8 && !seenWa.has(digits)) {
          seenWa.add(digits);
          discoveredContacts.push({
            type: 'whatsapp',
            value: digits.startsWith('+') ? digits : `+${digits}`,
            sourceUrl: homeResult.url,
            confidence: 0.95,
            isVerified: false,
            verificationStatus: 'da_verificare',
            collectedAt: now,
          });
        }
      }
    }

    for (const soc of socialLinks) {
      discoveredContacts.push({
        type: 'social',
        value: soc.url,
        sourceUrl: homeResult.url,
        confidence: 0.9,
        isVerified: false,
        verificationStatus: 'da_verificare',
        collectedAt: now,
      });
    }

    // Rilevamento hosting di terzo livello / sottodominio gratuito (es. altervista, webflow.io, wixsite)
    let isFreeSubdomain = false;
    let freeSubdomainHost: string | null = null;
    try {
      const parsedUrl = new URL(homeResult.url);
      const host = parsedUrl.hostname.toLowerCase();
      if (
        host.endsWith('.altervista.org') ||
        host.endsWith('.webflow.io') ||
        host.endsWith('.wixsite.com') ||
        host.endsWith('.wordpress.com') ||
        host.endsWith('.blogspot.com') ||
        host.endsWith('.myshopify.com')
      ) {
        isFreeSubdomain = true;
        freeSubdomainHost = host;
        detectedTechnologies.push(`Sottodominio Gratuito (${host})`);
      }
    } catch {
      // Ignora errore parsing URL
    }

    const websiteAnalysisData: WebsiteAnalysisData = {
      url: homeResult.url,
      isReachable: true,
      isHttps: homeResult.isHttps,
      httpStatus: homeResult.status,
      title: metaTitle,
      metaDescription,
      cms: cmsInfo,
      isEcommerce: ecommerceInfo,
      hasChatbot: chatbotInfo,
      hasWhatsapp: whatsappInfo,
      hasBooking: bookingInfo,
      hasContactForm: formInfo,
      hasAnalytics: analyticsInfo,
      hasPixel: pixelInfo,
      hasNewsletter: newsletterInfo,
      isMultilingual: multilingualInfo,
      detectedTechnologies,
      subpagesScanned: htmlPages.map((p) => ({
        path: p.path,
        status: p.status,
        title: p.title,
      })),
      socialLinks,
      extractedPiva,
      extractedPec,
      extractedEmails,
      extractedPhones,
      copyrightYear,
      hasCareersPage,
      isFreeSubdomain,
      freeSubdomainHost,
      analyzedAt: now,
    };

    return {
      data: websiteAnalysisData,
      discoveredContacts,
      extractedVat: extractedPiva,
      extractedPec,
    };
  }

  private createEmptyWebsiteAnalysis(url: string, now: string): WebsiteAnalysisData {
    return {
      url: url || '',
      isReachable: false,
      isHttps: url.startsWith('https://'),
      httpStatus: null,
      title: null,
      metaDescription: null,
      cms: { value: null, source: 'website', sourceUrl: null, collectedAt: now, confidence: 0, isEstimated: false, status: 'not_available' },
      isEcommerce: { value: false, source: 'website', sourceUrl: null, collectedAt: now, confidence: 0, isEstimated: false, status: 'not_available' },
      hasChatbot: { value: false, source: 'website', sourceUrl: null, collectedAt: now, confidence: 0, isEstimated: false, status: 'not_available' },
      hasWhatsapp: { value: false, source: 'website', sourceUrl: null, collectedAt: now, confidence: 0, isEstimated: false, status: 'not_available' },
      hasBooking: { value: false, source: 'website', sourceUrl: null, collectedAt: now, confidence: 0, isEstimated: false, status: 'not_available' },
      hasContactForm: { value: false, source: 'website', sourceUrl: null, collectedAt: now, confidence: 0, isEstimated: false, status: 'not_available' },
      hasAnalytics: { value: false, source: 'website', sourceUrl: null, collectedAt: now, confidence: 0, isEstimated: false, status: 'not_available' },
      hasPixel: { value: false, source: 'website', sourceUrl: null, collectedAt: now, confidence: 0, isEstimated: false, status: 'not_available' },
      hasNewsletter: { value: false, source: 'website', sourceUrl: null, collectedAt: now, confidence: 0, isEstimated: false, status: 'not_available' },
      isMultilingual: { value: false, source: 'website', sourceUrl: null, collectedAt: now, confidence: 0, isEstimated: false, status: 'not_available' },
      detectedTechnologies: [],
      subpagesScanned: [],
      socialLinks: [],
      extractedPiva: null,
      extractedPec: null,
      extractedEmails: [],
      extractedPhones: [],
      copyrightYear: null,
      hasCareersPage: false,
      isFreeSubdomain: false,
      freeSubdomainHost: null,
      analyzedAt: now,
    };
  }

  private extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : null;
  }

  private extractMetaDescription(html: string): string | null {
    const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    return match ? match[1].trim() : null;
  }

  private extractInternalSubpageLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const hrefRegex = /href=["']([^"'#\s>]+)["']/gi;
    let match;

    let parsedBase: URL;
    try {
      parsedBase = new URL(baseUrl);
    } catch {
      return [];
    }

    while ((match = hrefRegex.exec(html)) !== null) {
      const rawHref = match[1];
      if (rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) continue;

      try {
        const fullUrl = new URL(rawHref, baseUrl);
        // Stesso hostname
        if (fullUrl.hostname === parsedBase.hostname && fullUrl.pathname.length > 1) {
          const cleanUrl = `${fullUrl.origin}${fullUrl.pathname}`;
          if (!links.includes(cleanUrl) && links.length < 25) {
            links.push(cleanUrl);
          }
        }
      } catch {
        // Ignora url malformato
      }
    }

    return links;
  }

  private detectCms(html: string): EnrichedField<string> {
    const now = new Date().toISOString();
    let detected: string | null = null;
    let confidence = 0.9;

    if (/wp-content|wp-includes|wp-json|wordpress/i.test(html)) {
      detected = 'WordPress';
      if (/woocommerce/i.test(html)) detected = 'WordPress / WooCommerce';
    } else if (/cdn\.shopify\.com|myshopify\.com|Shopify\.theme/i.test(html)) {
      detected = 'Shopify';
    } else if (/prestashop|modules\/ps_/i.test(html)) {
      detected = 'PrestaShop';
    } else if (/static\.wixstatic\.com|wix\.com|X-Wix-/i.test(html)) {
      detected = 'Wix';
    } else if (/webflow\.com|data-wf-page|wf-site/i.test(html)) {
      detected = 'Webflow';
    } else if (/static1\.squarespace\.com|squarespace\.com/i.test(html)) {
      detected = 'Squarespace';
    } else if (/joomla|option=com_/i.test(html)) {
      detected = 'Joomla';
    } else if (/__next|_next\/static/i.test(html)) {
      detected = 'Next.js / React (Modern Custom)';
    }

    return {
      value: detected,
      source: 'website_html',
      sourceUrl: null,
      collectedAt: now,
      confidence: detected ? confidence : 0.4,
      isEstimated: false,
      status: detected ? 'official' : 'not_available',
    };
  }

  private detectEcommerce(html: string): EnrichedField<boolean> {
    const now = new Date().toISOString();
    const isEcom = /woocommerce|shopify|prestashop|snipcart|magento|add-to-cart|aggiungi al carrello|checkout|carrello|acquista ora/i.test(html);

    return {
      value: isEcom,
      source: 'website_html',
      sourceUrl: null,
      collectedAt: now,
      confidence: isEcom ? 0.9 : 0.7,
      isEstimated: false,
      status: isEcom ? 'official' : 'not_available',
    };
  }

  private detectChatbot(html: string): EnrichedField<boolean | string> {
    const now = new Date().toISOString();
    let botName: string | null = null;

    if (/tidio\.co/i.test(html)) botName = 'Tidio';
    else if (/crisp\.chat/i.test(html)) botName = 'Crisp';
    else if (/intercom/i.test(html)) botName = 'Intercom';
    else if (/tawk\.to/i.test(html)) botName = 'Tawk.to';
    else if (/zopim|zdassets/i.test(html)) botName = 'Zendesk Chat';
    else if (/chatra/i.test(html)) botName = 'Chatra';
    else if (/hubspot.*chat/i.test(html)) botName = 'HubSpot Live Chat';

    return {
      value: botName || false,
      source: 'website_html',
      sourceUrl: null,
      collectedAt: now,
      confidence: botName ? 0.95 : 0.8,
      isEstimated: false,
      status: botName ? 'official' : 'not_available',
    };
  }

  private detectWhatsapp(html: string): EnrichedField<boolean | string> {
    const now = new Date().toISOString();
    const hasWa = /wa\.me|api\.whatsapp\.com|whatsapp:\/\/send|joinchat/i.test(html);

    return {
      value: hasWa ? 'Widget WhatsApp Attivo' : false,
      source: 'website_html',
      sourceUrl: null,
      collectedAt: now,
      confidence: hasWa ? 0.95 : 0.85,
      isEstimated: false,
      status: hasWa ? 'official' : 'not_available',
    };
  }

  private detectBooking(html: string, sector?: string | null): EnrichedField<boolean | string> {
    const now = new Date().toISOString();
    let provider: string | null = null;

    if (/thefork/i.test(html)) provider = 'TheFork';
    else if (/opentable/i.test(html)) provider = 'OpenTable';
    else if (/quandoo/i.test(html)) provider = 'Quandoo';
    else if (/calendly/i.test(html)) provider = 'Calendly';
    else if (/bookeo/i.test(html)) provider = 'Bookeo';
    else if (/simplybook/i.test(html)) provider = 'SimplyBook';
    else if (/resy/i.test(html)) provider = 'Resy';
    else if (/prenota un tavolo|prenota online|prenota appuntamento|book now/i.test(html)) {
      provider = 'Modulo Booking Diretto';
    }

    return {
      value: provider || false,
      source: 'website_html',
      sourceUrl: null,
      collectedAt: now,
      confidence: provider ? 0.9 : 0.8,
      isEstimated: false,
      status: provider ? 'official' : 'not_available',
    };
  }

  private detectContactForm(html: string): EnrichedField<boolean> {
    const now = new Date().toISOString();
    const hasForm = /<form/i.test(html) && /submit|invia|contattaci|name=|email=/i.test(html);

    return {
      value: hasForm,
      source: 'website_html',
      sourceUrl: null,
      collectedAt: now,
      confidence: 0.9,
      isEstimated: false,
      status: hasForm ? 'official' : 'not_available',
    };
  }

  private detectAnalytics(html: string): EnrichedField<boolean | string> {
    const now = new Date().toISOString();
    let provider: string | null = null;

    if (/googletagmanager\.com|GTM-[A-Z0-9]+/i.test(html)) {
      provider = 'Google Tag Manager & GA4';
    } else if (/gtag\(|google-analytics\.com|G-[A-Z0-9]+/i.test(html)) {
      provider = 'Google Analytics 4';
    } else if (/matomo|piwik/i.test(html)) {
      provider = 'Matomo Analytics';
    }

    return {
      value: provider || false,
      source: 'website_html',
      sourceUrl: null,
      collectedAt: now,
      confidence: provider ? 0.95 : 0.75,
      isEstimated: false,
      status: provider ? 'official' : 'not_available',
    };
  }

  private detectPixel(html: string): EnrichedField<boolean> {
    const now = new Date().toISOString();
    const hasPixel = /fbq\(|connect\.facebook\.net\/.*\/fbevents\.js/i.test(html);

    return {
      value: hasPixel,
      source: 'website_html',
      sourceUrl: null,
      collectedAt: now,
      confidence: hasPixel ? 0.95 : 0.8,
      isEstimated: false,
      status: hasPixel ? 'official' : 'not_available',
    };
  }

  private detectNewsletter(html: string): EnrichedField<boolean> {
    const now = new Date().toISOString();
    const hasNews = /newsletter|iscriviti alla newsletter|mailchimp|brevo|sendinblue|getresponse/i.test(html);

    return {
      value: hasNews,
      source: 'website_html',
      sourceUrl: null,
      collectedAt: now,
      confidence: hasNews ? 0.85 : 0.75,
      isEstimated: false,
      status: hasNews ? 'official' : 'not_available',
    };
  }

  private detectMultilingual(html: string): EnrichedField<boolean | string> {
    const now = new Date().toISOString();
    let multi = false;

    if (/hreflang=["'](?:en|de|fr|es|ru|zh)["']/i.test(html)) {
      multi = true;
    } else if (/\/(?:en|de|fr|es)\//i.test(html)) {
      multi = true;
    } else if (/googtrans|gtranslate/i.test(html)) {
      multi = true;
    }

    return {
      value: multi ? 'Sito Multilingua Rilevato' : false,
      source: 'website_html',
      sourceUrl: null,
      collectedAt: now,
      confidence: multi ? 0.9 : 0.8,
      isEstimated: false,
      status: multi ? 'official' : 'not_available',
    };
  }

  private extractSocialLinks(html: string): WebsiteAnalysisData['socialLinks'] {
    const socials: WebsiteAnalysisData['socialLinks'] = [];
    const hrefRegex = /href=["'](https?:\/\/(?:www\.)?(facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com|tripadvisor\.(?:it|com)|thefork\.(?:it|com)|maps\.google\.com|google\.com\/(?:maps|search)|trustpilot\.com)\/[^"'#\s>]+)["']/gi;
    let match;

    const seenUrls = new Set<string>();

    while ((match = hrefRegex.exec(html)) !== null) {
      const fullUrl = match[1];
      const platformDomain = match[2].toLowerCase();

      // Escludi bottoni di share generici
      if (fullUrl.includes('/sharer') || fullUrl.includes('/intent/tweet') || fullUrl.includes('/share') || fullUrl.includes('/login')) continue;

      if (seenUrls.has(fullUrl)) continue;
      seenUrls.add(fullUrl);

      let platform: WebsiteAnalysisData['socialLinks'][0]['platform'] = 'other';
      if (platformDomain.includes('facebook')) platform = 'facebook';
      else if (platformDomain.includes('instagram')) platform = 'instagram';
      else if (platformDomain.includes('linkedin')) platform = 'linkedin';
      else if (platformDomain.includes('twitter') || platformDomain.includes('x.com')) platform = 'twitter';
      else if (platformDomain.includes('youtube')) platform = 'youtube';
      else if (platformDomain.includes('tiktok')) platform = 'tiktok';
      else if (platformDomain.includes('tripadvisor')) platform = 'tripadvisor';
      else if (platformDomain.includes('thefork')) platform = 'thefork';
      else if (platformDomain.includes('google')) platform = 'google_maps';
      else if (platformDomain.includes('trustpilot')) platform = 'trustpilot';

      socials.push({ platform, url: fullUrl });
    }

    return socials;
  }

  private extractItalianPiva(html: string): string | null {
    const pivaMatches = html.match(/(?:P\.?\s*IVA|Partita\s*IVA|P\.IVA|VAT\s*ID|Codice\s*Fiscale\s*e\s*P\.IVA)[\s:n°#]*([0-9]{11})/gi);
    if (pivaMatches) {
      for (const m of pivaMatches) {
        const digits = m.match(/\d{11}/);
        if (digits && validateItalianVatNumber(digits[0])) {
          return digits[0];
        }
      }
    }
    // Cerca anche 11 cifre generiche se accompagnate da parole chiave
    const genericDigits = html.match(/\b\d{11}\b/g);
    if (genericDigits) {
      for (const num of genericDigits) {
        if (validateItalianVatNumber(num)) {
          return num;
        }
      }
    }
    return null;
  }

  private extractPec(html: string): string | null {
    const pecMatch = html.match(/[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)*(?:pec\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|legalmail\.it|postecert\.it|pec\.it|arubapec\.it|sicurezzapostale\.it)/i);
    return pecMatch ? pecMatch[0].trim().toLowerCase() : null;
  }

  private extractEmails(html: string): string[] {
    const emails: string[] = [];
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    let match;
    const seen = new Set<string>();

    while ((match = emailRegex.exec(html)) !== null) {
      const email = match[1].trim().toLowerCase();
      // Escludi file immagine, font, script o estensioni non email
      if (/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(email)) continue;
      if (email.endsWith('@example.com') || email.endsWith('@domain.com') || email.endsWith('@email.com')) continue;
      if (email.startsWith('wix-') || email.startsWith('sentry-')) continue;

      if (!seen.has(email)) {
        seen.add(email);
        emails.push(email);
      }
    }

    return emails.slice(0, 10);
  }

  private extractPhones(html: string): string[] {
    const phones: string[] = [];
    const seen = new Set<string>();

    // 1. Cerca link tel:
    const telRegex = /href=["']tel:([^"'#\s>]+)["']/gi;
    let match;
    while ((match = telRegex.exec(html)) !== null) {
      const rawTel = decodeURIComponent(match[1]).trim();
      if (rawTel.length >= 6 && !seen.has(rawTel)) {
        seen.add(rawTel);
        phones.push(rawTel);
      }
    }

    // 2. Cerca numeri italiani con prefisso comune
    const italianPhoneRegex = /(?:\+39[\s.-]?)?(?:0\d{1,4}[\s.-]?\d{4,8}|3\d{2}[\s.-]?\d{6,7})/g;
    while ((match = italianPhoneRegex.exec(html)) !== null) {
      const clean = match[0].trim();
      if (clean.length >= 8 && !seen.has(clean) && phones.length < 5) {
        seen.add(clean);
        phones.push(clean);
      }
    }

    return phones;
  }

  private extractCopyrightYear(html: string): number | null {
    const match = html.match(/(?:©|&copy;|Copyright)\s*(?:20\d{2}\s*-\s*)?(20\d{2})/i);
    if (match) {
      const year = parseInt(match[1], 10);
      if (year >= 2010 && year <= 2030) return year;
    }
    return null;
  }

  private detectCareersPage(html: string, discoveredLinks: string[]): boolean {
    if (/lavora con noi|posizioni aperte|careers|lavora-con-noi|jobs/i.test(html)) {
      return true;
    }
    for (const link of discoveredLinks) {
      if (/lavora-con-noi|careers|jobs|carriere/i.test(link)) {
        return true;
      }
    }
    return false;
  }
}
