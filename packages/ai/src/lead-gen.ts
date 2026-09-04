import {
  LEAD_GEN_SECTORS,
  buildOverpassClauses,
  matchOsmTagsToCategory,
  getSectorById,
} from './lead-gen-categories';

export interface NormalizedPlace {
  provider: 'openstreetmap' | 'mock';
  providerPlaceId: string; // "osm:node:12345"
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
  rawTags: Record<string, string>;
}

export interface LeadGenSearchParams {
  city: string;
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
 * Provider OpenStreetMap Territoriale (Nominatim + Overpass API)
 */
export class OpenStreetMapTerritorialProvider {
  name = 'OpenStreetMap / Overpass API (Dati Aperti ODbL)';

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

    // 1. Risolvi sottocategorie target
    let subcatIds: string[] = params.subcategories || [];
    if (subcatIds.length === 0) {
      if (params.sectorId) {
        const sec = getSectorById(params.sectorId);
        if (sec) {
          subcatIds = sec.subcategories.map((sc) => sc.id);
        }
      } else if (params.niche) {
        // Mappa da vecchio formato o testo
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
          subcatIds = ['architetti_ingegneri', 'agenzie_immobiliari', 'estetica_benessere'];
        }
      } else {
        // Default a HORECA ristorazione
        subcatIds = ['ristoranti', 'pizzerie', 'bar_caffe'];
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

    // 3. Costruzione Query Overpass QL
    const clauses = buildOverpassClauses(subcatIds, radiusMeters, geocodedCenter.lat, geocodedCenter.lon);
    if (!clauses || clauses.trim() === '') {
      return {
        places: [],
        count: 0,
        provider: this.name,
        debugInfo: {
          queryOverpass: '',
          geocodedCenter,
          executionTimeMs: Date.now() - startTime,
          rawPlacesCount: 0,
          deduplicatedCount: 0,
          discardedCount: 0,
          cacheHit: false,
          activeEndpoint: 'none',
        },
        success: false,
        error: 'Nessun tag OSM configurato per le sottocategorie selezionate.',
      };
    }

    const queryOverpass = `[out:json][timeout:25];
(
  ${clauses}
);
out center tags;`;

    // 4. Esecuzione Query Overpass con Cache e Mirrors
    let rawElements: any[] = [];
    let activeEndpoint = this.overpassEndpoints[0];
    let cacheHit = false;

    const cacheKey = `${geocodedCenter.lat}_${geocodedCenter.lon}_${radiusMeters}_${subcatIds.sort().join(',')}`;
    const cachedOverpass = OVERPASS_CACHE.get(cacheKey);
    if (cachedOverpass && Date.now() - cachedOverpass.timestamp < OVERPASS_TTL_MS) {
      rawElements = cachedOverpass.data;
      cacheHit = true;
    } else {
      let fetchSuccess = false;
      let lastError: Error | null = null;

      for (const endpoint of this.overpassEndpoints) {
        try {
          activeEndpoint = endpoint;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);

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

          if (!response.ok) {
            throw new Error(`Overpass HTTP ${response.status}: ${response.statusText}`);
          }

          const json = await response.json();
          rawElements = json.elements || [];
          fetchSuccess = true;
          OVERPASS_CACHE.set(cacheKey, { data: rawElements, timestamp: Date.now() });
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[OpenStreetMapLeadGen] Endpoint ${endpoint} non riuscito:`, err.message);
        }
      }

      if (!fetchSuccess && rawElements.length === 0) {
        return {
          places: [],
          count: 0,
          provider: this.name,
          debugInfo: {
            queryOverpass,
            geocodedCenter,
            executionTimeMs: Date.now() - startTime,
            rawPlacesCount: 0,
            deduplicatedCount: 0,
            discardedCount: 0,
            cacheHit: false,
            activeEndpoint,
          },
          success: false,
          error: `Errore nella comunicazione con i server Overpass API: ${lastError?.message || 'Timeout'}. Riprova tra qualche secondo.`,
        };
      }
    }

    // 5. Normalizzazione, Pulizia, Filtro e Deduplicazione a 3 Livelli
    const rawPlacesCount = rawElements.length;
    let discardedCount = 0;
    let deduplicatedCount = 0;

    const seenProviderIds = new Set<string>();
    const deduplicatedPlaces: NormalizedPlace[] = [];

    for (const elem of rawElements) {
      const tags: Record<string, string> = elem.tags || {};
      const name = (tags.name || tags['name:it'] || tags.brand || '').trim();

      // Scarta elementi senza nome valido (es. panchine, edifici anonimi)
      if (!name || name.length < 2) {
        discardedCount++;
        continue;
      }

      const osmType: 'node' | 'way' | 'relation' = elem.type || 'node';
      const osmId: number = Number(elem.id);
      const providerPlaceId = `osm:${osmType}:${osmId}`;

      // Deduplica Livello 1: ID univoco OSM
      if (seenProviderIds.has(providerPlaceId)) {
        deduplicatedCount++;
        continue;
      }

      // Coordinate
      const lat = Number(elem.lat ?? elem.center?.lat ?? 0);
      const lon = Number(elem.lon ?? elem.center?.lon ?? 0);

      if (!lat || !lon) {
        discardedCount++;
        continue;
      }

      const distance = calculateDistanceMeters(geocodedCenter.lat, geocodedCenter.lon, lat, lon);

      // Normalizzazione indirizzo
      const street = tags['addr:street'] || tags['contact:street'] || null;
      const houseNumber = tags['addr:housenumber'] || tags['contact:housenumber'] || null;
      const foundCity = tags['addr:city'] || tags['contact:city'] || city;
      const postcode = tags['addr:postcode'] || tags['contact:postcode'] || null;

      let formattedAddress: string | null = null;
      if (street) {
        formattedAddress = houseNumber ? `${street}, ${houseNumber}` : street;
      }

      // Normalizzazione contatti
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

      // Categoria e Settore CRM
      const catMatch = matchOsmTagsToCategory(tags);

      // Deduplica Livello 2 e 3: Nome simile + coordinate vicine (< 60m) o Stesso Nome + Indirizzo
      const normName = normalizeTextForComparison(name);
      const isDuplicate = deduplicatedPlaces.some((existing) => {
        const existingNormName = normalizeTextForComparison(existing.name);
        if (normName === existingNormName) {
          // Se i nomi sono identici e sono a meno di 70m l'uno dall'altro
          const distBetween = calculateDistanceMeters(lat, lon, existing.latitude, existing.longitude);
          if (distBetween < 70) return true;

          // Oppure se hanno lo stesso indirizzo normalizzato
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
        rawTags: tags,
      };

      deduplicatedPlaces.push(normalizedPlace);
    }

    // Ordina i risultati per distanza dal centro
    deduplicatedPlaces.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));

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
      },
      success: true,
    };
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
        console.warn(`[Nominatim] Errore risposta HTTP ${res.status}`);
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
      console.warn(`[Nominatim] Errore geocodifica città "${city}":`, err);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Provider Mock ad alta fedeltà per test offline / isolati (attivato SOLO se USE_MOCK_LEAD_GEN=true)
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
 * Se USE_MOCK_LEAD_GEN=true restituisce il mock, altrimenti SEMPRE OpenStreetMapTerritorialProvider
 */
export function getLeadScraperProvider(): OpenStreetMapTerritorialProvider | MockTerritorialLeadProvider {
  if (process.env.USE_MOCK_LEAD_GEN === 'true') {
    return new MockTerritorialLeadProvider();
  }
  return new OpenStreetMapTerritorialProvider();
}
