import { auth } from '@/lib/auth';
import { getAIProvider } from '@/lib/ai-provider';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { messages, uacContext, paecContext } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Se requiere un historial de mensajes válido' }, { status: 400 });
    }

    const systemPrompt = `Eres DidactecaBot, el Asistente Pedagógico Virtual oficial de la plataforma DidactecaIA.
Especializado en Educación Media Superior, Marco Curricular Común (MCCEMS 2026-2027) y lineamientos de la Dirección Bachilleratos Estatales y Preparatoria Abierta (DBEPA Puebla).

Tu objetivo es orientar y asesorar a los docentes en:
1. Diseño y ajuste de Secuencias y Planeaciones Didácticas (Apertura, Desarrollo y Cierre).
2. Definición de Propósitos Formativos, Progresiones y Metas de Aprendizaje.
3. Articulación de la transversalidad con el Proyecto Aula, Escuela y Comunidad (PAEC).
4. Estrategias de evaluación formativa, autoevaluación, coevaluación y metacognición.
5. Elaboración del Plan de Intervención Pedagógica de Supervisión (PIPS).

REGLAS DE CONDUCTA:
- Sé amable, respetuoso, empático y altamente pedagógico.
- Da sugerencias concretas de actividades aplicables al aula mexicana de nivel bachillerato.
- Mantén tus respuestas claras y bien estructuradas usando Markdown.
- Si te preguntan sobre el contexto activo:
  UAC / Asignatura: ${uacContext || 'General / No especificado'}
  PAEC / Entorno: ${paecContext || 'No especificado'}`;

    const lastUserMessage = messages[messages.length - 1].content;
    const historyText = messages
      .slice(0, -1)
      .map((m: any) => `${m.role === 'user' ? 'Docente' : 'Asistente'}: ${m.content}`)
      .join('\n');

    const fullUserPrompt = historyText
      ? `HISTORIAL DE LA CONVERSACIÓN:\n${historyText}\n\nNUEVA PREGUNTA DEL DOCENTE:\nDocente: ${lastUserMessage}`
      : `PREGUNTA DEL DOCENTE:\n${lastUserMessage}`;

    const ai = await getAIProvider();
    const reply = await ai.generate(systemPrompt, fullUserPrompt);

    return NextResponse.json({ success: true, reply });
  } catch (e: any) {
    console.error('API /api/pedagogical-chat error:', e);
    return NextResponse.json({ error: e.message || 'Error en el asistente pedagógico' }, { status: 500 });
  }
}
