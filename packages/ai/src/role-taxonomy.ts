/**
 * B2B Role Taxonomy & Seniority Mapping
 * Tabella di mapping esplicita IT / EN -> department + seniority
 */

export type Department = 'management' | 'marketing' | 'medical' | 'legal' | 'sales' | 'operations' | 'tech' | 'other';
export type Seniority = 'c_level' | 'owner' | 'director' | 'manager' | 'specialist';

export interface RoleRule {
  pattern: RegExp;
  department: Department;
  seniority: Seniority;
  normalizedTitleIt: string;
}

/**
 * Tabella di regole esplicite per la mappatura di ruoli professionali (IT & EN)
 */
export const ROLE_TAXONOMY_RULES: RoleRule[] = [
  // --- MANAGEMENT & EXECUTIVE (C-LEVEL / OWNERS) ---
  {
    pattern: /\b(ceo|chief executive officer|amministratore delegato|ad)\b/i,
    department: 'management',
    seniority: 'c_level',
    normalizedTitleIt: 'Amministratore Delegato (CEO)',
  },
  {
    pattern: /\b(co-founder|cofounder|co-fondatore|co-fondatrice)\b/i,
    department: 'management',
    seniority: 'owner',
    normalizedTitleIt: 'Co-Fondatore',
  },
  {
    pattern: /\b(founder|fondatore|fondatrice)\b/i,
    department: 'management',
    seniority: 'owner',
    normalizedTitleIt: 'Fondatore & Titolare',
  },
  {
    pattern: /\b(titolare|proprietario|proprietaria|owner)\b/i,
    department: 'management',
    seniority: 'owner',
    normalizedTitleIt: 'Titolare',
  },
  {
    pattern: /\b(amministratore unico|presidente|president)\b/i,
    department: 'management',
    seniority: 'c_level',
    normalizedTitleIt: 'Amministratore Unico / Presidente',
  },
  {
    pattern: /\b(general manager|direttore generale|direttrice generale|managing director)\b/i,
    department: 'management',
    seniority: 'c_level',
    normalizedTitleIt: 'Direttore Generale',
  },
  {
    pattern: /\b(socio|socia|partner)\b/i,
    department: 'management',
    seniority: 'owner',
    normalizedTitleIt: 'Socio / Partner',
  },

  // --- HEALTHCARE, MEDICAL & CLINICS (STUDI MEDICI & FISIOTERAPIA) ---
  {
    pattern: /\b(direttore sanitario|direttrice sanitaria|medical director)\b/i,
    department: 'medical',
    seniority: 'director',
    normalizedTitleIt: 'Direttore Sanitario',
  },
  {
    pattern: /\b(fisioterapista titolare|titolare.*fisioterap|fisioterap.*titolare)\b/i,
    department: 'medical',
    seniority: 'owner',
    normalizedTitleIt: 'Titolare & Fisioterapista Specializzata',
  },
  {
    pattern: /\b(fisioterapista|osteopata|posturologo|posturola|mézières|riabilitazione)\b/i,
    department: 'medical',
    seniority: 'specialist',
    normalizedTitleIt: 'Fisioterapista / Specialista Riabilitazione',
  },
  {
    pattern: /\b(odontoiatra|dentista|ortodontista)\b/i,
    department: 'medical',
    seniority: 'specialist',
    normalizedTitleIt: 'Odontoiatra / Dentista',
  },
  {
    pattern: /\b(medico chirurgo|dottore|dottoressa|dott\.ssa|dott\.|chirurgo|specialista)\b/i,
    department: 'medical',
    seniority: 'specialist',
    normalizedTitleIt: 'Medico Specialista',
  },

  // --- LEGAL, TAX & CORPORATE (STUDI LEGALI & COMMERCIALISTI) ---
  {
    pattern: /\b(managing partner|avvocato fondatore|partner fondatore)\b/i,
    department: 'legal',
    seniority: 'owner',
    normalizedTitleIt: 'Managing Partner / Avvocato Fondatore',
  },
  {
    pattern: /\b(avvocato|avvocatessa|avv\.|avv\.ssa|legal counsel|giurista)\b/i,
    department: 'legal',
    seniority: 'specialist',
    normalizedTitleIt: 'Avvocato',
  },
  {
    pattern: /\b(dottore commercialista|commercialista|tributarista|ragioniere|revisore)\b/i,
    department: 'legal',
    seniority: 'specialist',
    normalizedTitleIt: 'Dottore Commercialista',
  },

  // --- MARKETING, E-COMMERCE & GROWTH ---
  {
    pattern: /\b(cmo|chief marketing officer|direttore marketing|head of marketing)\b/i,
    department: 'marketing',
    seniority: 'c_level',
    normalizedTitleIt: 'Chief Marketing Officer (CMO)',
  },
  {
    pattern: /\b(head of ecommerce|ecommerce manager|responsabile ecommerce|responsabile e-commerce)\b/i,
    department: 'marketing',
    seniority: 'director',
    normalizedTitleIt: 'Responsabile E-commerce',
  },
  {
    pattern: /\b(marketing manager|responsabile marketing|growth manager|digital strategist)\b/i,
    department: 'marketing',
    seniority: 'manager',
    normalizedTitleIt: 'Marketing Manager',
  },
  {
    pattern: /\b(social media manager|content creator|copywriter|seo specialist)\b/i,
    department: 'marketing',
    seniority: 'specialist',
    normalizedTitleIt: 'Specialista Marketing Digitale',
  },

  // --- SALES & BUSINESS DEVELOPMENT ---
  {
    pattern: /\b(cso|chief sales officer|direttore commerciale|head of sales)\b/i,
    department: 'sales',
    seniority: 'director',
    normalizedTitleIt: 'Direttore Commerciale',
  },
  {
    pattern: /\b(sales manager|responsabile vendite|account manager|business development)\b/i,
    department: 'sales',
    seniority: 'manager',
    normalizedTitleIt: 'Sales & Business Development Manager',
  },

  // --- TECH & PRODUCT ---
  {
    pattern: /\b(cto|chief technology officer|head of tech|direttore tecnico)\b/i,
    department: 'tech',
    seniority: 'c_level',
    normalizedTitleIt: 'Chief Technology Officer (CTO)',
  },
  {
    pattern: /\b(lead developer|software engineer|tech lead|full stack|webmaster)\b/i,
    department: 'tech',
    seniority: 'specialist',
    normalizedTitleIt: 'Responsabile Tecnico / Sviluppatore',
  },

  // --- OPERATIONS & HORECA ---
  {
    pattern: /\b(chef patron|executive chef|chef)\b/i,
    department: 'operations',
    seniority: 'owner',
    normalizedTitleIt: 'Chef Patron / Titolare di Cucina',
  },
  {
    pattern: /\b(maitre|responsabile di sala|direttore di sala|sommelier)\b/i,
    department: 'operations',
    seniority: 'manager',
    normalizedTitleIt: 'Responsabile di Sala / Sommelier',
  },
  {
    pattern: /\b(operations manager|direttore operativo|coo)\b/i,
    department: 'operations',
    seniority: 'director',
    normalizedTitleIt: 'Direttore Operativo',
  },
];

/**
 * Classifica qualsiasi stringa di ruolo o titolo lavorativo in un Department e Seniority standard
 */
export function classifyRoleWithTaxonomy(rawRole: string, fallbackSector?: string | null): {
  department: Department;
  seniority: Seniority;
  normalizedTitleIt: string;
} {
  const clean = (rawRole || '').trim();
  if (!clean) {
    return {
      department: 'management',
      seniority: 'owner',
      normalizedTitleIt: 'Titolare / Decisore',
    };
  }

  for (const rule of ROLE_TAXONOMY_RULES) {
    if (rule.pattern.test(clean)) {
      return {
        department: rule.department,
        seniority: rule.seniority,
        normalizedTitleIt: rule.normalizedTitleIt,
      };
    }
  }

  // Fallback in base al settore aziendale
  if (fallbackSector === 'ecommerce') {
    return {
      department: 'marketing',
      seniority: 'owner',
      normalizedTitleIt: 'Titolare / Head of E-commerce',
    };
  }
  if (fallbackSector === 'local_services') {
    return {
      department: 'medical',
      seniority: 'owner',
      normalizedTitleIt: 'Titolare / Responsabile Studio',
    };
  }
  if (fallbackSector === 'studi_legali' || fallbackSector === 'commercialisti') {
    return {
      department: 'legal',
      seniority: 'owner',
      normalizedTitleIt: 'Titolare / Partner di Studio',
    };
  }

  return {
    department: 'management',
    seniority: 'owner',
    normalizedTitleIt: 'Titolare / Referente Direzionale',
  };
}
