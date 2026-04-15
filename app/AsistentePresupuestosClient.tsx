'use client';

import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';

interface AsistentePresupuestosClientProps {
  pinCorrecto: string;
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AsistentePresupuestosClient({ pinCorrecto }: AsistentePresupuestosClientProps) {
  // Inicializar estado desde localStorage
  const getInitialAuth = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pierutu-auth') === 'true';
    }
    return false;
  };

  const getInitialMessages = (): Message[] => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pierutu-messages');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (error) {
          console.warn('Error loading saved messages:', error);
        }
      }
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Bienvenido al asistente de presupuestos. Ingresa los detalles y te ayudare a estructurarlo.',
      },
    ];
  };

  const getInitialInput = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pierutu-input') || '';
    }
    return '';
  };

  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(getInitialAuth);
  const [input, setInput] = useState(getInitialInput);
  const [messages, setMessages] = useState<Message[]>(getInitialMessages);

  // Memoria de sesión - guardar cambios en localStorage
  useEffect(() => {
    localStorage.setItem('pierutu-auth', isAuthorized.toString());
  }, [isAuthorized]);

  useEffect(() => {
    localStorage.setItem('pierutu-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('pierutu-input', input);
  }, [input]);

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

  const handleSubmitChat = (event: FormEvent) => {
    event.preventDefault();

    const messageText = input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: messageText,
    };

    const assistantMessage: Message = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      content: 'Recibido. Estoy generando el presupuesto... (implementa aqui tu logica de backend).',
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
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
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex h-full max-w-lg flex-col px-4 pb-32 pt-4 sm:px-5">
        <header className="mb-4 rounded-[2rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm sm:px-5">
          <div className="flex flex-col gap-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/50">PierUtu</p>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl font-mono">Asistente de presupuestos</h1>
          </div>
         
        </header>

        <main className="flex-1 overflow-y-auto pr-0">
          <div className="space-y-2.5 pb-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] rounded-[1.75rem] border px-3 py-2.5 text-xs leading-5 ${
                    message.role === 'user'
                      ? 'border-white/10 bg-white text-black rounded-br-none'
                      : 'border-white/10 bg-white/5 text-white rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-mono">{message.content}</p>
                </div>
              </div>
            ))}
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
