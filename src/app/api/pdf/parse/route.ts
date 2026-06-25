import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail } from '@/lib/db';
import { parsePdfBuffer } from '@/lib/pdf-parser';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 });
    }

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó un archivo' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no puede superar 10 MB' }, { status: 400 });
    }

    // Convert to buffer and parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parseResult = await parsePdfBuffer(buffer);

    // Upload to Vercel Blob (non-blocking, best-effort)
    try {
      const blob = await put(
        `pdfs/${teacher.id}/${Date.now()}-${file.name}`,
        buffer,
        {
          access: 'private',
          contentType: 'application/pdf',
        }
      );
      // Could save blob.url to DB here if needed
    } catch (blobErr) {
      // Blob storage failure is non-critical — continue
      console.warn('Blob storage upload failed (non-critical):', blobErr);
    }

    return NextResponse.json({
      success: parseResult.success,
      confidence: parseResult.confidence,
      data: parseResult.data,
      errors: parseResult.errors,
    });
  } catch (error) {
    console.error('PDF parse error:', error);
    return NextResponse.json(
      { error: 'Error al procesar el PDF. Por favor intenta de nuevo.' },
      { status: 500 }
    );
  }
}
