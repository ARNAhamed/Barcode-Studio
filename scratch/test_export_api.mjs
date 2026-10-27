async function testApi() {
  console.log('--- 1. Fetch products to get IDs ---');
  const listRes = await fetch('http://127.0.0.1:8000/api/products');
  const listJson = await listRes.json();
  const products = listJson.data;
  console.log(`Fetched ${products.length} products. Total in meta: ${listJson.meta.total}`);

  if (products.length < 3) {
    console.error('Not enough products to test 3 selections!');
    return;
  }

  const selected3 = products.slice(0, 3);
  const selected3Ids = selected3.map(p => p.id);
  console.log(`Selected 3 IDs: ${selected3Ids.join(', ')} (${selected3.map(p => p.name).join(', ')})`);

  console.log('\n--- 2. Test export with exactly 3 selected IDs ---');
  const export3Res = await fetch('http://127.0.0.1:8000/api/products/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/csv' },
    body: JSON.stringify({ ids: selected3Ids }),
  });

  console.log('Status:', export3Res.status);
  console.log('Content-Disposition:', export3Res.headers.get('content-disposition'));
  const csvText = await export3Res.text();
  const lines = csvText.trim().split('\n');
  console.log(`CSV lines count: ${lines.length} (1 header + ${lines.length - 1} data rows)`);
  console.log('Header line:', lines[0]);
  for (let i = 1; i < lines.length; i++) {
    console.log(`Row ${i}:`, lines[i]);
  }

  console.log('\n--- 3. Test export with 0 selected IDs (should fail 422) ---');
  const export0Res = await fetch('http://127.0.0.1:8000/api/products/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ ids: [] }),
  });
  console.log('Status with 0 IDs:', export0Res.status);
  const errJson = await export0Res.json();
  console.log('Validation error message:', errJson.message || errJson);

  console.log('\n--- 4. Test export with all_matching: true ---');
  const exportAllRes = await fetch('http://127.0.0.1:8000/api/products/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/csv' },
    body: JSON.stringify({ all_matching: true }),
  });
  console.log('Status with all_matching:', exportAllRes.status);
  console.log('Content-Disposition:', exportAllRes.headers.get('content-disposition'));
  const allCsvText = await exportAllRes.text();
  const allLines = allCsvText.trim().split('\n');
  console.log(`All matching data rows: ${allLines.length - 1}`);
}

testApi().catch(console.error);
