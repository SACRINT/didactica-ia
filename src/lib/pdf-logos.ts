/**
 * pdf-logos.ts — Servicio de carga y caché en Base64 de logotipos oficiales SEP Puebla
 * SIGPDA-EMS · Membrete Institucional
 */

let cachedLogoGobierno: string | null = null;
let cachedLogoSep: string | null = null;
let cachedLogoSupervision: string | null = null;

/**
 * Convierte un Blob o ArrayBuffer a Data URL Base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Error al convertir imagen a Base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Carga una imagen desde una URL pública en el cliente y la transforma a Data URL Base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  if (typeof window !== 'undefined') {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`No se pudo cargar la imagen desde ${url} (${response.status})`);
    }
    const blob = await response.blob();
    return await blobToBase64(blob);
  }

  // Fallback para ejecución en entorno Node / Server
  try {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', url.startsWith('/') ? url.slice(1) : url);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  } catch (err) {
    console.warn(`[pdf-logos] Fallback de lectura de imagen falló para ${url}:`, err);
  }

  return '';
}

/**
 * Retorna el logo de Gobierno de Puebla en Base64 con caché en memoria.
 */
export async function getLogoGobierno(): Promise<string> {
  if (cachedLogoGobierno) return cachedLogoGobierno;
  try {
    cachedLogoGobierno = await fetchImageAsBase64('/images/logo-gobierno-puebla.png');
  } catch (e) {
    console.error('Error cargando logo Gobierno de Puebla:', e);
    return '';
  }
  return cachedLogoGobierno;
}

/**
 * Retorna el logo de la Secretaría de Educación Pública de Puebla en Base64 con caché en memoria.
 */
export async function getLogoSep(): Promise<string> {
  if (cachedLogoSep) return cachedLogoSep;
  try {
    cachedLogoSep = await fetchImageAsBase64('/images/logo-sep-puebla.png');
  } catch (e) {
    console.error('Error cargando logo SEP Puebla:', e);
    return '';
  }
  return cachedLogoSep;
}

/**
 * Retorna el logo de la Supervisión Escolar 004 en Base64 con caché en memoria.
 */
export async function getLogoSupervision(): Promise<string> {
  if (cachedLogoSupervision) return cachedLogoSupervision;
  try {
    cachedLogoSupervision = await fetchImageAsBase64('/images/logo-supervision-004.png');
  } catch (e) {
    console.error('Error cargando logo Supervisión 004:', e);
    return '';
  }
  return cachedLogoSupervision;
}

/**
 * Carga los 3 logotipos en paralelo.
 */
export async function loadAllLogos(): Promise<{
  gobierno: string;
  sep: string;
  supervision: string;
}> {
  const [gobierno, sep, supervision] = await Promise.all([
    getLogoGobierno(),
    getLogoSep(),
    getLogoSupervision(),
  ]);
  return { gobierno, sep, supervision };
}
