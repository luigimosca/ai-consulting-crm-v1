import { db, organizationSettings, documents, users, activityLog } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { logActivity } from './activity-logger';

export interface UpdateSettingsInput {
  // 1. Legal / Business Identity
  legalName?: string | null;
  legalForm?: string | null;
  vatId?: string | null;
  fiscalCode?: string | null;
  legalAddress?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  adminEmail?: string | null;
  phone?: string | null;
  pec?: string | null;
  sdiCode?: string | null;

  // 2. Public Brand
  brandName?: string | null;
  tagline?: string | null;
  description?: string | null;
  logoDocumentId?: string | null;
  logoDarkDocumentId?: string | null;
  faviconDocumentId?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;

  // 3. Quote Settings
  quoteHeaderNotes?: string | null;
  quoteFooterText?: string | null;
  quoteDefaultValidityDays?: number | null;
  quoteDefaultTerms?: string | null;
  quotePaymentInstructions?: string | null;
  quoteContactBlockJson?: string | null;
  quoteLogoChoice?: 'primary' | 'dark' | 'none' | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates format of business identity fields (P.IVA, CF, Email, PEC, SDI, Phone, CAP).
 * Note: Validates syntax/format only without claiming official verification of legal identity.
 */
export function validateBusinessIdentity(input: Partial<UpdateSettingsInput>): ValidationResult {
  const errors: Record<string, string> = {};

  // 1. Partita IVA format check (Italian 11 digits or EU format)
  if (input.vatId && input.vatId.trim()) {
    const cleanVat = input.vatId.trim().toUpperCase().replace(/\s+/g, '');
    const isItalianVat = /^\d{11}$/.test(cleanVat);
    const isEuVat = /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(cleanVat);

    if (!isItalianVat && !isEuVat) {
      errors.vatId = 'Formato Partita IVA non valido (deve essere di 11 cifre numeriche per l\'Italia o formato UE es. IT12345678901).';
    }
  }

  // 2. Codice Fiscale format check (16 alphanumeric characters or 11 digits)
  if (input.fiscalCode && input.fiscalCode.trim()) {
    const cleanCf = input.fiscalCode.trim().toUpperCase().replace(/\s+/g, '');
    const isPersonalCf = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cleanCf);
    const isCorporateCf = /^\d{11}$/.test(cleanCf);

    if (!isPersonalCf && !isCorporateCf) {
      errors.fiscalCode = 'Formato Codice Fiscale non valido (16 caratteri alfanumerici per persone fisiche o 11 cifre per persone giuridiche).';
    }
  }

  // 3. Admin Email check
  if (input.adminEmail && input.adminEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.adminEmail.trim())) {
      errors.adminEmail = 'Formato email amministrativa non valido.';
    }
  }

  // 4. PEC check
  if (input.pec && input.pec.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.pec.trim())) {
      errors.pec = 'Formato indirizzo PEC non valido.';
    }
  }

  // 5. Codice SDI check (7 alphanumeric chars or 0000000)
  if (input.sdiCode && input.sdiCode.trim()) {
    const cleanSdi = input.sdiCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{7}$/.test(cleanSdi)) {
      errors.sdiCode = 'Codice Destinatario SDI non valido (deve essere composto da esattamente 7 caratteri alfanumerici es. 0000000 o XXXXXXX).';
    }
  }

  // 6. Postal code check (for Italy, 5 digits)
  if (input.postalCode && input.postalCode.trim() && (!input.country || input.country.toLowerCase() === 'italia' || input.country.toUpperCase() === 'IT')) {
    if (!/^\d{5}$/.test(input.postalCode.trim())) {
      errors.postalCode = 'Il CAP per l\'Italia deve essere composto da 5 cifre numeriche.';
    }
  }

  // 7. Validity days check
  if (input.quoteDefaultValidityDays !== undefined && input.quoteDefaultValidityDays !== null) {
    const days = Number(input.quoteDefaultValidityDays);
    if (isNaN(days) || days < 1 || days > 365) {
      errors.quoteDefaultValidityDays = 'I giorni di validità predefinita devono essere compresi tra 1 e 365.';
    }
  }

  // 8. Colors check (Hex format)
  const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  if (input.primaryColor && input.primaryColor.trim() && !hexRegex.test(input.primaryColor.trim())) {
    errors.primaryColor = 'Il colore primario deve essere un codice HEX valido (es. #2563eb).';
  }
  if (input.secondaryColor && input.secondaryColor.trim() && !hexRegex.test(input.secondaryColor.trim())) {
    errors.secondaryColor = 'Il colore secondario deve essere un codice HEX valido (es. #4f46e5).';
  }
  if (input.accentColor && input.accentColor.trim() && !hexRegex.test(input.accentColor.trim())) {
    errors.accentColor = 'Il colore di accento deve essere un codice HEX valido (es. #06b6d4).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates and sanitizes SVG content buffer against XSS and script injections.
 */
export function sanitizeSvgBuffer(buffer: Buffer): { isSafe: boolean; reason?: string } {
  const content = buffer.toString('utf8');

  // Check for script tags or dangerous javascript protocols
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /\bon\w+\s*=/gi, // onload, onerror, onclick, onmouseover, etc.
    /javascript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<applet/gi,
    /<foreignObject/gi,
    /xlink:href\s*=\s*["']javascript:/gi,
    /href\s*=\s*["']javascript:/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      return { isSafe: false, reason: 'Il file SVG contiene elementi o script non sicuri (potenziale script eseguibile).' };
    }
  }

  return { isSafe: true };
}

/**
 * Retrieves organization settings for a specific brand profile (defaults to 'default').
 * If no settings record exists yet, creates and returns the default row.
 */
export function getOrganizationSettings(brandKey: string = 'default') {
  let settings = db
    .select()
    .from(organizationSettings)
    .where(eq(organizationSettings.brandKey, brandKey))
    .get();

  if (!settings) {
    const now = new Date().toISOString();
    db.insert(organizationSettings)
      .values({
        id: brandKey === 'default' ? 'default' : `org_${brandKey}_${Date.now()}`,
        brandKey,
        isDefault: brandKey === 'default',
        legalName: 'AI Consulting & Solutions',
        legalForm: 'Ditta / Società',
        country: 'Italia',
        brandName: 'AI Consulting',
        tagline: 'Soluzioni di Intelligenza Artificiale e Automazione per Imprese',
        quoteFooterText: 'Grazie per la fiducia accordataci.',
        quoteDefaultValidityDays: 30,
        quoteDefaultTerms: "30% all'avvio, 40% al rilascio beta, 30% al collaudo finale",
        quoteLogoChoice: 'primary',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    settings = db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.brandKey, brandKey))
      .get()!;
  }

  // Enrich with logo metadata if documents exist
  let logoDoc = null;
  if (settings.logoDocumentId) {
    logoDoc = db.select().from(documents).where(eq(documents.id, settings.logoDocumentId)).get() || null;
  }

  let logoDarkDoc = null;
  if (settings.logoDarkDocumentId) {
    logoDarkDoc = db.select().from(documents).where(eq(documents.id, settings.logoDarkDocumentId)).get() || null;
  }

  let faviconDoc = null;
  if (settings.faviconDocumentId) {
    faviconDoc = db.select().from(documents).where(eq(documents.id, settings.faviconDocumentId)).get() || null;
  }

  return {
    ...settings,
    primaryColor: settings.primaryColor || '#2563eb',
    secondaryColor: settings.secondaryColor || '#4f46e5',
    accentColor: settings.accentColor || '#06b6d4',
    logoDocument: logoDoc,
    logoDarkDocument: logoDarkDoc,
    faviconDocument: faviconDoc,
    logoUrl: settings.logoDocumentId ? `/api/documents/${settings.logoDocumentId}/download` : null,
    logoDarkUrl: settings.logoDarkDocumentId ? `/api/documents/${settings.logoDarkDocumentId}/download` : null,
    faviconUrl: settings.faviconDocumentId ? `/api/documents/${settings.faviconDocumentId}/download` : null,
  };
}

/**
 * Updates organization settings (Admin only).
 * Performs validation, saves updates, and logs activity in audit log.
 */
export async function updateOrganizationSettings(
  input: UpdateSettingsInput,
  currentUser: { userId: string; role: string },
  brandKey: string = 'default'
) {
  if (currentUser.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }

  // 1. Validation
  const validation = validateBusinessIdentity(input);
  if (!validation.valid) {
    const err: any = new Error('VALIDATION_ERROR');
    err.details = validation.errors;
    throw err;
  }

  // 2. Fetch current settings before update for audit log
  const existing = getOrganizationSettings(brandKey);
  const now = new Date().toISOString();

  const updates: any = {
    updatedAt: now,
    updatedBy: currentUser.userId,
  };

  // Legal / Business Identity
  if (input.legalName !== undefined) updates.legalName = input.legalName ? input.legalName.trim() : null;
  if (input.legalForm !== undefined) updates.legalForm = input.legalForm ? input.legalForm.trim() : null;
  if (input.vatId !== undefined) updates.vatId = input.vatId ? input.vatId.trim().toUpperCase() : null;
  if (input.fiscalCode !== undefined) updates.fiscalCode = input.fiscalCode ? input.fiscalCode.trim().toUpperCase() : null;
  if (input.legalAddress !== undefined) updates.legalAddress = input.legalAddress ? input.legalAddress.trim() : null;
  if (input.postalCode !== undefined) updates.postalCode = input.postalCode ? input.postalCode.trim() : null;
  if (input.city !== undefined) updates.city = input.city ? input.city.trim() : null;
  if (input.province !== undefined) updates.province = input.province ? input.province.trim().toUpperCase() : null;
  if (input.country !== undefined) updates.country = input.country ? input.country.trim() : 'Italia';
  if (input.adminEmail !== undefined) updates.adminEmail = input.adminEmail ? input.adminEmail.trim().toLowerCase() : null;
  if (input.phone !== undefined) updates.phone = input.phone ? input.phone.trim() : null;
  if (input.pec !== undefined) updates.pec = input.pec ? input.pec.trim().toLowerCase() : null;
  if (input.sdiCode !== undefined) updates.sdiCode = input.sdiCode ? input.sdiCode.trim().toUpperCase() : null;

  // Public Brand
  if (input.brandName !== undefined) updates.brandName = input.brandName ? input.brandName.trim() : null;
  if (input.tagline !== undefined) updates.tagline = input.tagline ? input.tagline.trim() : null;
  if (input.description !== undefined) updates.description = input.description ? input.description.trim() : null;
  if (input.logoDocumentId !== undefined) updates.logoDocumentId = input.logoDocumentId || null;
  if (input.logoDarkDocumentId !== undefined) updates.logoDarkDocumentId = input.logoDarkDocumentId || null;
  if (input.faviconDocumentId !== undefined) updates.faviconDocumentId = input.faviconDocumentId || null;
  if (input.primaryColor !== undefined) updates.primaryColor = input.primaryColor ? input.primaryColor.trim() : null;
  if (input.secondaryColor !== undefined) updates.secondaryColor = input.secondaryColor ? input.secondaryColor.trim() : null;
  if (input.accentColor !== undefined) updates.accentColor = input.accentColor ? input.accentColor.trim() : null;

  // Quote Settings
  if (input.quoteHeaderNotes !== undefined) updates.quoteHeaderNotes = input.quoteHeaderNotes ? input.quoteHeaderNotes.trim() : null;
  if (input.quoteFooterText !== undefined) updates.quoteFooterText = input.quoteFooterText ? input.quoteFooterText.trim() : null;
  if (input.quoteDefaultValidityDays !== undefined) updates.quoteDefaultValidityDays = Number(input.quoteDefaultValidityDays) || 30;
  if (input.quoteDefaultTerms !== undefined) updates.quoteDefaultTerms = input.quoteDefaultTerms ? input.quoteDefaultTerms.trim() : null;
  if (input.quotePaymentInstructions !== undefined) updates.quotePaymentInstructions = input.quotePaymentInstructions ? input.quotePaymentInstructions.trim() : null;
  if (input.quoteContactBlockJson !== undefined) updates.quoteContactBlockJson = input.quoteContactBlockJson || null;
  if (input.quoteLogoChoice !== undefined) updates.quoteLogoChoice = input.quoteLogoChoice || 'primary';

  db.update(organizationSettings)
    .set(updates)
    .where(eq(organizationSettings.brandKey, brandKey))
    .run();

  const updated = getOrganizationSettings(brandKey);

  // 3. Activity / Audit Logging
  await logActivity({
    entityType: 'general',
    entityId: existing.id,
    action: 'settings_updated',
    performedBy: currentUser.userId,
    details: {
      brandKey,
      updatedFields: Object.keys(updates).filter((k) => k !== 'updatedAt' && k !== 'updatedBy'),
    },
    before: existing,
    after: updated,
  });

  return updated;
}

/**
 * Builds the immutable snapshot object representing the sender identity & brand for quotes.
 */
export function buildQuoteSenderSnapshot(brandKey: string = 'default') {
  const settings = getOrganizationSettings(brandKey);

  return {
    legalName: settings.legalName,
    legalForm: settings.legalForm,
    vatId: settings.vatId,
    fiscalCode: settings.fiscalCode,
    legalAddress: settings.legalAddress,
    postalCode: settings.postalCode,
    city: settings.city,
    province: settings.province,
    country: settings.country || 'Italia',
    adminEmail: settings.adminEmail,
    phone: settings.phone,
    pec: settings.pec,
    sdiCode: settings.sdiCode,
    brandName: settings.brandName,
    tagline: settings.tagline,
    logoDocumentId: settings.logoDocumentId,
    logoUrl: settings.logoUrl,
    logoDarkUrl: settings.logoDarkUrl,
    primaryColor: settings.primaryColor,
    quoteHeaderNotes: settings.quoteHeaderNotes,
    quoteFooterText: settings.quoteFooterText,
    quoteDefaultTerms: settings.quoteDefaultTerms,
    quotePaymentInstructions: settings.quotePaymentInstructions,
    quoteLogoChoice: settings.quoteLogoChoice,
    snapshottedAt: new Date().toISOString(),
  };
}

/**
 * Exports a complete JSON backup of the organization settings.
 */
export function exportSettingsBackup(brandKey: string = 'default') {
  const settings = getOrganizationSettings(brandKey);
  const now = new Date().toISOString();

  return {
    version: '1.0',
    exportedAt: now,
    brandKey,
    settings: {
      legalName: settings.legalName,
      legalForm: settings.legalForm,
      vatId: settings.vatId,
      fiscalCode: settings.fiscalCode,
      legalAddress: settings.legalAddress,
      postalCode: settings.postalCode,
      city: settings.city,
      province: settings.province,
      country: settings.country,
      adminEmail: settings.adminEmail,
      phone: settings.phone,
      pec: settings.pec,
      sdiCode: settings.sdiCode,
      brandName: settings.brandName,
      tagline: settings.tagline,
      description: settings.description,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      quoteHeaderNotes: settings.quoteHeaderNotes,
      quoteFooterText: settings.quoteFooterText,
      quoteDefaultValidityDays: settings.quoteDefaultValidityDays,
      quoteDefaultTerms: settings.quoteDefaultTerms,
      quotePaymentInstructions: settings.quotePaymentInstructions,
      quoteContactBlockJson: settings.quoteContactBlockJson,
      quoteLogoChoice: settings.quoteLogoChoice,
    },
  };
}
