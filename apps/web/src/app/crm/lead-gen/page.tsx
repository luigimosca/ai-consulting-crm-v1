'use client';

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/crm/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { LEAD_GEN_SECTORS, type NormalizedPlace } from '@ai-crm/ai';
import {
  Search,
  MapPin,
  Globe,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  Layers,
  Download,
  CheckCircle2,
  AlertTriangle,
  Server,
  Code,
  ChevronDown,
  ChevronUp,
  Filter,
  Sparkles,
  Building2,
  Utensils,
  Hotel,
  Scale,
  Calculator,
  ShoppingBag,
  Info,
  Compass,
  CheckSquare,
  Square,
  Facebook,
  Instagram,
  RefreshCw,
} from 'lucide-react';

export default function LeadGenPage() {
  const [selectedSectorId, setSelectedSectorId] = useState<string>('horeca_ristorazione');
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([
    'ristoranti',
    'pizzerie',
    'bar_caffe',
  ]);
  const [city, setCity] = useState('Pompei');
  const [radiusKm, setRadiusKm] = useState('5');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<NormalizedPlace[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [activeProvider, setActiveProvider] = useState<string>('OpenStreetMap / Overpass API (Dati Aperti ODbL)');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Filtri rapidi client-side
  const [filterPhoneOnly, setFilterPhoneOnly] = useState(false);
  const [filterWebsiteOnly, setFilterWebsiteOnly] = useState(false);
  const [filterEmailOnly, setFilterEmailOnly] = useState(false);
  const [filterHoursOnly, setFilterHoursOnly] = useState(false);

  // Mappa dei lead importati
  const [importedMap, setImportedMap] = useState<Record<string, boolean>>({});
  const [isImportingAll, setIsImportingAll] = useState(false);

  // Settore attualmente selezionato
  const activeSector = useMemo(() => {
    return LEAD_GEN_SECTORS.find((s) => s.id === selectedSectorId) || LEAD_GEN_SECTORS[0];
  }, [selectedSectorId]);

  // Gestione cambio settore
  const handleSectorChange = (newSectorId: string) => {
    setSelectedSectorId(newSectorId);
    const sec = LEAD_GEN_SECTORS.find((s) => s.id === newSectorId);
    if (sec) {
      setSelectedSubcategories(sec.subcategories.map((sc) => sc.id));
    }
  };

  // Toggle singola sottocategoria
  const toggleSubcategory = (subcatId: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(subcatId) ? prev.filter((id) => id !== subcatId) : [...prev, subcatId]
    );
  };

  // Seleziona tutte le sottocategorie del settore attivo
  const selectAllSubcategories = () => {
    if (activeSector) {
      setSelectedSubcategories(activeSector.subcategories.map((sc) => sc.id));
    }
  };

  // Deseleziona tutte le sottocategorie
  const deselectAllSubcategories = () => {
    setSelectedSubcategories([]);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;

    if (selectedSubcategories.length === 0) {
      setErrorMessage('Seleziona almeno una tipologia / sottocategoria per avviare la ricerca.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/lead-gen/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectorId: selectedSectorId,
          subcategories: selectedSubcategories,
          city: city.trim(),
          radiusKm: Number(radiusKm),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Errore nella ricerca geospaziale');
      }

      setResults(data.places || data.results || []);
      setDebugInfo(data.debugInfo || null);
      if (data.provider) setActiveProvider(data.provider);
    } catch (err: any) {
      console.error('Lead search failed:', err);
      setErrorMessage(err.message || 'Impossibile completare la ricerca territoriale');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportLead = async (place: NormalizedPlace) => {
    try {
      const notesParts = [
        `Lead territoriale OpenStreetMap (${place.categoryLabel})`,
        place.osmUrl ? `OSM: ${place.osmUrl}` : null,
        place.openingHours ? `Orari: ${place.openingHours}` : null,
        place.email ? `Email: ${place.email}` : null,
      ].filter(Boolean);

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: place.name,
          website: place.website,
          source: 'maps',
          sector: place.crmSector,
          address: place.address,
          city: place.city || city,
          phone: place.phone,
          email: place.email,
          notes: notesParts.join(' | '),
        }),
      });

      if (res.ok) {
        setImportedMap((prev) => ({ ...prev, [place.providerPlaceId]: true }));
      }
    } catch (err) {
      console.error('Failed to import lead:', err);
    }
  };

  const handleImportAll = async () => {
    setIsImportingAll(true);
    for (const item of filteredResults) {
      if (!importedMap[item.providerPlaceId]) {
        await handleImportLead(item);
      }
    }
    setIsImportingAll(false);
  };

  // Risultati filtrati in base ai toggle veloci
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      if (filterPhoneOnly && !item.phone) return false;
      if (filterWebsiteOnly && !item.website) return false;
      if (filterEmailOnly && !item.email) return false;
      if (filterHoursOnly && !item.openingHours) return false;
      return true;
    });
  }, [results, filterPhoneOnly, filterWebsiteOnly, filterEmailOnly, filterHoursOnly]);

  return (
    <div className="space-y-8 pb-20">
      <Header
        title="Lead Generation Territoriale da Dati Aperti"
        description="Estrai e qualifica attività reali sul territorio interrogando i dati aperti geospaziali di OpenStreetMap & Overpass API. Nessuna stima o recensione inventata."
      />

      {/* Provider Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 px-4 py-3 rounded-xl text-xs text-slate-300 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Motore Geospaziale Open Data:</span>
              <span className="text-emerald-400 font-medium">OpenStreetMap &bull; Overpass API &bull; Nominatim</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              100% Dati Aperti Reali del Territorio &bull; Zero API a Pagamento &bull; Licenza ODbL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Pronto all&apos;uso (Nessuna API Key richiesta)</span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <div>
            <p className="font-semibold text-rose-200">Attenzione</p>
            <p className="text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form di Ricerca Territoriale */}
      <Card className="bg-slate-900/90 border-slate-800 p-6 shadow-xl space-y-6">
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Riga 1: Settore Principale, Città e Raggio */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Settore di Riferimento *
              </label>
              <Select
                value={selectedSectorId}
                onChange={(e) => handleSectorChange(e.target.value)}
                options={LEAD_GEN_SECTORS.map((s) => ({
                  label: s.label,
                  value: s.id,
                }))}
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Città o Comune *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Es. Pompei, Milano, Roma, Napoli..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Raggio dal Centro
              </label>
              <Select
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                options={[
                  { label: '2 km (Centro Storico)', value: '2' },
                  { label: '5 km (Zona Urbana)', value: '5' },
                  { label: '10 km (Comune & Dintorni)', value: '10' },
                  { label: '25 km (Area Metropolitana)', value: '25' },
                  { label: '50 km (Intera Provincia)', value: '50' },
                ]}
              />
            </div>
          </div>

          {/* Riga 2: Selezione Sottocategorie / Tipologie POI */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  Tipologie di Attività ({activeSector.label}):
                </span>
                <span className="text-[11px] text-slate-400">
                  ({selectedSubcategories.length} di {activeSector.subcategories.length} selezionate)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllSubcategories}
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                >
                  Seleziona tutte
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={deselectAllSubcategories}
                  className="text-xs text-slate-400 hover:text-slate-300 underline"
                >
                  Deseleziona
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeSector.subcategories.map((subcat) => {
                const isSelected = selectedSubcategories.includes(subcat.id);
                return (
                  <button
                    key={subcat.id}
                    type="button"
                    onClick={() => toggleSubcategory(subcat.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-600/60 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {subcat.label}
                      </div>
                      {subcat.description && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {subcat.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pulsante di Invio Ricerca */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-blue-400 shrink-0" />
              <span>
                Verranno estratti solo i POI con denominazione reale registrati nel database aperto.
              </span>
            </div>

            <Button
              type="submit"
              variant="glow"
              size="md"
              isLoading={isLoading}
              className="gap-2 px-6"
            >
              <Search className="h-4 w-4" />
              <span>Avvia Ricerca Territoriale</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Sezione Risultati */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Header Risultati & Filtri Rapidi */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-400" />
                  Attività Individuate ({filteredResults.length} di {results.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Località: <span className="text-slate-200 font-medium">{city}</span> (raggio {radiusKm} km) &bull; Fonte: <span className="text-blue-300 font-mono">OpenStreetMap / Overpass API</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleImportAll}
                  isLoading={isImportingAll}
                  className="gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Importa Tutti ({filteredResults.length})</span>
                </Button>
              </div>
            </div>

            {/* Toolbar Filtri Rapidi Client-Side */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-400 flex items-center gap-1 font-medium mr-1">
                <Filter className="h-3.5 w-3.5 text-blue-400" /> Filtri Rapidi:
              </span>

              <button
                type="button"
                onClick={() => setFilterPhoneOnly(!filterPhoneOnly)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterPhoneOnly
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Phone className="h-3 w-3" />
                <span>Solo con Telefono</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterWebsiteOnly(!filterWebsiteOnly)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterWebsiteOnly
                    ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="h-3 w-3" />
                <span>Solo con Sito Web</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterEmailOnly(!filterEmailOnly)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterEmailOnly
                    ? 'bg-blue-950/60 border-blue-500 text-blue-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="h-3 w-3" />
                <span>Solo con Email</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterHoursOnly(!filterHoursOnly)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterHoursOnly
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="h-3 w-3" />
                <span>Solo con Orari</span>
              </button>
            </div>
          </div>

          {/* Griglia Card Attività Reali */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResults.map((place) => {
              const isImported = importedMap[place.providerPlaceId];
              return (
                <Card
                  key={place.providerPlaceId}
                  className="bg-slate-900/80 border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors group shadow-sm"
                >
                  <div className="p-4 space-y-3.5">
                    {/* Header Card: Categoria & Distanza */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-[10px] font-medium bg-blue-950/60 border-blue-800 text-blue-300">
                          {place.categoryLabel}
                        </Badge>
                        <h3 className="text-base font-bold text-white leading-tight">
                          {place.name}
                        </h3>
                      </div>

                      {typeof place.distanceMeters === 'number' && (
                        <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                          {place.distanceMeters < 1000
                            ? `${place.distanceMeters} m`
                            : `${(place.distanceMeters / 1000).toFixed(1)} km`}
                        </div>
                      )}
                    </div>

                    {/* Dati Reali di Contatto */}
                    <div className="space-y-2 text-xs">
                      {/* Indirizzo */}
                      <div className="flex items-start gap-2 text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <span>
                          {place.address || (
                            <span className="text-slate-500 italic">Indirizzo non censito in OSM</span>
                          )}
                          {place.city && <span className="text-slate-400"> ({place.city})</span>}
                        </span>
                      </div>

                      {/* Telefono */}
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        {place.phone ? (
                          <a
                            href={`tel:${place.phone}`}
                            className="text-emerald-400 hover:underline font-medium"
                          >
                            {place.phone}
                          </a>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Telefono non censito</span>
                        )}
                      </div>

                      {/* Sito Web */}
                      <div className="flex items-center gap-2 truncate">
                        <Globe className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        {place.website ? (
                          <a
                            href={place.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-300 hover:underline truncate flex items-center gap-1 font-medium"
                          >
                            <span>{place.website.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Sito web non registrato</span>
                        )}
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        {place.email ? (
                          <a
                            href={`mailto:${place.email}`}
                            className="text-blue-300 hover:underline truncate font-medium"
                          >
                            {place.email}
                          </a>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Email non censita</span>
                        )}
                      </div>

                      {/* Orari di Apertura */}
                      {place.openingHours && (
                        <div className="flex items-start gap-2 text-slate-400 text-[11px] pt-1">
                          <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="truncate">{place.openingHours}</span>
                        </div>
                      )}

                      {/* Social Links */}
                      {(place.facebookUrl || place.instagramUrl) && (
                        <div className="flex items-center gap-3 pt-1 text-[11px]">
                          {place.facebookUrl && (
                            <a
                              href={place.facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Facebook className="h-3 w-3" />
                              <span>Facebook</span>
                            </a>
                          )}
                          {place.instagramUrl && (
                            <a
                              href={place.instagramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pink-400 hover:underline flex items-center gap-1"
                            >
                              <Instagram className="h-3 w-3" />
                              <span>Instagram</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Card */}
                  <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
                    <a
                      href={place.osmUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-slate-200 font-mono flex items-center gap-1"
                      title="Vedi su OpenStreetMap"
                    >
                      <span>OSM #{place.osmId}</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>

                    {isImported ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Importato nel CRM
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleImportLead(place)}
                        className="text-xs gap-1.5 py-1"
                      >
                        <Download className="h-3 w-3" />
                        <span>Importa in CRM</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredResults.length === 0 && results.length > 0 && (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-xl">
              <Filter className="h-8 w-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">Nessun risultato con i filtri selezionati</p>
              <p className="text-xs text-slate-500 mt-1">
                Prova a disattivare uno dei filtri rapidi per visualizzare le {results.length} attività trovate.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pannello Diagnostica & Debug (Collassabile) */}
      {debugInfo && (
        <Card className="bg-slate-900/60 border-slate-800 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold text-slate-200">
                Diagnostica & Query Overpass API
              </span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {debugInfo.executionTimeMs} ms
              </Badge>
            </div>
            <div className="text-slate-400">
              {showDebug ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {showDebug && (
            <div className="p-4 pt-0 border-t border-slate-800/80 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-400 text-[10px]">POI Grezzi OSM</div>
                  <div className="text-white font-bold text-sm mt-0.5">{debugInfo.rawPlacesCount}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Deduplicati</div>
                  <div className="text-emerald-400 font-bold text-sm mt-0.5">{debugInfo.deduplicatedCount}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Scartati (Senza Nome)</div>
                  <div className="text-amber-400 font-bold text-sm mt-0.5">{debugInfo.discardedCount}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Cache Hit</div>
                  <div className="text-blue-400 font-bold text-sm mt-0.5">{debugInfo.cacheHit ? 'Sì (24h TTL)' : 'No (Live)'}</div>
                </div>
              </div>

              {debugInfo.geocodedCenter && (
                <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1 text-slate-300">
                  <div className="text-slate-400 text-[11px] font-sans font-semibold">Centro Geocodificato (Nominatim):</div>
                  <div className="text-slate-200">{debugInfo.geocodedCenter.displayName}</div>
                  <div className="text-blue-400 text-[11px]">
                    Lat: {debugInfo.geocodedCenter.lat} &bull; Lon: {debugInfo.geocodedCenter.lon}
                  </div>
                </div>
              )}

              {debugInfo.queryOverpass && (
                <div className="space-y-1.5">
                  <div className="text-slate-400 text-[11px] font-sans font-semibold">Query Overpass QL Eseguita:</div>
                  <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
                    {debugInfo.queryOverpass}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Attribuzione Obbligatoria OpenStreetMap ODbL */}
      <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-800">
        <p>
          Dati cartografici e POI forniti da{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-200 underline font-medium"
          >
            &copy; OpenStreetMap contributors
          </a>
          , rilasciati sotto licenza{' '}
          <a
            href="https://opendatacommons.org/licenses/odbl/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-200 underline font-medium"
          >
            ODbL (Open Database License)
          </a>
          .
        </p>
      </div>
    </div>
  );
}
