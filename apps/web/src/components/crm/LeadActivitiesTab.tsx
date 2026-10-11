'use client';

import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Video,
  Clock,
  RotateCcw,
  CheckCircle,
  Plus,
  Download,
  ExternalLink,
  AlertTriangle,
  X,
  FileText,
  Calendar as CalendarIcon
} from 'lucide-react';

interface LeadActivitiesTabProps {
  leadId?: string;
  companyId?: string;
  targetName?: string;
  phoneNumber?: string;
}

export function LeadActivitiesTab({
  leadId,
  companyId,
  targetName,
  phoneNumber,
}: LeadActivitiesTabProps) {
  const [calls, setCalls] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
  const [isNewApptModalOpen, setIsNewApptModalOpen] = useState(false);
  const [isNewCallbackModalOpen, setIsNewCallbackModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [callForm, setCallForm] = useState({
    direction: 'outbound',
    callOutcome: 'answered_interested',
    phoneNumber: phoneNumber || '',
    durationSeconds: 180,
    notes: '',
    scheduleFollowup: false,
    followupDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    followupTime: '10:00',
    followupReason: '',
  });

  const [apptForm, setApptForm] = useState({
    title: `Incontro con ${targetName || 'Cliente'}`,
    description: '',
    appointmentType: 'discovery_call',
    locationType: 'video_call',
    meetingUrl: '',
    meetingAddress: '',
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '11:00',
    durationMinutes: 45,
  });

  const [cbForm, setCbForm] = useState({
    reason: '',
    priority: 'medium',
    date: new Date().toISOString().slice(0, 10),
    time: '14:30',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = leadId ? `leadId=${leadId}` : `companyId=${companyId}`;
      const [resCalls, resAppts, resCbs] = await Promise.all([
        fetch(`/api/activities/calls?${q}`),
        fetch(`/api/activities/appointments?${q}`),
        fetch(`/api/activities/callbacks?${q}`),
      ]);

      const [dataCalls, dataAppts, dataCbs] = await Promise.all([
        resCalls.json(),
        resAppts.json(),
        resCbs.json(),
      ]);

      if (dataCalls.success) setCalls(dataCalls.calls || []);
      if (dataAppts.success) setAppointments(dataAppts.appointments || []);
      if (dataCbs.success) setCallbacks(dataCbs.callbacks || []);
    } catch (err) {
      console.error('Errore caricamento attività:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [leadId, companyId]);

  // Log Call submit
  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        leadId,
        companyId,
        direction: callForm.direction,
        callOutcome: callForm.callOutcome,
        phoneNumber: callForm.phoneNumber || undefined,
        durationSeconds: Number(callForm.durationSeconds),
        notes: callForm.notes || undefined,
      };

      if (callForm.scheduleFollowup && callForm.followupReason) {
        payload.scheduleCallback = {
          scheduledAt: new Date(`${callForm.followupDate}T${callForm.followupTime}`).toISOString(),
          reason: callForm.followupReason,
          priority: 'high',
        };
      }

      const res = await fetch('/api/activities/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsLogCallModalOpen(false);
        setCallForm({ ...callForm, notes: '', scheduleFollowup: false, followupReason: '' });
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Create Appt submit
  const handleCreateAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const startIso = new Date(`${apptForm.startDate}T${apptForm.startTime}`).toISOString();
      const endIso = new Date(
        new Date(`${apptForm.startDate}T${apptForm.startTime}`).getTime() +
          apptForm.durationMinutes * 60 * 1000
      ).toISOString();

      const res = await fetch('/api/activities/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          companyId,
          title: apptForm.title,
          description: apptForm.description || undefined,
          appointmentType: apptForm.appointmentType,
          locationType: apptForm.locationType,
          meetingUrl: apptForm.meetingUrl || undefined,
          meetingAddress: apptForm.meetingAddress || undefined,
          scheduledStartTime: startIso,
          scheduledEndTime: endIso,
        }),
      });

      if (res.ok) {
        setIsNewApptModalOpen(false);
        setApptForm({ ...apptForm, description: '', meetingUrl: '' });
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Create Callback submit
  const handleCreateCb = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const scheduledAtIso = new Date(`${cbForm.date}T${cbForm.time}`).toISOString();
      const res = await fetch('/api/activities/callbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          companyId,
          reason: cbForm.reason,
          priority: cbForm.priority,
          scheduledAt: scheduledAtIso,
        }),
      });

      if (res.ok) {
        setIsNewCallbackModalOpen(false);
        setCbForm({ ...cbForm, reason: '' });
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Complete callback
  const handleCompleteCallback = async (id: string) => {
    try {
      const res = await fetch(`/api/activities/callbacks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Complete appointment
  const handleCompleteAppt = async (id: string) => {
    try {
      const res = await fetch(`/api/activities/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Aggregated timeline sorted descending
  const timeline = [
    ...calls.map((c) => ({ ...c, feedType: 'call', timestamp: c.calledAt })),
    ...appointments.map((a) => ({ ...a, feedType: 'appointment', timestamp: a.scheduledStartTime })),
    ...callbacks.map((cb) => ({ ...cb, feedType: 'callback', timestamp: cb.scheduledAt })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="text-sm text-slate-300 font-medium flex items-center gap-2">
          <span>Attività registrate:</span>
          <span className="font-semibold text-white">{timeline.length}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsLogCallModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <Phone className="h-3.5 w-3.5 text-emerald-400" />
            <span>Registra Chiamata</span>
          </button>
          <button
            onClick={() => setIsNewCallbackModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span>Pianifica Richiamata</span>
          </button>
          <button
            onClick={() => setIsNewApptModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Fissa Appuntamento</span>
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Caricamento attività...</div>
      ) : timeline.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
          <CalendarIcon className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <h4 className="text-base font-semibold text-slate-300">Nessuna attività registrata</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Non ci sono ancora chiamate o appuntamenti per questo contatto. Usa i pulsanti sopra per
            registrare una telefonata o fissare una riunione.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {timeline.map((item) => {
            const dateStr = new Date(item.timestamp).toLocaleString('it-IT');

            if (item.feedType === 'call') {
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0 mt-0.5">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          Chiamata {item.direction === 'inbound' ? 'Entrante' : 'Uscente'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/20">
                          {item.callOutcome}
                        </span>
                        {item.durationSeconds > 0 && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {Math.floor(item.durationSeconds / 60)}m {item.durationSeconds % 60}s
                          </span>
                        )}
                      </div>
                      {item.notes && <p className="text-xs text-slate-300 mt-1">{item.notes}</p>}
                      {item.caller?.name && (
                        <span className="text-[11px] text-slate-500 block mt-1">
                          Operatore: {item.caller.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-mono flex-shrink-0">
                    {dateStr}
                  </div>
                </div>
              );
            }

            if (item.feedType === 'appointment') {
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0 mt-0.5">
                      <Video className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{item.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/40">
                          {item.appointmentType}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-300 mt-1">{item.description}</p>
                      )}
                      {item.meetingUrl && (
                        <a
                          href={item.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link Riunione
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono">{dateStr}</span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/api/activities/appointments/${item.id}/ics`}
                        download
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="Scarica .ics"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      {item.status !== 'completed' && (
                        <button
                          onClick={() => handleCompleteAppt(item.id)}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"
                        >
                          Completa
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            if (item.feedType === 'callback') {
              const isOverdue = item.status === 'overdue';
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${
                        isOverdue
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          Richiamata: {item.reason}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isOverdue
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {item.priority}
                        </span>
                      </div>
                      {item.completedNotes && (
                        <p className="text-xs text-slate-400 mt-1">
                          Note chiusura: {item.completedNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono">{dateStr}</span>
                    {item.status !== 'completed' && (
                      <button
                        onClick={() => handleCompleteCallback(item.id)}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                      >
                        Segna Fatta
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* LOG CALL MODAL */}
      {isLogCallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-400" />
                Registra Chiamata
              </h3>
              <button
                onClick={() => setIsLogCallModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLogCall} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Direzione</label>
                  <select
                    value={callForm.direction}
                    onChange={(e) => setCallForm({ ...callForm, direction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="outbound">Uscente (Outbound)</option>
                    <option value="inbound">Entrante (Inbound)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Esito Chiamata *</label>
                  <select
                    value={callForm.callOutcome}
                    onChange={(e) => setCallForm({ ...callForm, callOutcome: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="answered_interested">Risposto - Interessato</option>
                    <option value="callback_requested">Richiesta Richiamata</option>
                    <option value="answered_not_interested">Risposto - Non Interessato</option>
                    <option value="no_answer">Nessuna Risposta</option>
                    <option value="busy">Occupato</option>
                    <option value="voicemail">Segreteria Telefonica</option>
                    <option value="wrong_number">Numero Errato</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Numero Chiamato</label>
                  <input
                    type="tel"
                    value={callForm.phoneNumber}
                    onChange={(e) => setCallForm({ ...callForm, phoneNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Durata (secondi)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={callForm.durationSeconds}
                    onChange={(e) => setCallForm({ ...callForm, durationSeconds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Note Chiamata</label>
                <textarea
                  rows={2}
                  placeholder="Esito sintetico della telefonata..."
                  value={callForm.notes}
                  onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              {/* Follow-up callback trigger */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={callForm.scheduleFollowup}
                    onChange={(e) => setCallForm({ ...callForm, scheduleFollowup: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Pianifica automaticamente una Richiamata di Follow-up</span>
                </label>

                {callForm.scheduleFollowup && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Motivo (es. Richiamare per discutere proposta)"
                        value={callForm.followupReason}
                        onChange={(e) => setCallForm({ ...callForm, followupReason: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        value={callForm.followupDate}
                        onChange={(e) => setCallForm({ ...callForm, followupDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="time"
                        value={callForm.followupTime}
                        onChange={(e) => setCallForm({ ...callForm, followupTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLogCallModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Salvataggio...' : 'Registra Chiamata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW APPOINTMENT MODAL */}
      {isNewApptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-400" />
                Fissa Appuntamento con {targetName || 'Cliente'}
              </h3>
              <button
                onClick={() => setIsNewApptModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppt} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Titolo Appuntamento *
                </label>
                <input
                  type="text"
                  required
                  value={apptForm.title}
                  onChange={(e) => setApptForm({ ...apptForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo</label>
                  <select
                    value={apptForm.appointmentType}
                    onChange={(e) => setApptForm({ ...apptForm, appointmentType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="discovery_call">Discovery Call</option>
                    <option value="demo_presentation">Demo Piattaforma</option>
                    <option value="quote_review">Revisione Preventivo</option>
                    <option value="kickoff_meeting">Kickoff Meeting</option>
                    <option value="in_person_meeting">Incontro Di Persona</option>
                    <option value="other">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Modalità</label>
                  <select
                    value={apptForm.locationType}
                    onChange={(e) => setApptForm({ ...apptForm, locationType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="video_call">Videochiamata (Meet/Zoom)</option>
                    <option value="client_office">Presso Sede Cliente</option>
                    <option value="our_office">Nostra Sede</option>
                    <option value="phone_call">Telefonica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={apptForm.startDate}
                    onChange={(e) => setApptForm({ ...apptForm, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Ora Inizio *</label>
                  <input
                    type="time"
                    required
                    value={apptForm.startTime}
                    onChange={(e) => setApptForm({ ...apptForm, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Durata (min)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={apptForm.durationMinutes}
                    onChange={(e) => setApptForm({ ...apptForm, durationMinutes: parseInt(e.target.value) || 45 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {apptForm.locationType === 'video_call' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Link Riunione</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={apptForm.meetingUrl}
                    onChange={(e) => setApptForm({ ...apptForm, meetingUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Indirizzo Incontro</label>
                  <input
                    type="text"
                    placeholder="Via Roma 1, Milano"
                    value={apptForm.meetingAddress}
                    onChange={(e) => setApptForm({ ...apptForm, meetingAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Note</label>
                <textarea
                  rows={2}
                  placeholder="Dettagli e obiettivi dell'incontro..."
                  value={apptForm.description}
                  onChange={(e) => setApptForm({ ...apptForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewApptModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Pianificazione...' : 'Fissa Appuntamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW CALLBACK MODAL */}
      {isNewCallbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-400" />
                Pianifica Richiamata
              </h3>
              <button
                onClick={() => setIsNewCallbackModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCb} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Motivo Richiamata *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Verificare ricezione preventivo"
                  value={cbForm.reason}
                  onChange={(e) => setCbForm({ ...cbForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={cbForm.date}
                    onChange={(e) => setCbForm({ ...cbForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Ora *</label>
                  <input
                    type="time"
                    required
                    value={cbForm.time}
                    onChange={(e) => setCbForm({ ...cbForm, time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Priorità</label>
                <select
                  value={cbForm.priority}
                  onChange={(e) => setCbForm({ ...cbForm, priority: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="low">Bassa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewCallbackModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold shadow-md shadow-amber-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Salvataggio...' : 'Salva Richiamata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
