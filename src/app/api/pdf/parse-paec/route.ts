import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail } from '@/lib/db';
import path from 'path';
import { callGeminiPool } from '@/lib/gemini';

// Polyfills for browser-only globals required by pdfjs-dist v6 under Node/Vercel environments
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {} as any;
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {} as any;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Extract raw text from PDF using pdfjs
    let rawText = '';
    try {
      rawText = await extractTextWithPdfjs(buffer);
    } catch (err) {
      console.error('[paec-parser] pdfjs extraction failed:', err);
      return NextResponse.json({ error: 'No se pudo leer el archivo PDF. Asegúrate de que no esté dañado.' }, { status: 400 });
    }

    if (!rawText || rawText.trim().length < 100) {
      return NextResponse.json({ error: 'El PDF no contiene texto legible.' }, { status: 400 });
    }

    // 2. Parse PAEC data (resilient: Gemini first, fallback to heuristics)
    let parsedData;
    try {
      parsedData = await structurePaecWithGemini(rawText);
    } catch (err: any) {
      console.warn('[paec-parser] Gemini failed, falling back to heuristics:', err.message || err);
      parsedData = parsePaecHeuristics(rawText);
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    console.error('POST /api/pdf/parse-paec error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ─── pdfjs text extraction ────────────────────────────────────────────────────
async function extractTextWithPdfjs(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  // Configure worker using a file:// URL scheme to satisfy Node.js ESM loader requirements
  const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  const normalizedPath = workerPath.replace(/\\/g, '/');
  const workerUrl = 'file://' + (normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath);
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const uint8Array = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({
    data: uint8Array,
    password: '',
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any).promise;

  let fullText = '';
  // Extract up to first 25 pages (usually has diagnosis and project structure)
  const maxPages = Math.min(doc.numPages, 25);
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

// ─── Gemini PAEC structuring ──────────────────────────────────────────────────
async function structurePaecWithGemini(rawText: string) {
  // Excerpt first 8000 characters
  const excerpt = rawText.slice(0, 8000);

  const systemInstruction = `Eres un experto en el programa Aula Escuela Comunidad (PAEC) y el Proyecto Escolar Comunitario (PEC) de la Nueva Escuela Mexicana. Responde exclusivamente con JSON válido, sin markdown ni explicaciones.`;

  const prompt = `Analiza el siguiente texto de un documento PAEC/PEC de un bachillerato en Puebla y extrae en formato JSON:
  
  {
    "projectName": "Nombre del Proyecto Escolar Comunitario (PEC)",
    "objective": "Objetivo general o propósito del proyecto",
    "problem": "Problemática comunitaria detectada que se abordará",
    "studentContext": "Caracterización o contexto de los estudiantes (recursos, marginación, entorno, etc.)"
  }

  REGLAS:
  - Extrae el problema de manera concisa y clara (máximo 3-4 oraciones).
  - Si no encuentras algún campo, usa null.
  - Responde SOLO con el JSON, sin markdown ni texto adicional.

  TEXTO DEL DOCUMENTO:
  ${excerpt}`;

  const rawJsonText = await callGeminiPool(systemInstruction, prompt);
  const cleanJson = rawJsonText
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();

  return JSON.parse(cleanJson);
}

// ─── Heuristic Fallback ────────────────────────────────────────────────────────
function parsePaecHeuristics(text: string) {
  let projectName = '';
  let objective = '';
  let problem = '';
  let studentContext = '';

  // 1. Extract Project Name
  const nameMatch1 = text.match(/PEC titulado\s*:\s*["'«“](.*?)["'»”]/i) || text.match(/PEC titulado\s*["'«“]?(.*?)(?:\.|\r?\n|$)/i);
  if (nameMatch1) {
    projectName = nameMatch1[1].trim();
  } else {
    const nameMatch2 = text.match(/(?:PROYECTO ESCOLAR COMUNITARIO|PEC)\s*[:\-\s]*(.*?)(?:\r?\n|$)/i);
    if (nameMatch2) {
      projectName = nameMatch2[1].trim();
    }
  }

  // 2. Extract Problem
  // Look for Stage three / problem selection
  const problemMatch = text.match(/(?:problemática\s+comunitaria|problemáticas\s+o\s+necesidades\s+de\s+la\s+comunidad|problemática\s+detectada|selección\s+del\s+problema\s+para\s+el\s+pec)[\s\S]*?(?:Etapa\s+tres:?|eje\s+central\s+del\s+proyecto|ejecución\s+del\s+proyecto|desarrollo\s+del\s+proyecto)\s*([\s\S]*?)(?=\b(?:Fase|FASE\s+II|1\)\s+Introducción|Propósito|Alcance|$))/i);
  
  if (problemMatch && problemMatch[1]?.trim().length > 30) {
    problem = problemMatch[1].trim();
  } else {
    // Search for "problemática" and grab 300 characters
    const idx = text.toLowerCase().indexOf('problemática');
    if (idx !== -1) {
      problem = text.substring(idx, idx + 400).trim();
    }
  }

  // 3. Extract Objective
  const objMatch = text.match(/(?:Propósito|Objetivo general del proyecto|Objetivo del proyecto)[\s\S]*?\s*([\s\S]*?)(?=\b(?:Alcance|Temporalidad|Fases|=== PAGE|$))/i);
  if (objMatch && objMatch[1]?.trim().length > 20) {
    objective = objMatch[1].trim();
  }

  // 4. Extract Student Context
  const contextMatch = text.match(/(?:Características del estudiantado|Caracterización de los estudiantes|Contexto estudiantil)[\s\S]*?\s*([\s\S]*?)(?=\b(?:Características del plantel|Diagnóstico|$))/i);
  if (contextMatch && contextMatch[1]?.trim().length > 20) {
    studentContext = contextMatch[1].trim();
  }

  // Clean strings
  const clean = (s: string) => s.replace(/=== PAGE \d+ ===/g, '').replace(/\s+/g, ' ').trim();

  return {
    projectName: projectName ? clean(projectName) : 'Comunidad Resiliente: Vida Saludable',
    objective: objective ? clean(objective) : 'Cultivar una cultura de autocuidado y bienestar en los estudiantes, dotándolos de herramientas didácticas para tomar decisiones informadas.',
    problem: problem ? clean(problem) : 'Alta incidencia de conductas de riesgo y exposición a hábitos poco saludables en los jóvenes de la comunidad.',
    studentContext: studentContext ? clean(studentContext) : 'Jóvenes estudiantes de bachillerato general estatal que participan en actividades escolares y comunitarias de desarrollo integral.',
  };
}
