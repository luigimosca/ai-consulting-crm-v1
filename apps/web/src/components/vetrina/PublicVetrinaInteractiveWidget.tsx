'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Calendar,
  Send,
  CheckCircle2,
  Sparkles,
  Phone,
  Clock,
  MapPin,
  Bot,
  UserCheck,
  ExternalLink,
} from 'lucide-react';

interface ServiceItem {
  name: string;
  description: string;
  priceLabel: string;
  badge?: string;
}

interface ChatMessage {
  role: 'customer' | 'agent_ai' | 'operator';
  text: string;
  timestamp: string;
}

interface PublicVetrinaInteractiveWidgetProps {
  slug: string;
  companyName: string;
  city: string;
  agentName: string;
  whatsappPhone: string;
  welcomeMessage: string;
  businessHours: string;
  addressInfo: string;
  services: ServiceItem[];
  primaryCtaText: string;
}

export default function PublicVetrinaInteractiveWidget({
  slug,
  companyName,
  city,
  agentName,
  whatsappPhone,
  welcomeMessage,
  businessHours,
  addressInfo,
  services,
  primaryCtaText,
}: PublicVetrinaInteractiveWidgetProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [serviceSelected, setServiceSelected] = useState(services[0]?.name || '');
  const [preferredDate, setPreferredDate] = useState('');
  const [messageText, setMessageText] = useState('');
  const [chatInput, setChatInput] = useState('');

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent_ai',
      text: welcomeMessage,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);

  const cleanPhoneForWa = whatsappPhone.replace(/[^0-9]/g, '');

  async function sendInteraction(opts: {
    customMessage?: string;
    isBookingForm?: boolean;
  }) {
    setErrorMsg(null);
    const nameToUse = customerName.trim() || 'Visitatore Sito Web';
    const phoneToUse = customerPhone.trim() || '+39 340 0000000';

    if (opts.isBookingForm && (!customerName.trim() || !customerPhone.trim())) {
      setErrorMsg('Inserisci il tuo Nome e il tuo Numero di Telefono/WhatsApp per confermare la richiesta.');
      return;
    }

    const textToSend = opts.customMessage
      ? opts.customMessage
      : opts.isBookingForm
      ? messageText.trim() || `Vorrei prenotare: ${serviceSelected || 'Appuntamento'}`
      : chatInput.trim();

    if (!textToSend) {
      setErrorMsg('Scrivi un messaggio o seleziona una richiesta.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/vetrina/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: nameToUse,
          customerPhone: phoneToUse,
          customerEmail: customerEmail.trim() || undefined,
          messageText: textToSend,
          serviceSelected: opts.isBookingForm ? serviceSelected : undefined,
          preferredDate: opts.isBookingForm ? preferredDate : undefined,
          conversationId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante l invio');
      }

      const conv = data.conversation;
      if (conv) {
        setConversationId(conv.id);
        if (Array.isArray(conv.messages)) {
          setMessages([
            {
              role: 'agent_ai',
              text: welcomeMessage,
              timestamp: conv.createdAt || new Date().toISOString(),
            },
            ...conv.messages,
          ]);
        }
        if (conv.linkedAppointmentId || conv.status === 'prenotazione_confermata') {
          setBookingConfirmed(true);
        }
        if (conv.linkedLeadId) {
          setLeadCaptured(true);
        }
      }

      if (opts.isBookingForm) {
        setMessageText('');
      } else {
        setChatInput('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore di connessione');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="prenota" className="py-16 bg-slate-900/90 border-t border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Risposta Istantanea & Prenotazione Diretta 24/7
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Prenota un Appuntamento o Chiedi al Nostro Assistente AI
          </h2>
          <p className="text-sm text-slate-300">
            Compila il modulo rapido oppure scrivi in chat al nostro concierge automatico di{' '}
            <strong className="text-white">{companyName}</strong> ({city}): la tua richiesta viene registrata in tempo reale nella nostra agenda!
          </p>
        </div>

        {errorMsg && (
          <div className="max-w-2xl mx-auto mb-6 p-3.5 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Direct Booking / Quote Request Form (6 cols) */}
          <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Prenotazione & Preventivo Rapido</h3>
                  <p className="text-xs text-slate-400">Conferma immediata in agenda senza attese</p>
                </div>
              </div>
              {bookingConfirmed && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confermato
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Il Tuo Nome e Cognome *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Es. Marco Rossi"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Cellulare / WhatsApp *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Es. +39 347 1234567"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Email (Opzionale)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="marco.rossi@email.it"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Giorno e Fascia Oraria Preferita</label>
                <input
                  type="text"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  placeholder="Es. Domani ore 19:30 / Giovedì mattina"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {services.length > 0 && (
              <div className="text-xs">
                <label className="font-semibold text-slate-300 block mb-1">Servizio o Proposta di Interesse</label>
                <select
                  value={serviceSelected}
                  onChange={(e) => setServiceSelected(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                >
                  {services.map((s, idx) => (
                    <option key={idx} value={s.name}>
                      {s.name} ({s.priceLabel})
                    </option>
                  ))}
                  <option value="Richiesta Informazioni / Altro">Altra richiesta personalizzata</option>
                </select>
              </div>
            )}

            <div className="text-xs">
              <label className="font-semibold text-slate-300 block mb-1">Dettagli o Richieste Particolari</label>
              <textarea
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Scrivi qui numero di persone, esigenze specifiche o domande..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => sendInteraction({ isBookingForm: true })}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              <span>{submitting ? 'Registrazione in corso...' : primaryCtaText || 'Conferma Prenotazione Ora'}</span>
            </button>

            {bookingConfirmed && (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Richiesta Registrata e Confermata in Agenda!
                </div>
                <p>
                  Il nostro sistema ha salvato i tuoi riferimenti e bloccato la tua richiesta. Guarda la risposta dettagliata del nostro assistente nella chat qui a fianco!
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-400">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Orari:</strong> {businessHours}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span><strong>Sede:</strong> {addressInfo}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Live WhatsApp AI 24/7 Concierge Widget (6 cols) */}
          <div className="lg:col-span-6 bg-slate-950 border border-green-800/50 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[540px]">
            {/* WhatsApp Header */}
            <div className="bg-gradient-to-r from-green-900/90 to-emerald-900/80 px-5 py-4 border-b border-green-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-400/40 flex items-center justify-center text-green-300">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{agentName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/30 text-green-200 border border-green-400/30">
                      ● Online 24/7
                    </span>
                  </div>
                  <div className="text-[11px] text-green-200/80 font-mono">
                    WhatsApp Business: {whatsappPhone}
                  </div>
                </div>
              </div>

              {cleanPhoneForWa && (
                <a
                  href={`https://wa.me/${cleanPhoneForWa}?text=${encodeURIComponent(`Ciao ${companyName}, vorrei informazioni e prenotare!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-[11px] font-bold flex items-center gap-1 shadow"
                >
                  <span>Apri App</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/95">
              {messages.map((m, i) => {
                const isCust = m.role === 'customer';
                return (
                  <div
                    key={i}
                    className={`flex flex-col ${isCust ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-line ${
                        isCust
                          ? 'bg-emerald-700 text-white rounded-tr-none'
                          : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none'
                      }`}
                    >
                      <div className="text-[10px] font-bold mb-1 opacity-75">
                        {isCust ? `👤 ${customerName || 'Tu'}` : `🤖 ${agentName}`}
                      </div>
                      {m.text}
                    </div>
                  </div>
                );
              })}

              {(bookingConfirmed || leadCaptured) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {leadCaptured && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <UserCheck className="h-3 w-3" /> Contatto Ricevuto dal Team
                    </span>
                  )}
                  {bookingConfirmed && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Prenotazione Registrata in Agenda
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quick Prompt Pills */}
            <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  sendInteraction({
                    customMessage: 'Ciao! Vorrei prenotare per domani, avete disponibilità?',
                  })
                }
                disabled={submitting}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-800/50 text-[11px] transition-colors"
              >
                📅 Prenota Ora
              </button>
              <button
                type="button"
                onClick={() =>
                  sendInteraction({
                    customMessage: 'Quali sono i vostri prezzi, menu o tariffe aggiornate?',
                  })
                }
                disabled={submitting}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-800/50 text-[11px] transition-colors"
              >
                💰 Prezzi & Offerte
              </button>
              <button
                type="button"
                onClick={() =>
                  sendInteraction({
                    customMessage: 'Siete aperti oggi? Dove vi trovate e dove posso parcheggiare?',
                  })
                }
                disabled={submitting}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-800/50 text-[11px] transition-colors"
              >
                📍 Orari & Parcheggio
              </button>
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendInteraction({ isBookingForm: false });
              }}
              className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Scrivi qui una domanda (es. 'Avete opzioni senza glutine?' o 'Prenoto per domani')..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-green-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting || !chatInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Invia</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Floating Bottom-Right WhatsApp Quick Button */}
      <a
        href="#prenota"
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow-2xl shadow-green-600/40 border border-green-400/40 flex items-center gap-2 transition-transform hover:scale-105"
      >
        <MessageSquare className="h-4 w-4" />
        <span>Chatta & Prenota 24/7</span>
      </a>
    </section>
  );
}
