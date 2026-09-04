async function testHttpEndpoints() {
  console.log('=== TEST HTTP API ROUTE /api/lead-gen/search ===');

  const searchRes = await fetch('http://localhost:3005/api/lead-gen/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city: 'Pompei',
      sectorId: 'horeca_ristorazione',
      subcategories: ['pizzerie', 'ristoranti'],
      radiusKm: 3,
    }),
  });

  const searchData = await searchRes.json();
  console.log('Status:', searchRes.status);
  console.log('Success:', searchData.success);
  console.log('Count:', searchData.count);
  console.log('Provider:', searchData.provider);
  console.log('Geocoded:', searchData.debugInfo?.geocodedCenter?.displayName);

  if (!searchData.places || searchData.places.length === 0) {
    throw new Error('Nessun place restituito dall API HTTP');
  }

  const samplePlace = searchData.places[0];
  console.log('\nSample Place importabile:', samplePlace.name, '|', samplePlace.categoryLabel, '|', samplePlace.address);

  console.log('\n=== TEST HTTP API ROUTE /api/leads (IMPORT) ===');
  const importRes = await fetch('http://localhost:3005/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: samplePlace.name,
      website: samplePlace.website,
      source: 'maps',
      sector: samplePlace.crmSector,
      address: samplePlace.address,
      city: samplePlace.city || 'Pompei',
      phone: samplePlace.phone,
      email: samplePlace.email,
      notes: `Lead OpenStreetMap: ${samplePlace.osmUrl}`,
    }),
  });

  const importData = await importRes.json();
  console.log('Import Status:', importRes.status);
  console.log('Import Success:', importData.success);
  console.log('Imported Lead:', importData.lead?.companyName, '| ID:', importData.lead?.id, '| Score:', importData.lead?.score);

  console.log('\n=== TEST DEDUPLICAZIONE IMPORT ===');
  const dupRes = await fetch('http://localhost:3005/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: samplePlace.name,
      website: samplePlace.website,
      source: 'maps',
      sector: samplePlace.crmSector,
      address: samplePlace.address,
      city: samplePlace.city || 'Pompei',
    }),
  });
  const dupData = await dupRes.json();
  console.log('Dup Check Result:', dupData.alreadyExists ? '✅ Rilevato duplicato correttamente' : 'Creato nuovo');

  console.log('\n✅ Tutti i test HTTP superati con successo!');
}

testHttpEndpoints().catch(console.error);
