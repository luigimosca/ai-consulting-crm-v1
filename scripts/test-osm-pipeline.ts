import { getLeadScraperProvider, LEAD_GEN_SECTORS } from '../packages/ai/src';

async function main() {
  console.log('=== TEST LEAD GENERATION TERRITORIALE OSM ===');
  const provider = getLeadScraperProvider();
  console.log('Active provider:', provider.name);

  console.log('\n--- 1. Test Ricerca Pompei (HORECA Ristorazione) ---');
  const result = await provider.search({
    city: 'Pompei',
    sectorId: 'horeca_ristorazione',
    subcategories: ['ristoranti', 'pizzerie', 'bar_caffe'],
    radiusKm: 5,
  });

  console.log('Success:', result.success);
  console.log('Total places found:', result.count);
  console.log('Execution time (ms):', result.debugInfo?.executionTimeMs);
  console.log('Center geocoded:', result.debugInfo?.geocodedCenter?.displayName);
  console.log('Raw POIs:', result.debugInfo?.rawPlacesCount, '| Deduplicated:', result.debugInfo?.deduplicatedCount, '| Discarded:', result.debugInfo?.discardedCount);

  console.log('\nPrimi 8 risultati reali estratti:');
  result.places.slice(0, 8).forEach((p, idx) => {
    console.log(`\n[${idx + 1}] ${p.name}`);
    console.log(`    Categoria: ${p.categoryLabel} (${p.categoryGroup})`);
    console.log(`    Indirizzo: ${p.address || 'Non censito'} (${p.city || 'Pompei'})`);
    console.log(`    Distanza: ${p.distanceMeters} m dal centro`);
    console.log(`    Telefono: ${p.phone || 'Non censito'}`);
    console.log(`    Sito Web: ${p.website || 'Non presente'}`);
    console.log(`    Email: ${p.email || 'Non presente'}`);
    console.log(`    Rating: ${p.rating} (Strictly Null)`);
    console.log(`    OSM URL: ${p.osmUrl}`);
  });

  // Asserzioni di integrità
  if (result.count === 0) {
    throw new Error('Nessun POI trovato su Pompei!');
  }
  for (const p of result.places) {
    if (p.rating !== null || p.reviewCount !== null) {
      throw new Error(`Integrità violata: rating=${p.rating}, reviewCount=${p.reviewCount}`);
    }
  }
  console.log('\n✅ Tutti i vincoli di integrità dati rispettati al 100%!');
}

main().catch((err) => {
  console.error('Test fallito:', err);
  process.exit(1);
});
