'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  PhoneCall,
  Video,
  MapPin,
  CheckCircle,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Users,
  ExternalLink,
  X,
  FileText,
  AlertTriangle,
  RotateCcw,
  Radio,
  Copy,
  RefreshCw,
  Check
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  eventType: 'appointment' | 'callback' | 'call';
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  priority?: string;
  locationType?: string;
  meetingUrl?: string | null;
  targetName?: string;
  leadId?: string | null;
  companyId?: string | null;
  userName?: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'appointment' | 'callback'>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Modals state
  const [isNewApptModalOpen, setIsNewApptModalOpen] = useState(false);
  const [isNewCallbackModalOpen, setIsNewCallbackModalOpen] = useState(false);
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncData, setSyncData] = useState<{
    httpFeedUrl: string;
    webcalFeedUrl: string;
    token: string;
  } | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Form states for modals
  const [newApptForm, setNewApptForm] = useState({
    title: '',
    description: '',
    appointmentType: 'discovery_call',
    locationType: 'video_call',
    meetingUrl: '',
    meetingAddress: '',
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    durationMinutes: 45,
    leadId: '',
    companyId: '',
  });

  const [newCallbackForm, setNewCallbackForm] = useState({
    reason: '',
    priority: 'medium',
    date: new Date().toISOString().slice(0, 10),
    time: '11:00',
    leadId: '',
    companyId: '',
  });

  const [logCallForm, setLogCallForm] = useState({
    direction: 'outbound',
    callOutcome: 'answered_interested',
    phoneNumber: '',
    durationSeconds: 120,
    notes: '',
    scheduleFollowup: false,
    followupDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    followupTime: '10:00',
    followupReason: '',
    leadId: '',
    companyId: '',
  });

  // Calculate current range based on currentDate and viewMode
  const { startIso, endIso } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      // First day of month (or padding from previous month) to last day
      const start = new Date(year, month - 1, 20);
      const end = new Date(year, month + 2, 10);
      return { startIso: start.toISOString(), endIso: end.toISOString() };
    } else if (viewMode === 'week') {
      const day = currentDate.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(currentDate);
      monday.setDate(currentDate.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      return { startIso: monday.toISOString(), endIso: sunday.toISOString() };
    } else {
      // Agenda: 30 days window
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setDate(currentDate.getDate() + 30);
      return { startIso: start.toISOString(), endIso: end.toISOString() };
    }
  }, [currentDate, viewMode]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/activities/calendar?startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Errore caricamento calendario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [startIso, endIso]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return events;
    return events.filter((e) => e.eventType === typeFilter);
  }, [events, typeFilter]);

  // Statistics KPIs
  const stats = useMemo(() => {
    const appts = events.filter((e) => e.eventType === 'appointment');
    const callbacks = events.filter((e) => e.eventType === 'callback');
    const overdueCallbacks = callbacks.filter((c) => c.status === 'overdue');
    const pendingCallbacks = callbacks.filter((c) => c.status === 'pending');

    return {
      totalAppts: appts.length,
      pendingCallbacks: pendingCallbacks.length,
      overdueCallbacks: overdueCallbacks.length,
    };
  }, [events]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Submit handlers for modals
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const startIso = new Date(`${newApptForm.startDate}T${newApptForm.startTime}`).toISOString();
      const endIso = new Date(
        new Date(`${newApptForm.startDate}T${newApptForm.startTime}`).getTime() +
          newApptForm.durationMinutes * 60 * 1000
      ).toISOString();

      const res = await fetch('/api/activities/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newApptForm.title,
          description: newApptForm.description || undefined,
          appointmentType: newApptForm.appointmentType,
          locationType: newApptForm.locationType,
          meetingUrl: newApptForm.meetingUrl || undefined,
          meetingAddress: newApptForm.meetingAddress || undefined,
          scheduledStartTime: startIso,
          scheduledEndTime: endIso,
          leadId: newApptForm.leadId || undefined,
          companyId: newApptForm.companyId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsNewApptModalOpen(false);
        setNewApptForm({
          title: '',
          description: '',
          appointmentType: 'discovery_call',
          locationType: 'video_call',
          meetingUrl: '',
          meetingAddress: '',
          startDate: new Date().toISOString().slice(0, 10),
          startTime: '10:00',
          durationMinutes: 45,
          leadId: '',
          companyId: '',
        });
        setActionSuccessMessage('Appuntamento pianificato con successo!');
        setTimeout(() => setActionSuccessMessage(null), 4000);
        await loadEvents();
      } else {
        alert(data.error || 'Errore nella creazione');
      }
    } catch (err: any) {
      alert(err.message || 'Errore di rete');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const scheduledAtIso = new Date(`${newCallbackForm.date}T${newCallbackForm.time}`).toISOString();
      const res = await fetch('/api/activities/callbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: newCallbackForm.reason,
          priority: newCallbackForm.priority,
          scheduledAt: scheduledAtIso,
          leadId: newCallbackForm.leadId || undefined,
          companyId: newCallbackForm.companyId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsNewCallbackModalOpen(false);
        setNewCallbackForm({
          reason: '',
          priority: 'medium',
          date: new Date().toISOString().slice(0, 10),
          time: '11:00',
          leadId: '',
          companyId: '',
        });
        setActionSuccessMessage('Richiamata pianificata con successo!');
        setTimeout(() => setActionSuccessMessage(null), 4000);
        await loadEvents();
      } else {
        alert(data.error || 'Errore nella creazione');
      }
    } catch (err: any) {
      alert(err.message || 'Errore di rete');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        direction: logCallForm.direction,
        callOutcome: logCallForm.callOutcome,
        phoneNumber: logCallForm.phoneNumber || undefined,
        durationSeconds: Number(logCallForm.durationSeconds),
        notes: logCallForm.notes || undefined,
        leadId: logCallForm.leadId || undefined,
        companyId: logCallForm.companyId || undefined,
      };

      if (logCallForm.scheduleFollowup && logCallForm.followupReason) {
        payload.scheduleCallback = {
          scheduledAt: new Date(`${logCallForm.followupDate}T${logCallForm.followupTime}`).toISOString(),
          reason: logCallForm.followupReason,
          priority: 'high',
        };
      }

      const res = await fetch('/api/activities/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsLogCallModalOpen(false);
        setLogCallForm({
          direction: 'outbound',
          callOutcome: 'answered_interested',
          phoneNumber: '',
          durationSeconds: 120,
          notes: '',
          scheduleFollowup: false,
          followupDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          followupTime: '10:00',
          followupReason: '',
          leadId: '',
          companyId: '',
        });
        setActionSuccessMessage('Chiamata registrata con successo!');
        setTimeout(() => setActionSuccessMessage(null), 4000);
        await loadEvents();
      } else {
        alert(data.error || 'Errore nella registrazione');
      }
    } catch (err: any) {
      alert(err.message || 'Errore di rete');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status in detail modal
  const handleUpdateStatus = async (status: string) => {
    if (!selectedEvent) return;
    setSubmitting(true);
    try {
      if (selectedEvent.eventType === 'appointment') {
        const res = await fetch(`/api/activities/appointments/${selectedEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          setSelectedEvent({ ...selectedEvent, status });
          await loadEvents();
        }
      } else if (selectedEvent.eventType === 'callback') {
        const res = await fetch(`/api/activities/callbacks/${selectedEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          setSelectedEvent({ ...selectedEvent, status });
          await loadEvents();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSyncModal = async () => {
    setIsSyncModalOpen(true);
    setLoadingSync(true);
    try {
      const res = await fetch('/api/activities/calendar/sync-token');
      const data = await res.json();
      if (data.success) {
        setSyncData({
          httpFeedUrl: data.httpFeedUrl,
          webcalFeedUrl: data.webcalFeedUrl,
          token: data.token,
        });
      }
    } catch (err) {
      console.error('Failed to load sync token', err);
    } finally {
      setLoadingSync(false);
    }
  };

  const handleRegenerateSyncToken = async () => {
    if (!confirm('Sei sicuro di voler rigenerare il token? I calendari precedentemente collegati smetteranno di sincronizzarsi finché non aggiorni il link.')) {
      return;
    }
    setLoadingSync(true);
    try {
      const res = await fetch('/api/activities/calendar/sync-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncData({
          httpFeedUrl: data.httpFeedUrl,
          webcalFeedUrl: data.webcalFeedUrl,
          token: data.token,
        });
        setActionSuccessMessage('Nuovo link feed generato con successo!');
        setTimeout(() => setActionSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to regenerate sync token', err);
    } finally {
      setLoadingSync(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2500);
  };

  // Month grid generator
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday is 1, Sunday is 0 -> adjust so Monday is first day (0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Next month padding to complete 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {actionSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl shadow-emerald-950/40 border border-emerald-500 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Calendario & Attività Commerciali</h1>
              <p className="text-sm text-slate-400">
                Pianifica appuntamenti, video call, richiamate e traccia le interazioni con lead e clienti.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenSyncModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 text-sm font-medium transition-all shadow-sm"
            title="Sincronizzazione in tempo reale con Google Calendar, Apple Calendar o Outlook"
          >
            <Radio className="h-4 w-4 text-indigo-400" />
            <span>Sincronizza Google Calendar</span>
          </button>
          <button
            onClick={() => setIsLogCallModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
          >
            <Phone className="h-4 w-4 text-emerald-400" />
            <span>Registra Chiamata</span>
          </button>
          <button
            onClick={() => setIsNewCallbackModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
          >
            <RotateCcw className="h-4 w-4 text-amber-400" />
            <span>Nuova Richiamata</span>
          </button>
          <button
            onClick={() => setIsNewApptModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-md shadow-blue-600/25 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Nuovo Appuntamento</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Appuntamenti Periodo</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.totalAppts}</div>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Video className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Richiamate In Sospeso</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{stats.pendingCallbacks}</div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Richiamate Scadute</div>
            <div className={`text-2xl font-bold mt-1 ${stats.overdueCallbacks > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
              {stats.overdueCallbacks}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${stats.overdueCallbacks > 0 ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Toolbar: Navigation & View Selectors */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Oggi
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Successivo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="text-lg font-semibold text-white capitalize">{monthName}</div>
        </div>

        {/* Filters & View Switchers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                typeFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tutti ({events.length})
            </button>
            <button
              onClick={() => setTypeFilter('appointment')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                typeFilter === 'appointment' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Appuntamenti
            </button>
            <button
              onClick={() => setTypeFilter('callback')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                typeFilter === 'callback' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Richiamate
            </button>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'month' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mese
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'agenda' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar View Area */}
      {viewMode === 'month' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 bg-slate-950/60 border-b border-slate-800 text-center py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mer</div>
            <div>Gio</div>
            <div>Ven</div>
            <div>Sab</div>
            <div>Dom</div>
          </div>

          {/* Month Day Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60">
            {monthDays.map((cell, idx) => {
              const dateIsoStr = cell.date.toISOString().slice(0, 10);
              const isToday = new Date().toISOString().slice(0, 10) === dateIsoStr;

              // Events for this day
              const dayEvents = filteredEvents.filter((e) => e.startTime.slice(0, 10) === dateIsoStr);

              return (
                <div
                  key={idx}
                  className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors ${
                    cell.isCurrentMonth ? 'bg-slate-900/50 hover:bg-slate-800/30' : 'bg-slate-950/40 text-slate-600'
                  } ${isToday ? 'ring-2 ring-inset ring-blue-500/50 bg-blue-950/15' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-sm'
                          : cell.isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-500 font-mono">{dayEvents.length}</span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                    {dayEvents.map((evt) => {
                      const isAppt = evt.eventType === 'appointment';
                      const isOverdue = evt.status === 'overdue';
                      const timeStr = new Date(evt.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <button
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] truncate font-medium flex items-center gap-1.5 border transition-all ${
                            isAppt
                              ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/20'
                              : isOverdue
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'
                          }`}
                        >
                          {isAppt ? (
                            <Video className="h-3 w-3 flex-shrink-0 text-blue-400" />
                          ) : (
                            <Clock className="h-3 w-3 flex-shrink-0 text-amber-400" />
                          )}
                          <span className="font-mono text-[10px] opacity-75">{timeStr}</span>
                          <span className="truncate">{evt.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Prossime Attività in Agenda</h2>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Nessuna attività programmata nel periodo selezionato.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((evt) => {
                const isAppt = evt.eventType === 'appointment';
                const isOverdue = evt.status === 'overdue';
                const startDt = new Date(evt.startTime);

                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl flex-shrink-0 ${
                          isAppt
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : isOverdue
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {isAppt ? <Video className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-base">{evt.title}</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              evt.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : evt.status === 'overdue'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {evt.status}
                          </span>
                        </div>
                        {evt.targetName && (
                          <div className="text-sm text-slate-400 mt-0.5">
                            Target: <span className="text-slate-200">{evt.targetName}</span>
                          </div>
                        )}
                        {evt.meetingUrl && (
                          <a
                            href={evt.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {evt.meetingUrl}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex md:flex-col items-center md:items-end justify-between gap-1 text-xs text-slate-400">
                      <div className="font-medium text-slate-200">
                        {startDt.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="font-mono">
                        {startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider ${
                    selectedEvent.eventType === 'appointment'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {selectedEvent.eventType === 'appointment' ? 'Appuntamento' : 'Richiamata'}
                </span>
                <span className="text-xs text-slate-400 uppercase font-mono">{selectedEvent.status}</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedEvent.title}</h3>
                {selectedEvent.targetName && (
                  <p className="text-sm text-slate-400 mt-1">
                    Associato a: <span className="text-white font-medium">{selectedEvent.targetName}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Orario Inizio</span>
                  <span className="text-slate-200 font-mono">
                    {new Date(selectedEvent.startTime).toLocaleString('it-IT')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Orario Fine</span>
                  <span className="text-slate-200 font-mono">
                    {new Date(selectedEvent.endTime).toLocaleString('it-IT')}
                  </span>
                </div>
                {selectedEvent.userName && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block mb-0.5">Operatore</span>
                    <span className="text-slate-200 font-medium">{selectedEvent.userName}</span>
                  </div>
                )}
              </div>

              {selectedEvent.meetingUrl && (
                <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 flex items-center justify-between">
                  <div className="truncate mr-3">
                    <span className="text-xs text-blue-400 block mb-0.5">Link Riunione</span>
                    <span className="text-xs text-blue-200 font-mono truncate block">
                      {selectedEvent.meetingUrl}
                    </span>
                  </div>
                  <a
                    href={selectedEvent.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Partecipa
                  </a>
                </div>
              )}

              {/* Status Update Actions */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {selectedEvent.eventType === 'appointment' && (
                    <a
                      href={`/api/activities/appointments/${selectedEvent.id}/ics`}
                      download
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Esporta .ics
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedEvent.status !== 'completed' && (
                    <button
                      disabled={submitting}
                      onClick={() => handleUpdateStatus('completed')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Segna Completato
                    </button>
                  )}
                  {selectedEvent.status !== 'cancelled' && selectedEvent.status !== 'completed' && (
                    <button
                      disabled={submitting}
                      onClick={() => handleUpdateStatus('cancelled')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-medium transition-all"
                    >
                      Annulla
                    </button>
                  )}
                </div>
              </div>
            </div>
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
                Pianifica Nuovo Appuntamento
              </h3>
              <button
                onClick={() => setIsNewApptModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Titolo Appuntamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Demo Piattaforma AI & CRM"
                  value={newApptForm.title}
                  onChange={(e) => setNewApptForm({ ...newApptForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo</label>
                  <select
                    value={newApptForm.appointmentType}
                    onChange={(e) => setNewApptForm({ ...newApptForm, appointmentType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="discovery_call">Discovery Call</option>
                    <option value="demo_presentation">Demo / Presentazione</option>
                    <option value="quote_review">Revisione Preventivo</option>
                    <option value="kickoff_meeting">Kickoff Commessa</option>
                    <option value="in_person_meeting">Incontro Di Persona</option>
                    <option value="other">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Modalità</label>
                  <select
                    value={newApptForm.locationType}
                    onChange={(e) => setNewApptForm({ ...newApptForm, locationType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
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
                    value={newApptForm.startDate}
                    onChange={(e) => setNewApptForm({ ...newApptForm, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Ora Inizio *</label>
                  <input
                    type="time"
                    required
                    value={newApptForm.startTime}
                    onChange={(e) => setNewApptForm({ ...newApptForm, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Durata (min)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={newApptForm.durationMinutes}
                    onChange={(e) => setNewApptForm({ ...newApptForm, durationMinutes: parseInt(e.target.value) || 45 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {newApptForm.locationType === 'video_call' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Link Riunione (Google Meet, Zoom, Teams)
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={newApptForm.meetingUrl}
                    onChange={(e) => setNewApptForm({ ...newApptForm, meetingUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Indirizzo Luogo Incontro
                  </label>
                  <input
                    type="text"
                    placeholder="Via Roma 1, Milano"
                    value={newApptForm.meetingAddress}
                    onChange={(e) => setNewApptForm({ ...newApptForm, meetingAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Note / Obiettivi</label>
                <textarea
                  rows={2}
                  placeholder="Obiettivi dell'incontro, argomenti da toccare..."
                  value={newApptForm.description}
                  onChange={(e) => setNewApptForm({ ...newApptForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
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
                  {submitting ? 'Pianificazione...' : 'Salva Appuntamento'}
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
                Pianifica Nuova Richiamata
              </h3>
              <button
                onClick={() => setIsNewCallbackModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCallback} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Motivo Richiamata *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Follow-up preventivo inviato ieri"
                  value={newCallbackForm.reason}
                  onChange={(e) => setNewCallbackForm({ ...newCallbackForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={newCallbackForm.date}
                    onChange={(e) => setNewCallbackForm({ ...newCallbackForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Ora *</label>
                  <input
                    type="time"
                    required
                    value={newCallbackForm.time}
                    onChange={(e) => setNewCallbackForm({ ...newCallbackForm, time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Priorità</label>
                <select
                  value={newCallbackForm.priority}
                  onChange={(e) => setNewCallbackForm({ ...newCallbackForm, priority: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
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
                  {submitting ? 'Salvataggio...' : 'Pianifica Richiamata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG CALL MODAL */}
      {isLogCallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-400" />
                Registra Chiamata Telefonica
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
                    value={logCallForm.direction}
                    onChange={(e) => setLogCallForm({ ...logCallForm, direction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="outbound">Uscente (Outbound)</option>
                    <option value="inbound">Entrante (Inbound)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Esito Chiamata *</label>
                  <select
                    value={logCallForm.callOutcome}
                    onChange={(e) => setLogCallForm({ ...logCallForm, callOutcome: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
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
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Numero Telefonico</label>
                  <input
                    type="tel"
                    placeholder="+39 333 1234567"
                    value={logCallForm.phoneNumber}
                    onChange={(e) => setLogCallForm({ ...logCallForm, phoneNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Durata (secondi)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={logCallForm.durationSeconds}
                    onChange={(e) => setLogCallForm({ ...logCallForm, durationSeconds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Note Chiamata</label>
                <textarea
                  rows={2}
                  placeholder="Dettagli discussi, obiezioni, prossimi passi..."
                  value={logCallForm.notes}
                  onChange={(e) => setLogCallForm({ ...logCallForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Checkbox follow-up callback */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={logCallForm.scheduleFollowup}
                    onChange={(e) => setLogCallForm({ ...logCallForm, scheduleFollowup: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Pianifica automaticamente una Richiamata di Follow-up</span>
                </label>

                {logCallForm.scheduleFollowup && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Motivo (es. Chiamare dopo invio brochure)"
                        value={logCallForm.followupReason}
                        onChange={(e) => setLogCallForm({ ...logCallForm, followupReason: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        value={logCallForm.followupDate}
                        onChange={(e) => setLogCallForm({ ...logCallForm, followupDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="time"
                        value={logCallForm.followupTime}
                        onChange={(e) => setLogCallForm({ ...logCallForm, followupTime: e.target.value })}
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

      {/* Sincronizza con Google Calendar Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsSyncModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Radio className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Sincronizzazione Google Calendar & iCal</h3>
                <p className="text-xs text-slate-400">
                  Iscriviti al feed live con notifiche automatiche prima di ogni scadenza
                </p>
              </div>
            </div>

            {loadingSync ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
                <span className="text-sm">Caricamento credenziali feed in corso...</span>
              </div>
            ) : syncData ? (
              <div className="space-y-5 text-sm">
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                    <Radio className="h-4 w-4" /> Notifiche Push & Allarmi Inclusi
                  </div>
                  <p className="text-xs text-indigo-200/80 leading-relaxed">
                    Questo feed include <strong>allarmi preimpostati (VALARM)</strong> 15 minuti e 1 ora prima di appuntamenti, video call, richiamate e scadenze attività. Google Calendar e Apple Calendar mostreranno notifiche native sul tuo smartphone e computer.
                  </p>
                </div>

                {/* Feed URL box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    URL di Sottoscrizione Calendario (iCal Feed)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={syncData.httpFeedUrl}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-300 select-all focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => copyToClipboard(syncData.httpFeedUrl)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 flex-shrink-0"
                    >
                      {copiedFeed ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-300" />
                          <span>Copiato!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copia URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Direct 1-click webcal link */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200 block">Hai Mac, iPhone o Outlook?</span>
                    <span className="text-slate-400">Puoi iscriverti direttamente con 1 click tramite protocollo webcal.</span>
                  </div>
                  <a
                    href={syncData.webcalFeedUrl}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors flex-shrink-0 ml-3"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Apri webcal://</span>
                  </a>
                </div>

                {/* Step by step Google Calendar guide */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Come aggiungerlo a Google Calendar in 30 secondi:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400 pl-1">
                    <li>Apri <strong className="text-slate-300">Google Calendar</strong> sul computer.</li>
                    <li>Sulla sinistra, accanto ad <em>"Altri calendari"</em>, clicca su <strong className="text-slate-300">+</strong> e seleziona <strong className="text-slate-300">"Da URL"</strong>.</li>
                    <li>Incolla l'URL copiato sopra e clicca su <strong className="text-indigo-400">"Aggiungi calendario"</strong>.</li>
                    <li>Fatto! Gli eventi e le scadenze del CRM si sincronizzeranno automaticamente.</li>
                  </ol>
                </div>

                {/* Security and token regeneration */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Token privato e sicuro. Non condividere il link con terzi.
                  </span>
                  <button
                    onClick={handleRegenerateSyncToken}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Rigenera Token</span>
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
