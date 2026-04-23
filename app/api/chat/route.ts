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
- Menciona factores que pueden afectar los costos

También puedes interactuar con Notion:
- Si el usuario pide crear una página o nota en Notion, extrae el contenido y créala automáticamente
- Responde confirmando la acción realizada`;

// Función para detectar y procesar comandos de Notion
async function processNotionCommand(userMessage: string) {
  const lowerMessage = userMessage.toLowerCase();

  // Patrones para detectar creación de página en Notion
  const createPatterns = [
    /crea(?:r)?\s+(?:una\s+)?p[áa]gina\s+(?:en\s+)?notion\s+(?:con\s+)?(.+)/i,
    /haz\s+(?:una\s+)?nota\s+(?:en\s+)?notion\s+(?:con\s+)?(.+)/i,
    /guarda\s+(?:en\s+)?notion\s+(.+)/i,
    /notion\s+crea(?:r)?\s+(.+)/i,
  ];

  for (const pattern of createPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const content = match[1].trim();
      if (content) {
        try {
          // Llamar a la API de Notion
          const notionResponse = await fetch('http://localhost:3000/api/notion', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: content }),
          });

          if (notionResponse.ok) {
            const data = await notionResponse.json();
            return {
              action: 'created',
              content,
              pageId: data.data?.id,
              url: data.data?.url,
            };
          } else {
            const errorData = await notionResponse.json();
            return {
              action: 'error',
              error: errorData.error || 'Error desconocido',
            };
          }
        } catch (error) {
          return {
            action: 'error',
            error: error instanceof Error ? error.message : 'Error de conexión',
          };
        }
      }
    }
  }

  return null;
}

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

    // Obtener el último mensaje del usuario
    const lastUserMessage = messages
      .filter((msg: { role: string }) => msg.role === 'user')
      .pop();

    let notionResult = null;
    if (lastUserMessage && typeof lastUserMessage.content === 'string') {
      notionResult = await processNotionCommand(lastUserMessage.content);
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

    const modelName = process.env.GOOGLE_AI_MODEL ?? 'gemini-flash-latest';
    console.log('Usando modelo de Google AI:', modelName);

    // Crear el cliente de Google AI compatible.
    const model = google(modelName);

    // Preparar los mensajes para el LLM
    let conversationMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Si hay resultado de Notion, añadirlo al contexto
    if (notionResult) {
      if (notionResult.action === 'created') {
        const notionMessage = `✅ Página creada en Notion con el contenido: "${notionResult.content}"\nURL: ${notionResult.url}`;
        conversationMessages.push({
          role: 'assistant',
          content: notionMessage,
        });
      } else if (notionResult.action === 'error') {
        const errorMessage = `❌ Error al crear página en Notion: ${notionResult.error}`;
        conversationMessages.push({
          role: 'assistant',
          content: errorMessage,
        });
      }
    }

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