import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail, getPlanningById, updatePlanningContent } from '@/lib/db';
import { generatePlanningStream } from '@/lib/gemini';
import { logActivity } from '@/lib/ai-provider';
import { buildUserPrompt } from '@/lib/prompts/build-prompt';
import { getUserLibraryContext } from '@/lib/context-extractor';
import type { ExtractedPdfData, TeacherContext } from '@/types/planning';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 });
    }

    const { id } = await params;
    const planning = await getPlanningById(id, teacher.id);
    if (!planning) {
      return NextResponse.json({ error: 'Planeación no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { extractedData, context } = body as {
      extractedData: ExtractedPdfData;
      context: TeacherContext;
    };

    if (!extractedData || !context) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: extractedData y context' },
        { status: 400 }
      );
    }

    // Build the user prompt with teacher context
    const userPrompt = buildUserPrompt(
      extractedData,
      context,
      planning.semester as number,
      planning.component as string
    );

    const libraryContext = await getUserLibraryContext(session.user.email!);

    // NOTA: La normativa oficial NO se inyecta en planeaciones didácticas.
    // Decisión del usuario (2026-08-08): solo PMC y PIPS llevan
    // fundamentación jurídica; el formato DBEPA de planeación no la incluye.

    let fullUserPrompt = userPrompt;
    if (libraryContext) {
      fullUserPrompt += `\n\n${libraryContext}`;
    }

    const teacherEmail = session.user.email!;
    const encoder = new TextEncoder();

    // ReadableStream: feed AI chunks to the frontend
    const stream = new ReadableStream({
      async start(controller) {
        let accumulatedText = '';
        try {
          const textGenerator = await generatePlanningStream(fullUserPrompt);
          
          for await (const chunk of textGenerator) {
            accumulatedText += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          // Once generation is finished, parse and save to database
          try {
            const cleanJson = accumulatedText
              .replace(/^```(?:json)?\n?/m, '')
              .replace(/\n?```$/m, '')
              .trim();
            const parsedContent = JSON.parse(cleanJson);
            
          await updatePlanningContent(id, teacher.id, parsedContent);
          // Log successful generation
          await logActivity({
            teacherEmail,
            action: 'generate_planning',
            entityType: 'planning',
            entityId: id,
            success: true,
          });
          } catch (dbErr) {
            console.error('Failed to parse or save accumulated JSON stream to database:', dbErr);
          }

          controller.close();
        } catch (streamErr) {
          const errMsg = streamErr instanceof Error ? streamErr.message : 'Error desconocido al generar';
          console.error('Stream generation error:', errMsg);
          // Send the error as a readable marker through the stream so the frontend can show it
          controller.enqueue(encoder.encode(`__ERROR__:${errMsg}`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Generate planning error:', message);
    return NextResponse.json(
      { error: message || 'Error al generar la planeación' },
      { status: 500 }
    );
  }
}
