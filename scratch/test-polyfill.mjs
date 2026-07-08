async function test() {
  try {
    console.log('Registering DOMMatrix polyfill...');
    if (typeof globalThis.DOMMatrix === 'undefined') {
      globalThis.DOMMatrix = class DOMMatrix {};
    }
    
    console.log('Importing pdfjs-dist legacy...');
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log('pdfjs-dist legacy imported successfully with DOMMatrix polyfill!');
  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  }
}

test();
