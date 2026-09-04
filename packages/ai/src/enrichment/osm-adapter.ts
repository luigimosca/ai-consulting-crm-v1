import { type PublicContactItem } from './types';

export interface OSMEnrichmentInput {
  companyName: string;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  sector?: string | null;
}

export class OSMEnrichmentAdapter {
  name = 'OSMEnrichmentAdapter';

  async enrich(lead: OSMEnrichmentInput): Promise<{
    territorialData: {
      osmUrl?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      openingHours?: string | null;
      address?: string | null;
      categoryGroup?: string | null;
      categoryLabel?: string | null;
    };
    contacts: PublicContactItem[];
  }> {
    const now = new Date().toISOString();
    const contacts: PublicContactItem[] = [];

    // Estrai note con tag OSM se salvate al momento dell'import
    const notes = lead.notes || '';
    let osmUrl: string | null = null;
    let openingHours: string | null = null;

    const osmMatch = notes.match(/https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+/);
    if (osmMatch) {
      osmUrl = osmMatch[0];
    }

    const hoursMatch = notes.match(/Orari:\s*([^|]+)/i);
    if (hoursMatch) {
      openingHours = hoursMatch[1].trim();
    }

    if (lead.phone) {
      contacts.push({
        type: 'phone',
        value: lead.phone,
        sourceUrl: osmUrl,
        confidence: 0.9,
        isVerified: false,
        verificationStatus: 'da_verificare',
        collectedAt: now,
      });
    }

    if (lead.email) {
      const isGeneric = /^(info|contatt[io]|prenotazion[ei])@/i.test(lead.email);
      contacts.push({
        type: isGeneric ? 'generic_email' : 'named_email',
        value: lead.email,
        sourceUrl: osmUrl,
        confidence: 0.9,
        isVerified: false,
        verificationStatus: 'da_verificare',
        collectedAt: now,
      });
    }

    return {
      territorialData: {
        osmUrl,
        address: lead.address,
        openingHours,
        categoryLabel: lead.sector,
      },
      contacts,
    };
  }
}
