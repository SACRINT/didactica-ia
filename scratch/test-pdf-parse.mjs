import fs from 'fs';
import path from 'path';

async function test() {
  try {
    const pdfPath = 'C:\\Secuencias_Didacticas\\DATOS PAEC-PEC\\PAEC Héroes de la Patria 2025-2026 (1er y 2do SEM).pdf';
    console.log('Reading file:', pdfPath);
    const buffer = fs.readFileSync(pdfPath);
    console.log('File read, size:', buffer.length);

    console.log('Importing pdfjs-dist legacy...');
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log('pdfjs-dist legacy imported successfully');

    // Resolve the worker path to a file:// URL
    const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
    const workerUrl = 'file:///' + workerPath.replace(/\\/g, '/');
    console.log('Setting workerSrc to URL:', workerUrl);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

    const uint8Array = new Uint8Array(buffer);
    console.log('Loading document...');
    const doc = await pdfjsLib.getDocument({
      data: uint8Array,
      password: '',
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    }).promise;

    console.log('Document loaded, page count:', doc.numPages);
    
    let fullText = '';
    const maxPages = Math.min(doc.numPages, 5);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      console.log(`Page ${pageNum} length:`, pageText.length);
      fullText += pageText + '\n';
    }
    console.log('Success! Extracted text preview:', fullText.substring(0, 300));
  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  }
}

test();
