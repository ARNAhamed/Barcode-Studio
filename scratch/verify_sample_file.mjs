import fs from 'fs';
import path from 'path';

async function run() {
  const filePath = 'd:/LMC/barcode-designer/scratch/test_import_sample.csv';
  const fileContent = fs.readFileSync(filePath);

  const formData = new FormData();
  const blob = new Blob([fileContent], { type: 'text/csv' });
  formData.append('file', blob, 'test_import_sample.csv');

  console.log('Testing POST http://127.0.0.1:8000/api/products/import/preview ...');
  const previewRes = await fetch('http://127.0.0.1:8000/api/products/import/preview', {
    method: 'POST',
    body: formData,
  });

  const previewJson = await previewRes.json();
  console.log('Preview Response:');
  console.log(`Total: ${previewJson.total}, Valid: ${previewJson.valid}, Invalid: ${previewJson.invalid}`);
  console.log('Rows summary:');
  previewJson.rows.forEach(r => {
    console.log(`- Row ${r.row}: [${r.status.toUpperCase()}] Name: "${r.data.name}", SKU: "${r.data.sku}"`);
    if (r.errors && r.errors.length > 0) {
      console.log(`  Errors: ${r.errors.join('; ')}`);
    }
  });

  console.log('\nTesting POST http://127.0.0.1:8000/api/products/import/commit ...');
  const commitFormData = new FormData();
  commitFormData.append('file', blob, 'test_import_sample.csv');
  commitFormData.append('mode', 'update_existing');
  commitFormData.append('auto_generate_barcodes', '1');

  const commitRes = await fetch('http://127.0.0.1:8000/api/products/import/commit', {
    method: 'POST',
    body: commitFormData,
  });

  const commitJson = await commitRes.json();
  console.log('Commit Response:', JSON.stringify(commitJson, null, 2));

  console.log('\nTesting GET http://127.0.0.1:8000/api/products/export ...');
  const exportRes = await fetch('http://127.0.0.1:8000/api/products/export');
  const exportText = await exportRes.text();
  console.log('Export Status:', exportRes.status);
  console.log('Export Content-Type:', exportRes.headers.get('content-type'));
  console.log('Export Content-Disposition:', exportRes.headers.get('content-disposition'));
  console.log('Export UTF-8 BOM present:', exportText.charCodeAt(0) === 0xFEFF);
  console.log('Export First 2 lines:\n' + exportText.split('\n').slice(0, 3).join('\n'));
}

run().catch(console.error);
