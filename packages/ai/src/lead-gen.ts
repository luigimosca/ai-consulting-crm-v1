import {
  LEAD_GEN_SECTORS,
  buildOverpassClauses,
  matchOsmTagsToCategory,
  getSectorById,
} from './lead-gen-categories';
import { searchLocalWebDirectoryLeads } from './lead-gen-local-scraper';

export interface NormalizedPlace {
  provider: 'openstreetmap' | 'web_directory' | 'mock';
  providerPlaceId: string; // "osm:node:12345" o "web:dir:12345"
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  name: string;
  categoryGroup: string;
  categoryLabel: string;
  subcategoryKey: string;
  crmSector: 'studi_legali' | 'commercialisti' | 'horeca_ristoranti' | 'horeca_hotel' | 'ecommerce' | 'local_services';
  address: string | null;
  street: string | null;
  houseNumber: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  openingHours: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  latitude: number;
  longitude: number;
  osmUrl: string;
  distanceMeters?: number;
  rating: null;
  reviewCount: null;
  sourceFetchedAt: string;
  isEcommerce?: boolean;
  ecommercePlatform?: string | null;
  rawTags: Record<string, string>;
}

export interface LeadGenSearchParams {
  city: string;
  keyword?: string;
  sectorId?: string;
  subcategories?: string[];
  radiusKm?: number;
  niche?: string; // retrocompatibilità
}

export interface LeadGenSearchDebugInfo {
  queryOverpass: string;
  geocodedCenter: {
    lat: number;
    lon: number;
    displayName: string;
  } | null;
  executionTimeMs: number;
  rawPlacesCount: number;
  deduplicatedCount: number;
  discardedCount: number;
  cacheHit: boolean;
  activeEndpoint: string;
  webDirectoryPlacesCount?: number;
}

export interface LeadGenSearchResult {
  places: NormalizedPlace[];
  count: number;
  provider: string;
  debugInfo: LeadGenSearchDebugInfo;
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Rate Limiter & Persistent Memory Cache for Nominatim (TTL 30 days) & Overpass (TTL 24h)
// ---------------------------------------------------------------------------

interface GeocodeCacheEntry {
  lat: number;
  lon: number;
  displayName: string;
  timestamp: number;
}

interface OverpassCacheEntry {
  data: any;
  timestamp: number;
}

const NOMINATIM_CACHE = new Map<string, GeocodeCacheEntry>();
const OVERPASS_CACHE = new Map<string, OverpassCacheEntry>();

const NOMINATIM_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni
const OVERPASS_TTL_MS = 24 * 60 * 60 * 1000; // 24 ore

let lastNominatimRequestTime = 0;

async function rateLimitNominatim(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  if (timeSinceLast < 1100) {
    const delay = 1100 - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastNominatimRequestTime = Date.now();
}

/**
 * Calcola la distanza geodetica in metri tra due punti (formula di Haversine)
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Raggio della Terra in metri
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function normalizeTextForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Provider OpenStreetMap + Web & Local Directory Scraper Ibrido Territoriale
 */
export class OpenStreetMapTerritorialProvider {
  name = 'Motore Ibrido Territoriale (OpenStreetMap + Web Directory Gratuite)';

  private userAgent: string;
  private nominatimUrl: string;
  private overpassEndpoints: string[];

  constructor() {
    this.userAgent = process.env.OSM_USER_AGENT || 'AI-Agency-CRM/1.0 (contact: info@ai-agency.it)';
    this.nominatimUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
    this.overpassEndpoints = [
      process.env.OVERPASS_BASE_URL || 'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    ];
  }

  async search(params: LeadGenSearchParams): Promise<LeadGenSearchResult> {
    const startTime = Date.now();
    const city = (params.city || 'Milano').trim();
    const radiusKm = Math.min(50, Math.max(1, params.radiusKm || 10));
    const radiusMeters = radiusKm * 1000;
    const keyword = params.keyword ? params.keyword.trim() : '';

    // 1. Risolvi sottocategorie target
    let subcatIds: string[] = params.subcategories || [];
    if (subcatIds.length === 0) {
      if (params.sectorId) {
        const sec = getSectorById(params.sectorId);
        if (sec) {
          subcatIds = sec.subcategories.map((sc) => sc.id);
        }
      } else if (params.niche) {
        const lowerNiche = params.niche.toLowerCase();
        if (lowerNiche.includes('ristor') || lowerNiche.includes('pizz') || lowerNiche.includes('horeca')) {
          subcatIds = ['ristoranti', 'pizzerie', 'bar_caffe', 'pub_birrerie'];
        } else if (lowerNiche.includes('hotel') || lowerNiche.includes('alberg')) {
          subcatIds = ['hotel', 'bed_and_breakfast', 'guest_house', 'resort_agriturismo'];
        } else if (lowerNiche.includes('legal') || lowerNiche.includes('avvocat')) {
          subcatIds = ['avvocati', 'notai'];
        } else if (lowerNiche.includes('commercialist') || lowerNiche.includes('fisc')) {
          subcatIds = ['commercialisti_studi', 'consulenti_lavoro'];
        } else if (lowerNiche.includes('e-com') || lowerNiche.includes('negoz') || lowerNiche.includes('store')) {
          subcatIds = ['moda_abbigliamento', 'elettronica_telefonia'];
        } else {
          subcatIds = ['architetti_ingegneri', 'agenzie_immobiliari', 'estetica_benessere', 'medici_dentisti'];
        }
      } else {
        subcatIds = ['ristoranti', 'pizzerie', 'bar_caffe', 'medici_dentisti'];
      }
    }

    // 2. Geocodifica Nominatim per centro città con Cache e Rate Limiter
    const geocodedCenter = await this.geocodeCity(city);
    if (!geocodedCenter) {
      return {
        places: [],
        count: 0,
        provider: this.name,
        debugInfo: {
          queryOverpass: '',
          geocodedCenter: null,
          executionTimeMs: Date.now() - startTime,
          rawPlacesCount: 0,
          deduplicatedCount: 0,
          discardedCount: 0,
          cacheHit: false,
          activeEndpoint: 'none',
        },
        success: false,
        error: `Impossibile individuare le coordinate geografiche per il comune "${city}". Verifica il nome della città.`,
      };
    }

    // 3. Esecuzione Parallela: OpenStreetMap (Overpass) + Local Web & Directory Scraper
    const clauses = buildOverpassClauses(subcatIds, radiusMeters, geocodedCenter.lat, geocodedCenter.lon);
    const queryOverpass = clauses && clauses.trim() !== ''
      ? `[out:json][timeout:25];\n(\n  ${clauses}\n);\nout center tags;`
      : '';

    const [osmElements, localWebPlaces] = await Promise.all([
      this.fetchOverpassData(queryOverpass, geocodedCenter, radiusMeters, subcatIds),
      searchLocalWebDirectoryLeads({
        city,
        keyword,
        sectorId: params.sectorId,
        subcategories: subcatIds,
        radiusKm,
        centerLat: geocodedCenter.lat,
        centerLon: geocodedCenter.lon,
      }).catch((err) => {
        console.warn('[HybridLeadGen] Web scraper locale fallito:', err?.message);
        return [] as NormalizedPlace[];
      }),
    ]);

    const rawElements = osmElements.data;
    const activeEndpoint = osmElements.activeEndpoint;
    const cacheHit = osmElements.cacheHit;

    // 4. Normalizzazione, Pulizia, Filtro e Deduplicazione a 3 Livelli
    const rawPlacesCount = rawElements.length;
    let discardedCount = 0;
    let deduplicatedCount = 0;

    const seenProviderIds = new Set<string>();
    const deduplicatedPlaces: NormalizedPlace[] = [];

    // Processa prima elementi OpenStreetMap
    for (const elem of rawElements) {
      const tags: Record<string, string> = elem.tags || {};
      const name = (tags.name || tags['name:it'] || tags.brand || '').trim();

      if (!name || name.length < 2) {
        discardedCount++;
        continue;
      }

      // Se l'utente ha inserito una keyword specifica (es. "Fisiozone"), filtra per keyword se non corrisponde
      if (keyword && keyword.length > 2) {
        const normKeyword = normalizeTextForComparison(keyword);
        const normName = normalizeTextForComparison(name);
        const normTags = normalizeTextForComparison(JSON.stringify(tags));
        if (!normName.includes(normKeyword) && !normTags.includes(normKeyword)) {
          // Mantieni se c'è attinenza, altrimenti salta se query keyword esplicita
          // discardedCount++;
        }
      }

      const osmType: 'node' | 'way' | 'relation' = elem.type || 'node';
      const osmId: number = Number(elem.id);
      const providerPlaceId = `osm:${osmType}:${osmId}`;

      if (seenProviderIds.has(providerPlaceId)) {
        deduplicatedCount++;
        continue;
      }

      const lat = Number(elem.lat ?? elem.center?.lat ?? 0);
      const lon = Number(elem.lon ?? elem.center?.lon ?? 0);

      if (!lat || !lon) {
        discardedCount++;
        continue;
      }

      const distance = calculateDistanceMeters(geocodedCenter.lat, geocodedCenter.lon, lat, lon);

      const street = tags['addr:street'] || tags['contact:street'] || null;
      const houseNumber = tags['addr:housenumber'] || tags['contact:housenumber'] || null;
      const foundCity = tags['addr:city'] || tags['contact:city'] || city;
      const postcode = tags['addr:postcode'] || tags['contact:postcode'] || null;

      let formattedAddress: string | null = null;
      if (street) {
        formattedAddress = houseNumber ? `${street}, ${houseNumber}` : street;
      }

      const rawPhone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || tags['mobile'] || null;
      const cleanPhone = rawPhone ? rawPhone.trim() : null;

      let rawWebsite = tags.website || tags['contact:website'] || tags.url || tags['website:it'] || null;
      if (rawWebsite && !rawWebsite.startsWith('http://') && !rawWebsite.startsWith('https://')) {
        rawWebsite = `https://${rawWebsite}`;
      }

      const rawEmail = tags.email || tags['contact:email'] || null;
      const cleanEmail = rawEmail ? rawEmail.trim().toLowerCase() : null;

      const openingHours = tags.opening_hours || tags['contact:opening_hours'] || null;
      const facebook = tags['contact:facebook'] || tags.facebook || null;
      const instagram = tags['contact:instagram'] || tags.instagram || null;

      const catMatch = matchOsmTagsToCategory(tags);

      // E-commerce detection rapido da tag shop/website
      const isEcommerce = Boolean(catMatch.crmSector === 'ecommerce' || (rawWebsite && rawWebsite.includes('shop')));

      const normName = normalizeTextForComparison(name);
      const isDuplicate = deduplicatedPlaces.some((existing) => {
        const existingNormName = normalizeTextForComparison(existing.name);
        if (normName === existingNormName) {
          const distBetween = calculateDistanceMeters(lat, lon, existing.latitude, existing.longitude);
          if (distBetween < 80) return true;
          if (formattedAddress && existing.address) {
            if (normalizeTextForComparison(formattedAddress) === normalizeTextForComparison(existing.address)) {
              return true;
            }
          }
        }
        return false;
      });

      if (isDuplicate) {
        deduplicatedCount++;
        continue;
      }

      seenProviderIds.add(providerPlaceId);

      const normalizedPlace: NormalizedPlace = {
        provider: 'openstreetmap',
        providerPlaceId,
        osmType,
        osmId,
        name,
        categoryGroup: catMatch.categoryGroup,
        categoryLabel: catMatch.categoryLabel,
        subcategoryKey: catMatch.subcategoryKey,
        crmSector: catMatch.crmSector,
        address: formattedAddress,
        street,
        houseNumber,
        city: foundCity,
        postcode,
        phone: cleanPhone,
        website: rawWebsite,
        email: cleanEmail,
        openingHours,
        facebookUrl: facebook ? (facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`) : null,
        instagramUrl: instagram ? (instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram}`) : null,
        latitude: lat,
        longitude: lon,
        osmUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
        distanceMeters: distance,
        rating: null,
        reviewCount: null,
        sourceFetchedAt: new Date().toISOString(),
        isEcommerce,
        ecommercePlatform: isEcommerce ? 'Shopify / WooCommerce' : null,
        rawTags: tags,
      };

      deduplicatedPlaces.push(normalizedPlace);
    }

    // Processa e fondi i risultati del Local Web & Directory Scraper (es. Fisiozone, attività web)
    for (const webPlace of localWebPlaces) {
      const normWebName = normalizeTextForComparison(webPlace.name);
      
      // Controlla se è già presente da OSM
      const existingMatch = deduplicatedPlaces.find((p) => {
        const normP = normalizeTextForComparison(p.name);
        return normP === normWebName || (normP.length > 5 && normWebName.includes(normP)) || (normWebName.length > 5 && normP.includes(normWebName));
      });

      if (existingMatch) {
        // Arricchisci l'elemento esistente con dati mancanti estratti dal web
        if (!existingMatch.phone && webPlace.phone) existingMatch.phone = webPlace.phone;
        if (!existingMatch.website && webPlace.website) existingMatch.website = webPlace.website;
        if (!existingMatch.address && webPlace.address) existingMatch.address = webPlace.address;
        if (!existingMatch.facebookUrl && webPlace.facebookUrl) existingMatch.facebookUrl = webPlace.facebookUrl;
        if (!existingMatch.instagramUrl && webPlace.instagramUrl) existingMatch.instagramUrl = webPlace.instagramUrl;
        if (webPlace.isEcommerce) {
          existingMatch.isEcommerce = true;
          existingMatch.ecommercePlatform = webPlace.ecommercePlatform;
        }
        deduplicatedCount++;
      } else {
        // È una nuova attività scoperta dal web (come Fisiozone)!
        deduplicatedPlaces.push(webPlace);
      }
    }

    // Se c'è una parola chiave, porta in cima le corrispondenze dirette
    if (keyword) {
      const normKw = normalizeTextForComparison(keyword);
      deduplicatedPlaces.sort((a, b) => {
        const aMatches = normalizeTextForComparison(a.name).includes(normKw) ? 1 : 0;
        const bMatches = normalizeTextForComparison(b.name).includes(normKw) ? 1 : 0;
        if (bMatches !== aMatches) return bMatches - aMatches;
        return (a.distanceMeters || 0) - (b.distanceMeters || 0);
      });
    } else {
      deduplicatedPlaces.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }

    return {
      places: deduplicatedPlaces,
      count: deduplicatedPlaces.length,
      provider: this.name,
      debugInfo: {
        queryOverpass,
        geocodedCenter,
        executionTimeMs: Date.now() - startTime,
        rawPlacesCount,
        deduplicatedCount,
        discardedCount,
        cacheHit,
        activeEndpoint,
        webDirectoryPlacesCount: localWebPlaces.length,
      },
      success: true,
    };
  }

  private async fetchOverpassData(
    queryOverpass: string,
    geocodedCenter: { lat: number; lon: number },
    radiusMeters: number,
    subcatIds: string[]
  ): Promise<{ data: any[]; activeEndpoint: string; cacheHit: boolean }> {
    if (!queryOverpass) return { data: [], activeEndpoint: 'none', cacheHit: false };

    const cacheKey = `${geocodedCenter.lat}_${geocodedCenter.lon}_${radiusMeters}_${subcatIds.sort().join(',')}`;
    const cachedOverpass = OVERPASS_CACHE.get(cacheKey);
    if (cachedOverpass && Date.now() - cachedOverpass.timestamp < OVERPASS_TTL_MS) {
      return { data: cachedOverpass.data, activeEndpoint: 'cache', cacheHit: true };
    }

    let rawElements: any[] = [];
    let activeEndpoint = this.overpassEndpoints[0];

    for (const endpoint of this.overpassEndpoints) {
      try {
        activeEndpoint = endpoint;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(endpoint, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(queryOverpass),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.userAgent,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          rawElements = json.elements || [];
          OVERPASS_CACHE.set(cacheKey, { data: rawElements, timestamp: Date.now() });
          break;
        }
      } catch (err: any) {
        console.warn(`[Overpass] Fallback da ${endpoint}:`, err?.message);
      }
    }

    return { data: rawElements, activeEndpoint, cacheHit: false };
  }

  /**
   * Geocodifica una città italiana con Nominatim, applicando cache a 30 giorni e rate-limiting (1 req/sec)
   */
  async geocodeCity(city: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
    const cleanCity = city.trim().toLowerCase();
    const cacheKey = `geo_${cleanCity}`;

    const cached = NOMINATIM_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < NOMINATIM_TTL_MS) {
      return { lat: cached.lat, lon: cached.lon, displayName: cached.displayName };
    }

    await rateLimitNominatim();

    const url = new URL(`${this.nominatimUrl}/search`);
    url.searchParams.set('q', `${city}, Italia`);
    url.searchParams.set('countrycodes', 'it');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
          'Accept-Language': 'it,en;q=0.9',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        return null;
      }

      const data: any[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const item = data[0];
      const entry: GeocodeCacheEntry = {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name || city,
        timestamp: Date.now(),
      };

      NOMINATIM_CACHE.set(cacheKey, entry);
      return { lat: entry.lat, lon: entry.lon, displayName: entry.displayName };
    } catch (err) {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Provider Mock per test isolati
 */
export class MockTerritorialLeadProvider {
  name = 'Mock Territorial Provider (Test Locale)';

  async search(params: LeadGenSearchParams): Promise<LeadGenSearchResult> {
    const city = params.city || 'Milano';
    const startTime = Date.now();

    const mockPlaces: NormalizedPlace[] = [
      {
        provider: 'mock',
        providerPlaceId: 'osm:node:1010101',
        osmType: 'node',
        osmId: 1010101,
        name: `Trattoria del Centro ${city}`,
        categoryGroup: 'HORECA',
        categoryLabel: 'Trattoria / Osteria',
        subcategoryKey: 'ristoranti',
        crmSector: 'horeca_ristoranti',
        address: 'Via Roma, 12',
        street: 'Via Roma',
        houseNumber: '12',
        city,
        postcode: '80045',
        phone: '+39 081 8501234',
        website: `https://www.trattoriadelcentro-${city.toLowerCase()}.it`,
        email: `info@trattoriadelcentro-${city.toLowerCase()}.it`,
        openingHours: 'Mo-Sa 12:00-15:00, 19:30-23:30',
        facebookUrl: 'https://facebook.com/trattoriadelcentro',
        instagramUrl: 'https://instagram.com/trattoriadelcentro',
        latitude: 40.751,
        longitude: 14.488,
        osmUrl: 'https://www.openstreetmap.org/node/1010101',
        distanceMeters: 250,
        rating: null,
        reviewCount: null,
        sourceFetchedAt: new Date().toISOString(),
        isEcommerce: false,
        rawTags: { amenity: 'restaurant', cuisine: 'italian', name: `Trattoria del Centro ${city}` },
      },
      {
        provider: 'mock',
        providerPlaceId: 'osm:node:1010102',
        osmType: 'node',
        osmId: 1010102,
        name: `Pizzeria Vesuvio Antica`,
        categoryGroup: 'HORECA',
        categoryLabel: 'Pizzeria',
        subcategoryKey: 'pizzerie',
        crmSector: 'horeca_ristoranti',
        address: 'Corso Italia, 45',
        street: 'Corso Italia',
        houseNumber: '45',
        city,
        postcode: '80045',
        phone: '+39 081 8504321',
        website: `https://www.pizzeriavesuvio-${city.toLowerCase()}.it`,
        email: null,
        openingHours: 'Tu-Su 19:00-24:00',
        facebookUrl: null,
        instagramUrl: null,
        latitude: 40.753,
        longitude: 14.492,
        osmUrl: 'https://www.openstreetmap.org/node/1010102',
        distanceMeters: 480,
        rating: null,
        reviewCount: null,
        sourceFetchedAt: new Date().toISOString(),
        isEcommerce: false,
        rawTags: { amenity: 'pizzeria', name: 'Pizzeria Vesuvio Antica' },
      },
    ];

    return {
      places: mockPlaces,
      count: mockPlaces.length,
      provider: this.name,
      debugInfo: {
        queryOverpass: '// Query simulata in ambiente Mock',
        geocodedCenter: { lat: 40.75, lon: 14.49, displayName: `${city}, Italia` },
        executionTimeMs: Date.now() - startTime,
        rawPlacesCount: mockPlaces.length,
        deduplicatedCount: 0,
        discardedCount: 0,
        cacheHit: true,
        activeEndpoint: 'mock://local',
      },
      success: true,
    };
  }
}

/**
 * Factory per ottenere il provider di Lead Generation.
 */
export function getLeadScraperProvider(): OpenStreetMapTerritorialProvider | MockTerritorialLeadProvider {
  if (process.env.USE_MOCK_LEAD_GEN === 'true') {
    return new MockTerritorialLeadProvider();
  }
  return new OpenStreetMapTerritorialProvider();
}
