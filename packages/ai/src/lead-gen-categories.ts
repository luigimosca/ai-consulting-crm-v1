export interface SubcategoryDefinition {
  id: string;
  label: string;
  description?: string;
  osmClauses: string[]; // es. ['node["amenity"="restaurant"]', 'way["amenity"="restaurant"]']
}

export interface SectorDefinition {
  id: string;
  crmSector: 'studi_legali' | 'commercialisti' | 'horeca_ristoranti' | 'horeca_hotel' | 'ecommerce' | 'local_services';
  label: string;
  iconName: string;
  subcategories: SubcategoryDefinition[];
}

export const LEAD_GEN_SECTORS: SectorDefinition[] = [
  {
    id: 'horeca_ristorazione',
    crmSector: 'horeca_ristoranti',
    label: 'HORECA - Ristorazione & Food',
    iconName: 'Utensils',
    subcategories: [
      {
        id: 'ristoranti',
        label: 'Ristoranti & Trattorie',
        description: 'Ristoranti tradizionali, osterie, bistrot, cucina tipica',
        osmClauses: [
          'node["amenity"="restaurant"]',
          'way["amenity"="restaurant"]',
          'node["amenity"="bistro"]',
          'way["amenity"="bistro"]',
        ],
      },
      {
        id: 'pizzerie',
        label: 'Pizzerie',
        description: 'Pizzerie al piatto, pizzerie al taglio, forni',
        osmClauses: [
          'node["amenity"="pizzeria"]',
          'way["amenity"="pizzeria"]',
          'node["amenity"="restaurant"]["cuisine"~"pizza"]',
          'way["amenity"="restaurant"]["cuisine"~"pizza"]',
          'node["cuisine"="pizza"]',
        ],
      },
      {
        id: 'bar_caffe',
        label: 'Bar, Caffetterie & Lounge',
        description: 'Bar, coffee shop, sale da tè, american bar',
        osmClauses: [
          'node["amenity"="bar"]',
          'way["amenity"="bar"]',
          'node["amenity"="cafe"]',
          'way["amenity"="cafe"]',
        ],
      },
      {
        id: 'pub_birrerie',
        label: 'Pub & Birrerie',
        description: 'Pub, birrerie artigianali, wine bar',
        osmClauses: [
          'node["amenity"="pub"]',
          'way["amenity"="pub"]',
          'node["amenity"="biergarten"]',
        ],
      },
      {
        id: 'pasticcerie_gelaterie',
        label: 'Pasticcerie & Gelaterie',
        description: 'Gelaterie artigianali, pasticcerie, laboratori dolciari',
        osmClauses: [
          'node["amenity"="ice_cream"]',
          'way["amenity"="ice_cream"]',
          'node["shop"="pastry"]',
          'way["shop"="pastry"]',
          'node["shop"="bakery"]',
        ],
      },
      {
        id: 'fast_food',
        label: 'Fast Food & Street Food',
        description: 'Paninerie, burger house, kebab, rosticcerie, take away',
        osmClauses: [
          'node["amenity"="fast_food"]',
          'way["amenity"="fast_food"]',
          'node["amenity"="food_court"]',
        ],
      },
      {
        id: 'catering',
        label: 'Catering & Banqueting',
        description: 'Servizi catering per eventi e cerimonie',
        osmClauses: [
          'node["craft"="caterer"]',
          'way["craft"="caterer"]',
          'node["amenity"="catering"]',
        ],
      },
    ],
  },
  {
    id: 'horeca_ospitalita',
    crmSector: 'horeca_hotel',
    label: 'HORECA - Ospitalità & Strutture Ricettive',
    iconName: 'Hotel',
    subcategories: [
      {
        id: 'hotel',
        label: 'Hotel & Alberghi',
        description: 'Hotel da 1 a 5 stelle, boutique hotel, aparthotel',
        osmClauses: [
          'node["tourism"="hotel"]',
          'way["tourism"="hotel"]',
          'relation["tourism"="hotel"]',
          'node["tourism"="motel"]',
        ],
      },
      {
        id: 'bed_and_breakfast',
        label: 'Bed & Breakfast (B&B)',
        description: 'B&B a conduzione familiare o professionale',
        osmClauses: [
          'node["tourism"="bed_and_breakfast"]',
          'way["tourism"="bed_and_breakfast"]',
        ],
      },
      {
        id: 'guest_house',
        label: 'Affittacamere & Guest House',
        description: 'Guest house, locande, camere in affitto',
        osmClauses: [
          'node["tourism"="guest_house"]',
          'way["tourism"="guest_house"]',
        ],
      },
      {
        id: 'resort_agriturismo',
        label: 'Resort, Relais & Agriturismi',
        description: 'Agriturismi con ristorazione, relais di campagna, resort con spa',
        osmClauses: [
          'node["tourism"="resort"]',
          'way["tourism"="resort"]',
          'node["tourism"="chalet"]',
          'node["tourism"="agriturismo"]',
          'way["tourism"="agriturismo"]',
        ],
      },
      {
        id: 'ostelli_campeggi',
        label: 'Ostelli, Campeggi & Villaggi',
        description: 'Ostelli della gioventù, campeggi, glamping, villaggi turistici',
        osmClauses: [
          'node["tourism"="hostel"]',
          'way["tourism"="hostel"]',
          'node["tourism"="camp_site"]',
          'way["tourism"="camp_site"]',
          'node["tourism"="caravan_site"]',
        ],
      },
    ],
  },
  {
    id: 'studi_legali',
    crmSector: 'studi_legali',
    label: 'Studi Legali & Notarili',
    iconName: 'Scale',
    subcategories: [
      {
        id: 'avvocati',
        label: 'Avvocati & Studi Legali',
        description: 'Avvocati civilisti, penalisti, societari, giuslavoristi',
        osmClauses: [
          'node["office"="lawyer"]',
          'way["office"="lawyer"]',
          'node["amenity"="lawyer"]',
        ],
      },
      {
        id: 'notai',
        label: 'Studi Notarili',
        description: 'Notai e studi notarili associati',
        osmClauses: [
          'node["office"="notary"]',
          'way["office"="notary"]',
        ],
      },
      {
        id: 'consulenza_legale',
        label: 'Consulenza Legale & Brevetti',
        description: 'Consulenti legali, periti, agenti brevetti',
        osmClauses: [
          'node["office"="legal"]',
          'way["office"="legal"]',
        ],
      },
    ],
  },
  {
    id: 'commercialisti',
    crmSector: 'commercialisti',
    label: 'Commercialisti & Consulenti del Lavoro',
    iconName: 'Calculator',
    subcategories: [
      {
        id: 'commercialisti_studi',
        label: 'Commercialisti & Esperti Contabili',
        description: 'Dottori commercialisti, contabilità aziendale, revisione',
        osmClauses: [
          'node["office"="accountant"]',
          'way["office"="accountant"]',
          'node["office"="tax_advisor"]',
          'way["office"="tax_advisor"]',
        ],
      },
      {
        id: 'consulenti_lavoro',
        label: 'Consulenti del Lavoro & HR',
        description: 'Gestione paghe, relazioni sindacali, consulenza lavoro',
        osmClauses: [
          'node["office"="employment_agency"]',
          'node["office"="consulting"]',
          'way["office"="consulting"]',
        ],
      },
      {
        id: 'finanziari_tributari',
        label: 'Consulenti Finanziari & Tributari',
        description: 'Pianificazione fiscale, finanza agevolata, consulenza d’impresa',
        osmClauses: [
          'node["office"="financial_advisor"]',
          'way["office"="financial_advisor"]',
          'node["office"="financial"]',
          'way["office"="financial"]',
        ],
      },
    ],
  },
  {
    id: 'ecommerce_retail',
    crmSector: 'ecommerce',
    label: 'E-commerce & Negozi al Dettaglio',
    iconName: 'ShoppingBag',
    subcategories: [
      {
        id: 'moda_abbigliamento',
        label: 'Abbigliamento, Calzature & Boutique',
        description: 'Boutique moda, calzature, pelletteria, accessori',
        osmClauses: [
          'node["shop"="clothes"]',
          'way["shop"="clothes"]',
          'node["shop"="shoes"]',
          'way["shop"="shoes"]',
          'node["shop"="boutique"]',
        ],
      },
      {
        id: 'elettronica_telefonia',
        label: 'Elettronica, Informatica & Telefonia',
        description: 'Negozi tech, smartphone, computer, elettrodomestici',
        osmClauses: [
          'node["shop"="electronics"]',
          'way["shop"="electronics"]',
          'node["shop"="mobile_phone"]',
          'node["shop"="computer"]',
        ],
      },
      {
        id: 'gioiellerie_ottica',
        label: 'Gioiellerie, Orologerie & Ottica',
        description: 'Gioielli, oreficerie, negozi di ottica',
        osmClauses: [
          'node["shop"="jewelry"]',
          'way["shop"="jewelry"]',
          'node["shop"="optician"]',
          'way["shop"="optician"]',
        ],
      },
      {
        id: 'arredamento_casa',
        label: 'Arredamento, Design & Casa',
        description: 'Mobili, oggettistica per la casa, illuminazione',
        osmClauses: [
          'node["shop"="furniture"]',
          'way["shop"="furniture"]',
          'node["shop"="interior_decoration"]',
          'node["shop"="houseware"]',
        ],
      },
      {
        id: 'sport_tempo_libero',
        label: 'Sport, Outdoor & Tempo Libero',
        description: 'Articoli sportivi, biciclette, hobby',
        osmClauses: [
          'node["shop"="sports"]',
          'way["shop"="sports"]',
          'node["shop"="bicycle"]',
        ],
      },
    ],
  },
  {
    id: 'servizi_locali',
    crmSector: 'local_services',
    label: 'Studi Tecnici, Salute & Servizi Locali',
    iconName: 'Building2',
    subcategories: [
      {
        id: 'architetti_ingegneri',
        label: 'Architetti, Ingegneri & Geometri',
        description: 'Studi di architettura, ingegneria civile, perizie edili',
        osmClauses: [
          'node["office"="architect"]',
          'way["office"="architect"]',
          'node["office"="engineer"]',
          'way["office"="engineer"]',
        ],
      },
      {
        id: 'agenzie_immobiliari',
        label: 'Agenzie Immobiliari',
        description: 'Intermediazione immobiliare, compravendite, affitti',
        osmClauses: [
          'node["office"="estate_agent"]',
          'way["office"="estate_agent"]',
        ],
      },
      {
        id: 'estetica_benessere',
        label: 'Centri Estetici, Spa & Parrucchieri',
        description: 'Saloni di bellezza, parrucchieri, centri massaggi, solarium',
        osmClauses: [
          'node["shop"="beauty"]',
          'way["shop"="beauty"]',
          'node["shop"="hairdresser"]',
          'way["shop"="hairdresser"]',
          'node["amenity"="spa"]',
        ],
      },
      {
        id: 'medici_dentisti',
        label: 'Studi Medici, Dentisti & Cliniche',
        description: 'Dentisti, odontoiatri, fisioterapisti, poliambulatori, specialisti',
        osmClauses: [
          'node["amenity"="dentist"]',
          'way["amenity"="dentist"]',
          'node["amenity"="doctors"]',
          'way["amenity"="doctors"]',
          'node["amenity"="clinic"]',
          'way["amenity"="clinic"]',
          'node["healthcare"="dentist"]',
          'way["healthcare"="dentist"]',
          'node["healthcare"="doctor"]',
          'way["healthcare"="doctor"]',
          'node["healthcare"="clinic"]',
          'way["healthcare"="clinic"]',
          'node["healthcare"="physiotherapist"]',
          'way["healthcare"="physiotherapist"]',
          'node["healthcare"="centre"]',
          'way["healthcare"="centre"]',
          'node["healthcare"="rehabilitation"]',
        ],
      },
      {
        id: 'fitness_palestre',
        label: 'Palestre, Fitness & Scuole di Ballo',
        description: 'Centri fitness, palestre, box crossfit, scuole danza',
        osmClauses: [
          'node["leisure"="fitness_centre"]',
          'way["leisure"="fitness_centre"]',
          'node["leisure"="sports_centre"]',
        ],
      },
      {
        id: 'artigiani_impiantisti',
        label: 'Artigiani, Impiantisti & Idraulici',
        description: 'Elettricisti, idraulici, climatizzazione, serramenti',
        osmClauses: [
          'node["craft"="electrician"]',
          'node["craft"="plumber"]',
          'node["craft"="hvac"]',
          'node["craft"="carpenter"]',
        ],
      },
    ],
  },
];

export function getSectorById(sectorId: string): SectorDefinition | undefined {
  return LEAD_GEN_SECTORS.find((s) => s.id === sectorId);
}

export function getSubcategoryById(subcatId: string): SubcategoryDefinition | undefined {
  for (const sector of LEAD_GEN_SECTORS) {
    const found = sector.subcategories.find((sc) => sc.id === subcatId);
    if (found) return found;
  }
  return undefined;
}

export function buildOverpassClauses(
  subcatIds: string[],
  radiusMeters: number,
  lat: number,
  lon: number
): string {
  const clauses: string[] = [];
  const validSubcatIds = new Set(subcatIds);

  for (const sector of LEAD_GEN_SECTORS) {
    for (const subcat of sector.subcategories) {
      if (validSubcatIds.has(subcat.id)) {
        for (const rawClause of subcat.osmClauses) {
          const formatted = `${rawClause}(around:${radiusMeters},${lat},${lon});`;
          clauses.push(formatted);
        }
      }
    }
  }

  return clauses.join('\n  ');
}

export function matchOsmTagsToCategory(
  tags: Record<string, string>
): { crmSector: SectorDefinition['crmSector']; categoryGroup: string; categoryLabel: string; subcategoryKey: string } {
  const amenity = tags.amenity || '';
  const tourism = tags.tourism || '';
  const office = tags.office || '';
  const shop = tags.shop || '';
  const craft = tags.craft || '';
  const leisure = tags.leisure || '';
  const cuisine = tags.cuisine || '';
  const healthcare = tags.healthcare || '';

  if (amenity === 'pizzeria' || cuisine.includes('pizza')) {
    return { crmSector: 'horeca_ristoranti', categoryGroup: 'HORECA', categoryLabel: 'Pizzeria', subcategoryKey: 'pizzerie' };
  }
  if (amenity === 'restaurant' || amenity === 'bistro') {
    const isTrattoria = (tags.name || '').toLowerCase().includes('trattoria') || (tags.name || '').toLowerCase().includes('osteria');
    return {
      crmSector: 'horeca_ristoranti',
      categoryGroup: 'HORECA',
      categoryLabel: isTrattoria ? 'Trattoria / Osteria' : 'Ristorante',
      subcategoryKey: 'ristoranti',
    };
  }
  if (amenity === 'cafe' || amenity === 'bar') {
    return { crmSector: 'horeca_ristoranti', categoryGroup: 'HORECA', categoryLabel: amenity === 'cafe' ? 'Caffetteria' : 'Bar', subcategoryKey: 'bar_caffe' };
  }
  if (amenity === 'pub' || amenity === 'biergarten') {
    return { crmSector: 'horeca_ristoranti', categoryGroup: 'HORECA', categoryLabel: 'Pub & Birreria', subcategoryKey: 'pub_birrerie' };
  }
  if (amenity === 'ice_cream' || shop === 'pastry') {
    return { crmSector: 'horeca_ristoranti', categoryGroup: 'HORECA', categoryLabel: amenity === 'ice_cream' ? 'Gelateria' : 'Pasticceria', subcategoryKey: 'pasticcerie_gelaterie' };
  }
  if (amenity === 'fast_food') {
    return { crmSector: 'horeca_ristoranti', categoryGroup: 'HORECA', categoryLabel: 'Fast Food / Street Food', subcategoryKey: 'fast_food' };
  }

  if (tourism === 'hotel' || tourism === 'motel') {
    const stars = tags.stars ? ` (${tags.stars}★)` : '';
    return { crmSector: 'horeca_hotel', categoryGroup: 'HORECA', categoryLabel: `Hotel${stars}`, subcategoryKey: 'hotel' };
  }
  if (tourism === 'bed_and_breakfast') {
    return { crmSector: 'horeca_hotel', categoryGroup: 'HORECA', categoryLabel: 'Bed & Breakfast', subcategoryKey: 'bed_and_breakfast' };
  }
  if (tourism === 'guest_house') {
    return { crmSector: 'horeca_hotel', categoryGroup: 'HORECA', categoryLabel: 'Guest House / Affittacamere', subcategoryKey: 'guest_house' };
  }
  if (tourism === 'resort' || tourism === 'chalet' || tourism === 'agriturismo') {
    return { crmSector: 'horeca_hotel', categoryGroup: 'HORECA', categoryLabel: 'Resort / Agriturismo', subcategoryKey: 'resort_agriturismo' };
  }
  if (tourism === 'hostel' || tourism === 'camp_site') {
    return { crmSector: 'horeca_hotel', categoryGroup: 'HORECA', categoryLabel: tourism === 'hostel' ? 'Ostello' : 'Campeggio', subcategoryKey: 'ostelli_campeggi' };
  }

  if (office === 'lawyer' || amenity === 'lawyer') {
    return { crmSector: 'studi_legali', categoryGroup: 'Studi Professionali', categoryLabel: 'Studio Legale / Avvocato', subcategoryKey: 'avvocati' };
  }
  if (office === 'notary') {
    return { crmSector: 'studi_legali', categoryGroup: 'Studi Professionali', categoryLabel: 'Studio Notarile', subcategoryKey: 'notai' };
  }
  if (office === 'legal') {
    return { crmSector: 'studi_legali', categoryGroup: 'Studi Professionali', categoryLabel: 'Consulenza Legale', subcategoryKey: 'consulenza_legale' };
  }

  if (office === 'accountant' || office === 'tax_advisor') {
    return { crmSector: 'commercialisti', categoryGroup: 'Studi Professionali', categoryLabel: 'Studio Commercialista / Fiscale', subcategoryKey: 'commercialisti_studi' };
  }
  if (office === 'consulting' || office === 'employment_agency') {
    return { crmSector: 'commercialisti', categoryGroup: 'Studi Professionali', categoryLabel: 'Consulenza Aziendale / Lavoro', subcategoryKey: 'consulenti_lavoro' };
  }
  if (office === 'financial_advisor' || office === 'financial') {
    return { crmSector: 'commercialisti', categoryGroup: 'Studi Professionali', categoryLabel: 'Consulenza Finanziaria', subcategoryKey: 'finanziari_tributari' };
  }

  if (shop === 'clothes' || shop === 'shoes' || shop === 'boutique') {
    return { crmSector: 'ecommerce', categoryGroup: 'Retail & Moda', categoryLabel: 'Abbigliamento & Moda', subcategoryKey: 'moda_abbigliamento' };
  }
  if (shop === 'electronics' || shop === 'mobile_phone' || shop === 'computer') {
    return { crmSector: 'ecommerce', categoryGroup: 'Retail Tech', categoryLabel: 'Elettronica & Telefonia', subcategoryKey: 'elettronica_telefonia' };
  }
  if (shop === 'jewelry' || shop === 'optician') {
    return { crmSector: 'ecommerce', categoryGroup: 'Retail', categoryLabel: shop === 'jewelry' ? 'Gioielleria' : 'Ottica', subcategoryKey: 'gioiellerie_ottica' };
  }

  if (office === 'architect' || office === 'engineer') {
    return { crmSector: 'local_services', categoryGroup: 'Studi Tecnici', categoryLabel: office === 'architect' ? 'Studio Architettura' : 'Studio Ingegneria', subcategoryKey: 'architetti_ingegneri' };
  }
  if (office === 'estate_agent') {
    return { crmSector: 'local_services', categoryGroup: 'Immobiliare', categoryLabel: 'Agenzia Immobiliare', subcategoryKey: 'agenzie_immobiliari' };
  }
  if (shop === 'beauty' || shop === 'hairdresser' || amenity === 'spa') {
    return { crmSector: 'local_services', categoryGroup: 'Benessere & Beauty', categoryLabel: 'Centro Estetico / Parrucchiere', subcategoryKey: 'estetica_benessere' };
  }
  if (amenity === 'dentist' || healthcare === 'dentist') {
    return { crmSector: 'local_services', categoryGroup: 'Salute & Sanità', categoryLabel: 'Studio Dentistico', subcategoryKey: 'medici_dentisti' };
  }
  if (healthcare === 'physiotherapist' || healthcare === 'physiotherapy' || healthcare === 'rehabilitation') {
    return { crmSector: 'local_services', categoryGroup: 'Salute & Sanità', categoryLabel: 'Fisioterapia & Riabilitazione', subcategoryKey: 'medici_dentisti' };
  }
  if (amenity === 'doctors' || amenity === 'clinic' || healthcare === 'doctor' || healthcare === 'clinic' || healthcare === 'centre') {
    return { crmSector: 'local_services', categoryGroup: 'Salute & Sanità', categoryLabel: 'Studio Medico / Clinica', subcategoryKey: 'medici_dentisti' };
  }
  if (leisure === 'fitness_centre' || leisure === 'sports_centre') {
    return { crmSector: 'local_services', categoryGroup: 'Fitness & Sport', categoryLabel: 'Palestra / Centro Fitness', subcategoryKey: 'fitness_palestre' };
  }
  if (craft) {
    return { crmSector: 'local_services', categoryGroup: 'Artigiani & Tecnici', categoryLabel: `Artigiano (${craft})`, subcategoryKey: 'artigiani_impiantisti' };
  }

  return {
    crmSector: 'local_services',
    categoryGroup: 'Attività Locale',
    categoryLabel: tags.amenity || tags.shop || tags.office || tags.tourism || 'Attività Commerciale',
    subcategoryKey: 'generico',
  };
}
