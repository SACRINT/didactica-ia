const { execSync } = require('child_process');
const path = require('path');

const baseDir = 'C:\\Secuencias_Didacticas\\documentos_referencia\\[07] PIPS_MD';

const zips = [
  { src: 'MD PMC_2025-2026.zip', dest: 'PMC_extracted' },
  { src: 'MD PAEC-PEC_2025-2026.zip', dest: 'PAEC_extracted' },
  { src: 'MD C-PAEC-PEC_2025-2026(CORREGIDO).zip', dest: 'CPAEC_extracted' },
  { src: 'Documentos para el PIPS.zip', dest: 'PIPS_docs_extracted' },
];

for (const z of zips) {
  const src = path.join(baseDir, z.src);
  const dest = path.join(baseDir, z.dest);
  try {
    execSync(`powershell -Command "Expand-Archive -LiteralPath '${src}' -DestinationPath '${dest}' -Force"`, { timeout: 60000 });
    console.log(`Extracted: ${z.src}`);
  } catch (e) {
    console.error(`Failed: ${z.src} — ${e.message}`);
  }
}
console.log('All done.');
