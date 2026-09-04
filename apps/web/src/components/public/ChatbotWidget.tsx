'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ChatbotContext } from '@ai-crm/ai';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  quickReplies?: string[];
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: "Ciao! Sono l'assistente AI di AI Agency Italia. Aiutiamo aziende e studi a moltiplicare le conversioni e automatizzare i processi con agenti intelligenti su misura.\n\nIn quale settore opera la tua attività?",
      quickReplies: [
        'Ristorante / HORECA',
        'Studio Legale / Commercialista',
        'E-commerce & Store Online',
        'Hotel & Turismo',
        'Attività Locale / Servizi'
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [context, setContext] = useState<ChatbotContext>({ step: 'sector' });
  const [isThinking, setIsThinking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize unique session ID
  useEffect(() => {
    let currentSession = sessionStorage.getItem('ai_crm_chat_session');
    if (!currentSession) {
      currentSession = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem('ai_crm_chat_session', currentSession);
    }
    setSessionId(currentSession);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isThinking, isOpen]);

  const handleSend = async (userText: string) => {
    if (!userText.trim() || isThinking) return;

    setErrorMsg(null);
    const userMsgId = `usr-${Date.now()}`;
    const newMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: userText,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      // Build history for API
      const history = messages.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || `session_${Date.now()}`,
          message: userText,
          history,
          context,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore di connessione al servizio AI');
      }

      // Add Bot Message
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.reply,
        quickReplies: data.quickReplies,
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data.context) {
        setContext(data.context);
      }

      if (data.isComplete || data.demoCreated) {
        setIsSuccess(true);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err.message || 'Si è verificato un errore. Riprova.');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Trigger Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-3.5 text-white shadow-2xl shadow-blue-500/30 hover:scale-105 transition-all duration-200 cursor-pointer"
        >
          <div className="relative">
            <Bot className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-semibold text-sm">Parla con l&apos;AI & Prenota Demo</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[410px] h-[550px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  AI Advisor & Demo Live
                  <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                </h3>
                <p className="text-[11px] text-emerald-400 font-medium">Gemini AI Engine • Online</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-800 border border-slate-700/80 text-slate-100 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Quick replies for bot */}
                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                    {msg.quickReplies.map((reply, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(reply)}
                        className="text-xs bg-slate-900 hover:bg-blue-950 text-blue-300 hover:text-blue-200 border border-blue-900/60 hover:border-blue-600 px-3 py-1.5 rounded-full transition-colors cursor-pointer text-left shadow-sm"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 border border-slate-700/60 px-3.5 py-2 rounded-2xl rounded-bl-none w-fit animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                <span>L&apos;AI sta elaborando la risposta...</span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Demo Confirmation */}
            {isSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in-50">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <p className="font-semibold">Richiesta registrata con successo nel CRM!</p>
                  <p className="text-[11px] text-emerald-400 mt-0.5">Ti invieremo conferma via email per concordare l&apos;orario della demo.</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-slate-800 bg-slate-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(inputText);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={isSuccess ? "Richiesta completata! Scrivi per altre domande..." : "Scrivi un messaggio..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isThinking}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={!inputText.trim() || isThinking}
                className="h-9 w-9 p-0 rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
