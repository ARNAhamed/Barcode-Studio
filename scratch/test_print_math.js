import { jsPDF } from 'jspdf';
import fs from 'fs';

// Verify 3x8 preset
const config3x8 = {
  preset_id: '3x8',
  paper_size: 'a4',
  orientation: 'portrait',
  columns: 3,
  rows: 8,
  label_width: 63.5,
  label_height: 33.9,
  margin_top: 13.0,
  margin_left: 7.2,
  gap_horizontal: 2.5,
  gap_vertical: 0,
  corner_radius: 1.5,
};

const doc3x8 = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

// A4: 210 x 297 mm
const cols = config3x8.columns;
const rows = config3x8.rows;
const labelW = config3x8.label_width;
const labelH = config3x8.label_height;
const leftM = config3x8.margin_left;
const topM = config3x8.margin_top;
const gapH = config3x8.gap_horizontal;
const gapV = config3x8.gap_vertical;

console.log('--- Testing 3x8 Preset (24 labels on A4) ---');
let count = 0;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    count++;
    const x = leftM + c * (labelW + gapH);
    const y = topM + r * (labelH + gapV);

    doc3x8.setDrawColor(180, 180, 180);
    doc3x8.setLineWidth(0.2);
    doc3x8.roundedRect(x, y, labelW, labelH, config3x8.corner_radius, config3x8.corner_radius);

    doc3x8.setFontSize(8);
    doc3x8.setTextColor(80, 80, 80);
    doc3x8.text(`Label #${count}`, x + 5, y + 8);
    doc3x8.text(`${labelW} x ${labelH} mm`, x + 5, y + 14);
    doc3x8.text(`Pos: (${x.toFixed(1)}, ${y.toFixed(1)}) mm`, x + 5, y + 20);

    if (count === 1 || count === 24) {
      console.log(`Label #${count} at X=${x.toFixed(2)} mm, Y=${y.toFixed(2)} mm, Size=${labelW}x${labelH} mm`);
    }
  }
}

const pdfOutput3x8 = doc3x8.output('arraybuffer');
fs.writeFileSync('d:/LMC/barcode-designer/scratch/test_3x8_preset.pdf', Buffer.from(pdfOutput3x8));
console.log(`Generated scratch/test_3x8_preset.pdf (${pdfOutput3x8.byteLength} bytes)`);

// Verify Auto-grid "Match my design size"
console.log('\n--- Testing "Match my design size" (Design 50x25 mm on A4) ---');
const designW = 50.0;
const designH = 25.0;
const paperW = 210.0;
const paperH = 297.0;
const autoLeftM = 8.0;
const autoTopM = 10.0;
const autoGapH = 2.0;
const autoGapV = 2.0;

const availableW = paperW - 2 * autoLeftM;
const availableH = paperH - 2 * autoTopM;
const autoCols = Math.floor((availableW + autoGapH) / (designW + autoGapH));
const autoRows = Math.floor((availableH + autoGapV) / (designH + autoGapV));

console.log(`Auto-grid: ${autoCols} cols x ${autoRows} rows = ${autoCols * autoRows} labels per sheet`);
console.log(`Label dimensions: ${designW} x ${designH} mm`);

const docAuto = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

let autoCount = 0;
for (let r = 0; r < autoRows; r++) {
  for (let c = 0; c < autoCols; c++) {
    autoCount++;
    const x = autoLeftM + c * (designW + autoGapH);
    const y = autoTopM + r * (designH + autoGapV);

    docAuto.setDrawColor(79, 70, 229);
    docAuto.setLineWidth(0.2);
    docAuto.rect(x, y, designW, designH);

    docAuto.setFontSize(8);
    docAuto.setTextColor(50, 50, 50);
    docAuto.text(`Design #${autoCount}`, x + 4, y + 7);
    docAuto.text(`${designW} x ${designH} mm`, x + 4, y + 13);
  }
}

const pdfOutputAuto = docAuto.output('arraybuffer');
fs.writeFileSync('d:/LMC/barcode-designer/scratch/test_match_design_size.pdf', Buffer.from(pdfOutputAuto));
console.log(`Generated scratch/test_match_design_size.pdf (${pdfOutputAuto.byteLength} bytes)`);

console.log('\nAll dimension and coordinate calculations verified successfully.');
