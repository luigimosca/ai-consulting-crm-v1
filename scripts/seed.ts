import { db, users, leads, companies, demoRequests, enrichmentData, initDatabase } from '../packages/db/src';
import bcrypt from 'bcryptjs';
import { calculateScore, analyzeDomain } from '../packages/ai/src';

async function seed() {
  console.log('🌱 Avvio seeding database AI Agency CRM...');

  initDatabase();

  // 1. Clear existing demo records
  db.delete(users).run();
  db.delete(leads).run();
  db.delete(companies).run();
  db.delete(demoRequests).run();
  db.delete(enrichmentData).run();

  const now = new Date().toISOString();

  // 2. Create Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const operatorPasswordHash = await bcrypt.hash('operator123', 10);

  db.insert(users).values([
    {
      id: 'usr_admin',
      name: 'Luigi Admin',
      email: 'admin@ai-agency.it',
      passwordHash: adminPasswordHash,
      role: 'admin',
      avatar: null,
      createdAt: now,
    },
    {
      id: 'usr_operator',
      name: 'Giulia Consulente',
      email: 'operatore@ai-agency.it',
      passwordHash: operatorPasswordHash,
      role: 'operator',
      avatar: null,
      createdAt: now,
    },
  ]).run();

  console.log('✅ Utenti creati (admin@ai-agency.it / admin123, operatore@ai-agency.it / operator123)');

  // 3. Create Seed Leads
  const seedLeadsData = [
    {
      id: 'lead_1',
      companyName: 'Ristorante Il Bolognese Milano',
      website: 'www.ilbolognesemilano.it',
      source: 'sito' as const,
      sector: 'horeca_ristoranti' as const,
      phone: '+39 02 87654321',
      email: 'prenotazioni@ilbolognesemilano.it',
      address: 'Via Montenapoleone, 14',
      city: 'Milano',
      status: 'qualificato' as const,
      notes: 'Richiesta ricevuta via Chatbot. Hanno perso oltre 30 prenotazioni lo scorso weekend durante il servizio.',
    },
    {
      id: 'lead_2',
      companyName: 'Studio Legale Associato Bianchi & Partners',
      website: 'www.studiobianchilex.it',
      source: 'sito' as const,
      sector: 'studi_legali' as const,
      phone: '+39 06 69876543',
      email: 'segreteria@studiobianchilex.it',
      address: 'Piazza Cavour, 8',
      city: 'Roma',
      status: 'in_contatto' as const,
      notes: 'Interessati al sistema RAG documentale per interrogare oltre 4.000 sentenze e pratiche interne.',
    },
    {
      id: 'lead_3',
      companyName: 'Studio Commercialisti De Luca & Associati',
      website: 'www.studiodelucafiscale.it',
      source: 'referral' as const,
      sector: 'commercialisti' as const,
      phone: '+39 081 5543210',
      email: 'info@studiodelucafiscale.it',
      address: 'Corso Umberto I, 45',
      city: 'Napoli',
      status: 'arricchito' as const,
      notes: 'Hanno 15 dipendenti. Vogliono automatizzare la prima risposta e il sollecito documenti fiscali.',
    },
    {
      id: 'lead_4',
      companyName: 'Grand Hotel & Resort Villa Miramare',
      website: 'www.hotelvillamiramare.it',
      source: 'maps' as const,
      sector: 'horeca_hotel' as const,
      phone: '+39 089 876500',
      email: 'reception@hotelvillamiramare.it',
      address: 'Via Panoramica, 22',
      city: 'Sorrento',
      status: 'nuovo' as const,
      notes: 'Acquisito da Google Maps (Rating 4.8, 380 recensioni). Nessun concierge WhatsApp presente sul sito.',
    },
    {
      id: 'lead_5',
      companyName: 'GustoBio Italia E-commerce',
      website: 'www.gustobio-shop.it',
      source: 'sito' as const,
      sector: 'ecommerce' as const,
      phone: '+39 055 432198',
      email: 'support@gustobio-shop.it',
      address: 'Via de Calzaiuoli, 12',
      city: 'Firenze',
      status: 'convertito' as const,
      notes: 'Contratto firmato per AI Shopping Assistant + Recupero carrelli WhatsApp.',
    },
    {
      id: 'lead_6',
      companyName: 'Osteria Antica Trattoria del Mare',
      website: 'www.anticatrattoriadelmare.it',
      source: 'maps' as const,
      sector: 'horeca_ristoranti' as const,
      phone: '+39 010 2468135',
      email: 'info@anticatrattoriadelmare.it',
      address: 'Calata Porto Antico, 4',
      city: 'Genova',
      status: 'nuovo' as const,
      notes: 'Google Rating 4.4 con 190 recensioni. Necessitano di reminder WhatsApp per azzerare i no-show.',
    },
    {
      id: 'lead_7',
      companyName: 'Studio Notarile Conti & Associati',
      website: 'www.notaioconti.it',
      source: 'referral' as const,
      sector: 'studi_legali' as const,
      phone: '+39 011 556677',
      email: 'contatto@notaioconti.it',
      address: 'Via Roma, 102',
      city: 'Torino',
      status: 'qualificato' as const,
      notes: 'Valutazione demo fissata per venerdì ore 11:00.',
    },
    {
      id: 'lead_8',
      companyName: 'Boutique Hotel Canal Grande',
      website: 'www.hotelcanalgrande-venice.it',
      source: 'maps' as const,
      sector: 'horeca_hotel' as const,
      phone: '+39 041 5200300',
      email: 'concierge@hotelcanalgrande-venice.it',
      address: 'Fondamenta Santa Lucia, 18',
      city: 'Venezia',
      status: 'arricchito' as const,
      notes: 'Richiesta di concierge multilingua 24/7 per turisti americani e asiatici.',
    },
    {
      id: 'lead_9',
      companyName: 'Studio Fiscale Dott.ssa Colombo',
      website: 'www.studiocolombo-tributario.it',
      source: 'sito' as const,
      sector: 'commercialisti' as const,
      phone: '+39 051 643210',
      email: 'elena@studiocolombo-tributario.it',
      address: 'Via Indipendenza, 55',
      city: 'Bologna',
      status: 'in_contatto' as const,
      notes: 'Interessata all estrazione automatica di fatture elettroniche con AI.',
    },
    {
      id: 'lead_10',
      companyName: 'ModaMilano Exclusive Store',
      website: 'www.modamilano-online.it',
      source: 'sito' as const,
      sector: 'ecommerce' as const,
      phone: '+39 02 7788990',
      email: 'sales@modamilano-online.it',
      address: 'Corso Buenos Aires, 42',
      city: 'Milano',
      status: 'qualificato' as const,
      notes: 'Hanno WooCommerce. Carrello medio €140, perdita stimata su abbandoni €8.000/mese.',
    },
  ];

  for (const item of seedLeadsData) {
    const analysis = await analyzeDomain(item.website, item.sector);
    const scoreBreakdown = calculateScore(
      {
        sector: item.sector,
        website: item.website,
        source: item.source,
        phone: item.phone,
        email: item.email,
      },
      analysis
    );

    // Insert Lead
    db.insert(leads).values({
      id: item.id,
      companyName: item.companyName,
      website: item.website,
      source: item.source,
      sector: item.sector,
      score: scoreBreakdown.total,
      status: item.status,
      phone: item.phone,
      email: item.email,
      address: item.address,
      city: item.city,
      notes: item.notes,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Insert Company
    const compId = `comp_${item.id}`;
    db.insert(companies).values({
      id: compId,
      name: item.companyName,
      sector: item.sector,
      address: item.address,
      city: item.city,
      phone: item.phone,
      email: item.email,
      website: item.website,
      techStackJson: JSON.stringify(analysis.techStack),
      estimatedRevenue: analysis.estimatedRevenueRange,
      employeeCount: analysis.employeeCountRange,
      notes: item.notes,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Insert Enrichment Data
    db.insert(enrichmentData).values({
      id: `enrich_${item.id}`,
      leadId: item.id,
      companyId: compId,
      source: 'seed_enrichment_v1',
      dataJson: JSON.stringify(analysis),
      enrichedAt: now,
    }).run();
  }

  console.log(`✅ Inseriti ${seedLeadsData.length} lead e aziende con dati di arricchimento e score calcolati.`);

  // 4. Create Demo Requests
  db.insert(demoRequests).values([
    {
      id: 'demo_1',
      leadId: 'lead_1',
      contactName: 'Marco Bellini (Ristorante Il Bolognese)',
      contactEmail: 'prenotazioni@ilbolognesemilano.it',
      contactPhone: '+39 02 87654321',
      sector: 'horeca_ristoranti',
      companySize: '5-15 dipendenti',
      preferredDate: 'Giovedì ore 15:30',
      notes: 'Vorremmo vedere una demo del bot WhatsApp su numero reale durante il servizio.',
      status: 'confirmed',
      createdAt: now,
    },
    {
      id: 'demo_2',
      leadId: 'lead_2',
      contactName: 'Avv. Valerio Bianchi',
      contactEmail: 'segreteria@studiobianchilex.it',
      contactPhone: '+39 06 69876543',
      sector: 'studi_legali',
      companySize: '10-25 dipendenti',
      preferredDate: 'Venerdì ore 11:00',
      notes: 'Demo RAG documentale per archivio sentenze penali e civili.',
      status: 'pending',
      createdAt: now,
    },
  ]).run();

  console.log('✅ Demo requests inizializzate.');
  console.log('🎉 Seeding completato con successo!');
}

seed().catch((err) => {
  console.error('❌ Errore durante il seed:', err);
  process.exit(1);
});
