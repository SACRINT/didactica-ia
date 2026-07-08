import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = 'c:/Secuencias_Didacticas/Curriculum Fundamental/vf_MCC_CIENCIAS SOCIALES_BN.pdf';

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

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str || '').join(' ');
      
      if (text.toLowerCase().includes('propósito formativo') || text.toLowerCase().includes('proposito formativo')) {
        console.log(`🎯 Encontrado 'Propósito formativo' en página ${i}:`);
        console.log(text.substring(0, 400));
      }
    }
  } catch (err) {
    console.error(err);
  }
}
main();
