'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';

interface AsistentePresupuestosClientProps {
  pinCorrecto: string;
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AsistentePresupuestosClient({ pinCorrecto }: AsistentePresupuestosClientProps) {
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Bienvenido al asistente de presupuestos. Ingresa los detalles y te ayudare a estructurarlo.',
    },
  ]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (pin === pinCorrecto) {
      setIsAuthorized(true);
    } else {
      alert('PIN Incorrecto');
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-8">
          <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-white/50">acceso privado</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Ingresa tu PIN</h1>
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <input
              type="password"
              maxLength={4}
              className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-center text-xl text-white outline-none transition focus:border-white/40"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-3xl bg-white px-4 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90"
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
      <div className="mx-auto flex h-full max-w-lg flex-col px-4 pb-32 pt-5 sm:px-5">
        <header className="mb-5 rounded-[2rem] border border-white/10 bg-white/5 px-4 py-5 backdrop-blur-sm sm:px-5">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/50">CLAUDE CODE</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Asistente de presupuestos</h1>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/60 sm:text-base">
            Interfaz móvil, minimalista y limpia inspirada en Claude Code.
          </p>
        </header>

        <main className="flex-1 overflow-y-auto pr-0">
          <div className="space-y-3 pb-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] rounded-[1.75rem] border px-4 py-3 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'border-white/10 bg-white text-black rounded-br-none'
                      : 'border-white/10 bg-white/5 text-white rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-sans">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </main>

        <footer className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-black/95 px-4 py-4 backdrop-blur-md sm:px-5">
          <form onSubmit={handleSubmitChat} className="flex items-center gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Escribe los detalles del presupuesto..."
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/40"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-full bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
          <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-white/40">
            Optimizado para móvil • Estilo Claude Code
          </p>
        </footer>
      </div>
    </div>
  );
}
