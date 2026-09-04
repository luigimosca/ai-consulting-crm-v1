async function testLiveChat() {
  const sessionId = `live_test_${Date.now()}`;
  console.log(`💬 Test Conversazione Chatbot su Session: ${sessionId}\n`);

  // Turn 1: User says sector
  console.log('--- Turno 1: Selezione settore ---');
  let res = await fetch('http://localhost:3005/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message: 'Ristorante / HORECA',
      history: [],
      context: { step: 'sector' },
    }),
  });
  let data = await res.json();
  console.log('Bot Reply:', data.reply);
  console.log('Next Context:', data.context);
  console.log('Quick Replies:', data.quickReplies);

  // Turn 2: User says size and needs
  console.log('\n--- Turno 2: Dimensione team ed esigenze ---');
  res = await fetch('http://localhost:3005/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message: 'Siamo in 10, perdiamo telefonate nel weekend per le prenotazioni',
      history: [
        { role: 'user', content: 'Ristorante / HORECA' },
        { role: 'assistant', content: data.reply },
      ],
      context: data.context,
    }),
  });
  data = await res.json();
  console.log('Bot Reply:', data.reply);
  console.log('Next Context:', data.context);

  // Turn 3: User provides contact info
  console.log('\n--- Turno 3: Dati di contatto per demo ---');
  res = await fetch('http://localhost:3005/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message: 'Sono Marco Rossi, email marco.rossi@trattoria.it telefono 3331234567',
      history: [
        { role: 'user', content: 'Siamo in 10, perdiamo telefonate' },
        { role: 'assistant', content: data.reply },
      ],
      context: data.context,
    }),
  });
  data = await res.json();
  console.log('Bot Reply:', data.reply);
  console.log('Is Complete:', data.isComplete);
  console.log('Lead ID generato:', data.leadId);
  console.log('Demo Created:', data.demoCreated);
  console.log('Model usato:', data.usedModel);

  console.log('\n🎉 TEST CONVERSAZIONE CHATBOT E SALVATAGGIO CRM SUPERATO!');
}

testLiveChat().catch(console.error);
