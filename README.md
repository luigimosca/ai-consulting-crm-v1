# AI Consulting CRM & Marketing Platform (v1)

Piattaforma web completa costruita in **Next.js 15 (App Router, TypeScript)** per un'agenzia di consulenza AI specializzata in soluzioni per:
- **Studi Professionali** (Avvocati, Commercialisti, Notai, Consulenti)
- **HORECA** (Ristoranti, Pizzerie, Bar, Pasticcerie, Hotel, B&B)
- **E-commerce & Retail Digitale**
- **Strutture Turistiche & Servizi Locali**

---

## 🌟 Funzionalità Principali

### 1. Sito Pubblico & Lead Generation
- **Home Page ad Alta Conversione**: Hero interattivo, panoramica servizi AI e indicatori di impatto (ROI, tempo risparmiato, azzeramento no-show).
- **Pagine Verticali per Settore** (`/settori/[sector]`):
  - `/settori/ristoranti-horeca`
  - `/settori/studi-legali-commercialisti`
  - `/settori/ecommerce`
  - `/settori/strutture-turistiche`
- **Widget Chatbot AI Real-time con Google Gemini**:
  - Alimentato da **Google Gemini API** (`gemini-1.5-flash` / `gemini-2.0-flash`) con prompt vendite verticali in italiano.
  - Guida la qualifica del visitatore in 5-7 messaggi (settore, dimensione, problema principale, contatti).
  - Salva tutti i messaggi scambiati nella tabella `chat_messages` collegata alla sessione e al lead.
  - Crea/aggiorna automaticamente il record `Lead` e la `DemoRequest` nel CRM appena vengono forniti i contatti.
  - Fallback mock automatico integrato se la chiave API non è presente o se `USE_MOCK_CHATBOT=true`.
- **Pagina Prenotazione Demo** (`/demo`): Form interattivo per richiedere demo personalizzata 1-to-1.

### 2. Lead Generation Territoriale da Dati Aperti (`/crm/lead-gen`)
- **100% Dati Aperti & Zero Costi API**: Alimentato esclusivamente da **OpenStreetMap (Nominatim per geocodifica + Overpass API con licenza ODbL)**.
- **Nessuna API Commerciale a Pagamento**: Nessun utilizzo di Google Places API, SerpAPI, Outscraper o Apify.
- **Integrità Assoluta dei Dati**: Nessun rating o numero di recensioni inventato (`rating === null`, `reviewCount === null`).
- **Sottocategorie Granulari**: Selezione multipla per Ristoranti, Pizzerie, Bar, Hotel, B&B, Studi Legali, Commercialisti, Retail e Servizi.
- **Filtri Rapidi Istantanei**: Solo con Telefono, Solo con Sito Web, Solo con Email, Solo con Orari.
- **Pannello Diagnostica & Debug**: Visualizzazione query Overpass QL, coordinate centro, tempo di risposta e contatore POI.

### 3. Sistema Reale di Lead Enrichment (`/crm/enrichment` & `/crm/enrichment/[leadId]`)
Pipeline modulare a **6 Adapter operativi** per l'audit approfondito dei prospect:
1. **OSMEnrichmentAdapter**: Estrazione coordinate geografiche, orari, indirizzo e link OpenStreetMap.
2. **WebsiteAnalyzerAdapter**: Scansione sicura del sito web con **protezione SSRF** (blocco reti locali/private), timeout di 8s, rilevamento CMS (WordPress, Shopify, PrestaShop, Wix, Webflow), e-commerce, chatbot (Tidio, Crisp, Intercom), widget WhatsApp, booking (TheFork, OpenTable, Calendly), form contatti, analytics (GA4, GTM), Meta Pixel, multilingua e scansione subpage controllata (`/contatti`, `/chi-siamo`, `/menu`, `/lavora-con-noi`).
3. **PublicCompanyDataAdapter**: Validazione Partita IVA italiana (11 cifre con checksum formale), forma giuridica, codice ATECO e stima benchmark per range economici trasparenti.
4. **PublicDirectoryAdapter**: Riferimenti a directory istituzionali e albi professionali (CNF, CNDCEC, Registro Imprese).
5. **ReviewSignalAdapter**: Rilevamento segnali pubblici reali senza rating inventati.
6. **GrowthSignalAdapter**: Analisi segnali di crescita osservabili (pagina lavora con noi, aggiornamento recente del copyright, nuove sedi).
- **Dossier a 9 Sezioni** con badge chiari: `Verificato Ufficiale`, `Stimato (Range)`, `Non disponibile`, `Da verificare`.
- **Doppio Punteggio**: Calcolo separato di **Commercial Opportunity Score** (0–100) e **Data Reliability Score** (0–100).
- **Enrichment Massivo in Batch**: Supporto arricchimento rapido per liste di lead.

### 4. CRM & Outreach AI (`/crm/leads`)
- **Autenticazione con Ruoli**: Sessioni JWT sicure in cookie `httpOnly` con ruoli `admin` e `operator`.
- **Generatore Outreach AI**: Crea copy personalizzati per Email, WhatsApp e Script telefonico in 1 click.
- **Deduplicazione Automatica**: Prevenzione automatica di lead duplicati per nome azienda e città.

---

## 📂 Struttura del Repository

```
ai-consulting-crm-v1/
├── apps/
│   └── web/                               # Next.js 15 App Router
│       ├── src/
│       │   ├── app/
│       │   │   ├── (public)/              # Marketing & verticali
│       │   │   ├── (auth)/login/          # Login con quick fill demo
│       │   │   ├── crm/                   # Dashboard, Leads, Lead Gen Territoriale, Enrichment
│       │   │   │   ├── lead-gen/          # Motore territoriale OSM
│       │   │   │   ├── enrichment/        # Hub arricchimento & dossier lead
│       │   │   │   └── leads/             # Pipeline e scheda 360°
│       │   │   ├── api/                   # Auth, Leads, Lead-Gen, Enrichment (run/get/bulk), Demo
│       │   │   └── layout.tsx
│       │   ├── components/
│       │   │   ├── public/                # Navbar, Footer, Hero, ChatbotWidget, SectorCard
│       │   │   ├── crm/                   # Sidebar, Header, LeadTable, ScoreBadge, EnrichmentDossierView
│       │   │   └── ui/                    # Button, Input, Card, Badge, Dialog, Select
│       │   ├── lib/                       # auth.ts, utils.ts
│       │   └── middleware.ts              # Protezione rotte /crm
├── packages/
│   ├── db/                                # Drizzle ORM Schema & SQLite/Postgres Client (7 tabelle enrichment)
│   └── ai/                                # Agenti AI (Chatbot Gemini, OSM Lead Gen, Enrichment Engine, Scoring)
│       └── src/
│           ├── enrichment/                # 6 Adapter, Website Analyzer, SSRF Security, Scoring
│           ├── lead-gen-categories.ts     # Tassonomia e clausole Overpass QL
│           └── lead-gen.ts                # Provider territoriale OSM con cache
├── scripts/
│   ├── seed.ts                            # Script di popolamento database
│   ├── test-pipeline.ts                   # Test automatico di tutti i moduli
│   └── test-enrichment-pipeline.ts        # Test suite per enrichment, SSRF e integrità dati
├── .env.example
└── README.md
```

---

## 🚀 Avvio Rapido in Locale

### 1. Installazione dipendenze
```bash
npm install
```

### 2. Configurazione Ambiente (.env.local)
Copia `.env.example` in `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Popolamento Database Demo (Seed)
```bash
npm run seed
```

### 4. Avvio Server di Sviluppo
```bash
npm run dev
```
La piattaforma sarà accessibile su **http://localhost:3005**.

---

## 🧪 Esecuzione dei Test Automatici

Per verificare l'intera pipeline (Database, Chatbot LLM, Lead Gen Territoriale OpenStreetMap, Enrichment a 6 Adapter, Sicurezza SSRF e JWT):
```bash
npm run test:pipeline
```

Per eseguire la build di produzione:
```bash
npm run build
```

---

## 🔑 Credenziali Demo Preconfigurate

- **Admin**: `admin@ai-agency.it` / `admin123`
- **Operatore**: `operator@ai-agency.it` / `operator123`
