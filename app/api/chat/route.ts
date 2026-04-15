import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const SYSTEM_PROMPT = `Eres un asistente especializado en presupuestos y finanzas para proyectos de construcción y remodelación.

Tu función principal es:
- Ayudar a crear presupuestos detallados y realistas
- Estimar costos de materiales, mano de obra y otros gastos
- Proporcionar consejos sobre optimización de costos
- Explicar conceptos de presupuesto de manera clara
- Mantener un registro organizado de los items del presupuesto

IMPORTANTE:
- Siempre responde en español
- Sé específico con cantidades y precios aproximados
- Incluye márgenes de error en las estimaciones
- Pregunta por detalles específicos cuando sea necesario
- Mantén un tono profesional pero amigable
- Si no tienes información suficiente, pide más detalles

Formato de respuesta:
- Usa listas y tablas cuando sea apropiado
- Separa claramente los diferentes componentes del presupuesto
- Incluye totales y subtotales
- Menciona factores que pueden afectar los costos`;

export async function POST(request: Request) {
  try {
    console.log('Recibiendo solicitud de chat...');

    const { messages } = await request.json();
    console.log('Mensajes recibidos:', messages);

    if (!messages || !Array.isArray(messages)) {
      console.log('Error: mensajes no válidos');
      return NextResponse.json(
        { error: 'Se requieren mensajes en formato array' },
        { status: 400 }
      );
    }

    // Verificar que la API key esté configurada
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_GENERATIVE_AI_API_KEY no está configurada');
      return NextResponse.json(
        { error: 'Configuración de API incompleta' },
        { status: 500 }
      );
    }

    console.log('API key encontrada, inicializando modelo...');

    // Crear el cliente de Google Gemini
    const model = google('gemini-pro');

    // Preparar los mensajes para el LLM
    const conversationMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    console.log('Enviando mensajes al LLM:', conversationMessages.length, 'mensajes');

    // Generar respuesta con el LLM
    const { text } = await generateText({
      model,
      messages: conversationMessages as any,
      temperature: 0.7,
    });

    console.log('Respuesta generada exitosamente');

    return NextResponse.json({
      response: text,
      success: true,
    });

  } catch (error) {
    console.error('Error en el chat:', error);

    // Más detalles del error para debugging
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Detalles del error:', errorMessage);

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}