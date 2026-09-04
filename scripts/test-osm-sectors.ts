import { getLeadScraperProvider } from '../packages/ai/src';

async function testSectors() {
  const provider = getLeadScraperProvider();

  console.log('\n--- 2. Test Ricerca Pompei (Hotel & Ospitalità) ---');
  const hotelRes = await provider.search({
    city: 'Pompei',
    sectorId: 'horeca_ospitalita',
    subcategories: ['hotel', 'bed_and_breakfast', 'guest_house', 'resort_agriturismo'],
    radiusKm: 5,
  });
  console.log('Hotel & B&B trovati a Pompei:', hotelRes.count);
  hotelRes.places.slice(0, 5).forEach((h) => {
    console.log(`- ${h.name} (${h.categoryLabel}) -> ${h.address || 'Centro'}, Sito: ${h.website || 'N/D'}, Distanza: ${h.distanceMeters}m`);
  });

  console.log('\n--- 3. Test Ricerca Milano (Studi Legali) ---');
  const legalRes = await provider.search({
    city: 'Milano',
    sectorId: 'studi_legali',
    subcategories: ['avvocati', 'notai'],
    radiusKm: 3,
  });
  console.log('Studi Legali / Notarili trovati a Milano:', legalRes.count);
  legalRes.places.slice(0, 5).forEach((l) => {
    console.log(`- ${l.name} (${l.categoryLabel}) -> ${l.address || 'Milano'}, Tel: ${l.phone || 'N/D'}`);
  });
}

testSectors().catch(console.error);
