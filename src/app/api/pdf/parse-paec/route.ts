import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail } from '@/lib/db';

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
  
  // Disable worker
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjsLib as any).GlobalWorkerOptions = (pdfjsLib as any).GlobalWorkerOptions || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '';

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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('No GEMINI_API_KEY');
  }

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // Excerpt first 8000 characters
  const excerpt = rawText.slice(0, 8000);

  const prompt = `Eres un experto en el programa Aula Escuela Comunidad (PAEC) y el Proyecto Escolar Comunitario (PEC) de la Nueva Escuela Mexicana.
  
  Analiza el siguiente texto de un documento PAEC/PEC de un bachillerato en Puebla y extrae en formato JSON:
  
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

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = response.response.text();
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  const cleanJson = text
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
