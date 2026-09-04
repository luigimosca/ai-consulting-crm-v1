async function verify() {
  const res = await fetch('http://localhost:3005');
  const html = await res.text();
  const match = html.match(/href="(\/_next\/static\/css\/app\/layout\.css[^"]*)"/);
  if (!match) {
    console.log('No layout.css link in HTML!');
    return;
  }
  const cssUrl = 'http://localhost:3005' + match[1];
  const cssRes = await fetch(cssUrl);
  const css = await cssRes.text();
  console.log('CSS Size:', css.length, 'bytes');
  console.log('Has bg-blue-600:', css.includes('bg-blue-600'));
  console.log('Has max-w-7xl:', css.includes('max-w-7xl'));
  console.log('Has dark background #090d16:', css.includes('#090d16'));
  console.log('Has grid-cols:', css.includes('grid-cols-'));
}

verify().catch(console.error);
