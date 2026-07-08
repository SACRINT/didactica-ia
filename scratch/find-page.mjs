import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = 'c:/Secuencias_Didacticas/Curriculum Fundamental/2025_MCC_PENSAMIENTO MATEMATICO_BN.pdf';

async function main() {
  try {
    const buffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({
      data: uint8Array,
      password: '',
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    }).promise;

    const page = await doc.getPage(14);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str || '').join(' ');
    console.log('--- PAGE 14 TEXT ---');
    console.log(text);
  } catch (err) {
    console.error(err);
  }
}
main();
