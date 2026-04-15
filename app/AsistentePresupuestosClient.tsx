'use client';

import { useState, useEffect, useRef, type ChangeEvent, type FormEvent, type ReactNode } from 'react';

interface AsistentePresupuestosClientProps {
  pinCorrecto: string;
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const initialMessages: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'Bienvenido al asistente de presupuestos. Ingresa los detalles y te ayudare a estructurarlo.',
  },
];

function shortenUrl(url: string, maxLength = 50) {
  if (url.length <= maxLength) return url;
  const half = Math.floor((maxLength - 1) / 2);
  return `${url.slice(0, half)}…${url.slice(-half)}`;
}

function extractUrls(text: string) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return Array.from(text.matchAll(urlRegex), (match) => match[0]);
}

function renderMessageContent(content: string, messageId: string) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const parts: Array<string | ReactNode> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let linkIndex = 0;

  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0];
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    parts.push(
      <a
        key={`${messageId}-link-${linkIndex++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-300 underline decoration-white/20 hover:text-cyan-100 break-all"
        title={url}
      >
        {shortenUrl(url)}
      </a>
    );

    lastIndex = match.index + url.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export default function AsistentePresupuestosClient({ pinCorrecto }: AsistentePresupuestosClientProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [archivedMessages, setArchivedMessages] = useState<Message[]>([]);
  const [processedLinkUrls, setProcessedLinkUrls] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Efecto para hidratar el estado desde localStorage después del primer render
  useEffect(() => {
    const savedAuth = localStorage.getItem('pierutu-auth');
    const savedMessages = localStorage.getItem('pierutu-messages');
    const savedArchivedMessages = localStorage.getItem('pierutu-archived-messages');
    const savedInput = localStorage.getItem('pierutu-input');

    if (savedAuth === 'true') {
      setIsAuthorized(true);
    }

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
        }
      } catch (error) {
        console.warn('Error loading saved messages:', error);
      }
    }

    if (savedArchivedMessages) {
      try {
        const parsedArchivedMessages = JSON.parse(savedArchivedMessages);
        if (Array.isArray(parsedArchivedMessages)) {
          setArchivedMessages(parsedArchivedMessages);
        }
      } catch (error) {
        console.warn('Error loading archived messages:', error);
      }
    }

    const savedProcessedLinkUrls = localStorage.getItem('pierutu-processed-links');
    if (savedProcessedLinkUrls) {
      try {
        const parsedProcessedLinkUrls = JSON.parse(savedProcessedLinkUrls);
        if (Array.isArray(parsedProcessedLinkUrls)) {
          setProcessedLinkUrls(parsedProcessedLinkUrls);
        }
      } catch (error) {
        console.warn('Error loading processed link URLs:', error);
      }
    }

    if (savedInput) {
      setInput(savedInput);
    }

    setIsHydrated(true);
  }, []);

  // Memoria de sesión - guardar cambios en localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('pierutu-auth', isAuthorized.toString());
    }
  }, [isAuthorized, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('pierutu-messages', JSON.stringify(messages));
    }
  }, [messages, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('pierutu-archived-messages', JSON.stringify(archivedMessages));
    }
  }, [archivedMessages, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('pierutu-processed-links', JSON.stringify(processedLinkUrls));
    }
  }, [processedLinkUrls, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('pierutu-input', input);
    }
  }, [input, isHydrated]);

  useEffect(() => {
    if (isAuthorized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isAuthorized]);

  useEffect(() => {
    if (!isHydrated) return;

    const foundUrls = messages
      .filter((msg) => msg.role === 'assistant')
      .flatMap((msg) => extractUrls(msg.content));

    const uniqueUrls = Array.from(new Set(foundUrls));
    const urlsToFetch = uniqueUrls.filter((url) => !processedLinkUrls.includes(url));

    if (urlsToFetch.length === 0) return;

    urlsToFetch.forEach(async (url) => {
      try {
        const response = await fetch('/api/fetch-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        if (response.ok) {
          const data = await response.json();
          const linkMessage: Message = {
            id: `${Date.now()}-link-${url}`,
            role: 'assistant',
            content: data.message,
          };
          setMessages((prev) => [...prev, linkMessage]);
        }
      } catch (error) {
        console.error('Error fetching link once:', error);
        const errorMessage: Message = {
          id: `${Date.now()}-link-error-${url}`,
          role: 'assistant',
          content: `❌ Error al procesar el link: ${url}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    });

    setProcessedLinkUrls((prev) => [...prev, ...urlsToFetch.filter((url) => !prev.includes(url))]);
  }, [messages, processedLinkUrls, isHydrated]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (pin === pinCorrecto && pinCorrecto) {
      setIsAuthorized(true);
    } else {
      alert(pinCorrecto ? 'PIN Incorrecto' : 'PIN no configurado');
      setPin('');
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleSubmitChat = async (event: FormEvent) => {
    event.preventDefault();

    const messageText = input.trim();
    if (!messageText) return;

    if (messageText === '/new') {
      setArchivedMessages((prev) => [...prev, ...messages]);
      setMessages(initialMessages);
      setInput('');
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: messageText,
    };

    // Agregar mensaje del usuario inmediatamente
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      // Preparar mensajes para enviar al API (incluyendo memoria archivada y excluyendo el mensaje de bienvenida del sistema)
      const messagesToSend = archivedMessages
        .concat(messages)
        .filter(msg => msg.id !== 'welcome')
        .concat(userMessage)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // Si no podemos parsear el JSON, usar un mensaje genérico
        data = { error: 'Error en la respuesta del servidor', details: undefined };
      }

      if (!response.ok) {
        const errorMessage = (data && (data.error || data.details))
          ? `${data.error || 'Error del servidor'}${data.details ? `: ${data.details}` : ''}`
          : `Error del servidor (${response.status})`;
        throw new Error(errorMessage);
      }

      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: data.response || 'Lo siento, no pude generar una respuesta.',
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error al enviar mensaje:', error);

      const errorMessageText = error instanceof Error ? error.message : 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';
      console.error('Error final de chat:', errorMessageText);

      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: errorMessageText,
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  if (!pinCorrecto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/50">configuracion faltante</p>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-white">PIN no configurado</h1>
          <p className="mt-3 text-xs leading-5 text-white/70 font-mono">
            Agrega <code className="rounded bg-white/10 px-1 py-0.5 text-[9px] text-white font-mono">PIN_CORRECTO</code> a tu archivo <code className="rounded bg-white/10 px-1 py-0.5 text-[9px] text-white font-mono">.env.local</code> y vuelve a ejecutar el build.
          </p>
        </div>
      </div>
    );
  }

  if (!pinCorrecto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/50">configuracion faltante</p>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-white">PIN no configurado</h1>
          <p className="mt-3 text-xs leading-5 text-white/70 font-mono">
            Agrega <code className="rounded bg-white/10 px-1 py-0.5 text-[9px] text-white font-mono">PIN_CORRECTO</code> a tu archivo <code className="rounded bg-white/10 px-1 py-0.5 text-[9px] text-white font-mono">.env.local</code> y vuelve a ejecutar el build.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Pantalla de login - se muestra como overlay cuando no está autorizado */}
      {!isAuthorized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black px-4">
          <div className="w-full max-w-xs rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_-30px_rgba(255,255,255,0.25)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-block h-0.5 w-10 rounded-full bg-white/70" />
              <p className="text-[9px] font-mono uppercase tracking-[0.45em] text-white/50">acceso</p>
            </div>
            <h1 className="mt-3 text-lg font-semibold tracking-tight text-white">Ingresa tu PIN</h1>
            <p className="mt-2 text-[10px] leading-4 text-white/60 font-mono">Se requiere para entrar al asistente privado.</p>
            <form onSubmit={handleLogin} className="mt-5 space-y-3">
              <input
                type="password"
                maxLength={4}
                className="w-full rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-2.5 text-center text-base text-white outline-none transition focus:border-white/40 font-mono"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN"
                autoFocus
              />
              <button
                type="submit"
                className="w-full rounded-[1.5rem] bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90 font-mono"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Interfaz del chat - siempre se renderiza pero se oculta detrás del login */}
      <div className={`mx-auto flex h-full max-w-lg flex-col px-4 pb-32 pt-4 sm:px-5 ${!isAuthorized ? 'opacity-0 pointer-events-none' : ''}`}>
        <header className="mb-4 rounded-[2rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm sm:px-5">
          <div className="flex flex-col gap-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/50">PierUtu</p>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl font-mono">Asistente de presupuestos</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden pr-0">
          <div className="space-y-2.5 pb-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] rounded-[1.75rem] border px-3 py-2.5 text-xs leading-5 break-words overflow-hidden ${
                    message.role === 'user'
                      ? 'border-white/10 bg-white text-black rounded-br-none'
                      : 'border-white/10 bg-white/5 text-white rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words font-mono">
                    {renderMessageContent(message.content, message.id)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-black/95 px-4 py-3 backdrop-blur-md sm:px-5">
          <form onSubmit={handleSubmitChat} className="flex items-center gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Escribe los detalles del presupuesto..."
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white outline-none transition focus:border-white/40 font-mono"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-full bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-black transition disabled:cursor-not-allowed disabled:opacity-40 font-mono"
            >
              Enviar
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">
            made by AOCO
          </p>
        </footer>
      </div>
    </div>
  );
}
