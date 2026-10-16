'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  Share2,
  Building2,
  Star,
  MessageSquare,
  TrendingUp,
  Plus,
  CheckCircle2,
  Clock,
  Layers,
  Check,
  X,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  Camera,
  Hash,
  Download,
  AlertCircle,
  ThumbsUp,
  MapPin,
  Tag,
  Radio,
  FileText
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  sector?: string;
  city?: string;
}

interface SocialPost {
  id: string;
  companyId?: string | null;
  channel: 'instagram' | 'facebook' | 'linkedin' | 'google_business' | 'tiktok';
  postType: string;
  publishStatus: 'bozza' | 'in_revisione' | 'approvato' | 'programmato' | 'pubblicato' | 'archiviato';
  scheduledAt?: string | null;
  topic?: string | null;
  title: string;
  hook?: string | null;
  caption: string;
  callToAction?: string | null;
  hashtags: string[];
  visualPrompt?: string | null;
  companyName?: string | null;
  creatorName?: string | null;
  createdAt: string;
}

interface GbpReview {
  id: string;
  companyId: string;
  reviewerName: string;
  rating: number;
  comment?: string | null;
  reviewDate: string;
  sentiment: 'positivo' | 'neutro' | 'critico';
  replyText?: string | null;
  suggestedReplyAi?: string | null;
  replyStatus: 'da_rispondere' | 'bozza_ai' | 'risposta_pubblicata';
  companyName?: string | null;
}

interface GbpPost {
  id: string;
  companyId: string;
  postType: 'standard' | 'offerta' | 'evento';
  title: string;
  summary: string;
  ctaType: string;
  ctaUrl?: string | null;
  couponCode?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  companyName?: string | null;
  createdAt: string;
}

export default function LocalGrowthPage() {
  const [activeTab, setActiveTab] = useState<'social_ped' | 'gbp_hub'>('social_ped');
  const [companiesList, setCompaniesList] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Social PED State
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // GBP State
  const [reviews, setReviews] = useState<GbpReview[]>([]);
  const [gbpPosts, setGbpPosts] = useState<GbpPost[]>([]);
  const [loadingGbp, setLoadingGbp] = useState(false);
  const [reviewRatingFilter, setReviewRatingFilter] = useState<string>('all');
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [generatingReplyForId, setGeneratingReplyForId] = useState<string | null>(null);

  // Modals
  const [isPedModalOpen, setIsPedModalOpen] = useState(false);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [isNewGbpPostModalOpen, setIsNewGbpPostModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // PED Generator Form State
  const [pedForm, setPedForm] = useState({
    companyId: '',
    sector: 'horeca_ristoranti',
    month: new Date().toISOString().slice(0, 7),
    numPosts: 12,
    channels: ['instagram', 'facebook', 'google_business'] as string[],
    toneOfVoice: 'accattivante_amichevole',
    targetAudience: 'Clientela locale, residenti e professionisti del quartiere',
    focusGoal: 'brand_awareness',
    specialEvents: '',
  });

  // Single Post Form State
  const [newPostForm, setNewPostForm] = useState<{
    companyId: string;
    channel: 'instagram' | 'facebook' | 'linkedin' | 'google_business' | 'tiktok';
    postType: 'post' | 'reel' | 'story' | 'carousel' | 'update';
    title: string;
    hook: string;
    caption: string;
    callToAction: string;
    hashtags: string;
    visualPrompt: string;
    scheduledAtDate: string;
    scheduledAtTime: string;
  }>({
    companyId: '',
    channel: 'instagram',
    postType: 'post',
    title: '',
    hook: '',
    caption: '',
    callToAction: '',
    hashtags: '',
    visualPrompt: '',
    scheduledAtDate: new Date().toISOString().slice(0, 10),
    scheduledAtTime: '12:30',
  });

  // GBP Post Form State
  const [newGbpPostForm, setNewGbpPostForm] = useState<{
    companyId: string;
    postType: 'standard' | 'offerta' | 'evento';
    title: string;
    summary: string;
    ctaType: 'PRENOTA' | 'CHIAMA' | 'SCOPRI' | 'ACQUISTA' | 'NESSUNA';
    ctaUrl: string;
    couponCode: string;
    startDate: string;
    endDate: string;
  }>({
    companyId: '',
    postType: 'standard',
    title: '',
    summary: '',
    ctaType: 'SCOPRI',
    ctaUrl: '',
    couponCode: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  });

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Initial Load: Companies & Stats
  useEffect(() => {
    async function initData() {
      try {
        const res = await fetch('/api/companies');
        const data = await res.json();
        if (data.companies && Array.isArray(data.companies)) {
          setCompaniesList(data.companies);
        }
      } catch (err) {
        console.error('Failed to load companies', err);
      }
    }
    initData();
  }, []);

  // Reload data when selectedCompanyId changes
  useEffect(() => {
    loadStats();
    if (activeTab === 'social_ped') {
      loadSocialPosts();
    } else {
      loadGbpData();
    }
  }, [selectedCompanyId, activeTab]);

  const loadStats = async () => {
    try {
      const url = selectedCompanyId
        ? `/api/local-growth/stats?companyId=${selectedCompanyId}`
        : '/api/local-growth/stats';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const loadSocialPosts = async () => {
    setLoadingPosts(true);
    try {
      let url = '/api/local-growth/posts?';
      if (selectedCompanyId) url += `companyId=${selectedCompanyId}&`;
      if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
      if (statusFilter !== 'all') url += `publishStatus=${statusFilter}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadGbpData = async () => {
    setLoadingGbp(true);
    try {
      let revUrl = '/api/local-growth/reviews?';
      if (selectedCompanyId) revUrl += `companyId=${selectedCompanyId}&`;
      if (reviewRatingFilter !== 'all') revUrl += `rating=${reviewRatingFilter}&`;

      const revRes = await fetch(revUrl);
      const revData = await revRes.json();
      if (revData.success) {
        setReviews(revData.reviews || []);
        // Pre-fill reply text map
        const initialMap: Record<string, string> = {};
        for (const r of revData.reviews || []) {
          if (r.replyText) initialMap[r.id] = r.replyText;
          else if (r.suggestedReplyAi) initialMap[r.id] = r.suggestedReplyAi;
        }
        setReplyInputMap((prev) => ({ ...initialMap, ...prev }));
      }

      let postUrl = '/api/local-growth/gbp-posts?';
      if (selectedCompanyId) postUrl += `companyId=${selectedCompanyId}&`;
      const postRes = await fetch(postUrl);
      const postData = await postRes.json();
      if (postData.success) {
        setGbpPosts(postData.posts || []);
      }
    } catch (err) {
      console.error('Failed to load GBP data', err);
    } finally {
      setLoadingGbp(false);
    }
  };

  // Actions: PED Generator
  const handleGeneratePed = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/local-growth/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_ped',
          ...pedForm,
          companyId: pedForm.companyId || selectedCompanyId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPedModalOpen(false);
        showToast(data.message || 'Piano editoriale generato con successo!');
        loadSocialPosts();
        loadStats();
      } else {
        alert(data.error || 'Errore nella generazione del PED');
      }
    } catch (err: any) {
      alert(err.message || 'Errore di connessione');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actions: Bulk Approve Posts
  const handleBulkApprove = async () => {
    if (selectedPostIds.length === 0) return;
    try {
      const res = await fetch('/api/local-growth/posts/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedPostIds }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.approvedCount} post approvati per la pubblicazione!`);
        setSelectedPostIds([]);
        loadSocialPosts();
        loadStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Actions: Quick Post Status Change
  const handleUpdatePostStatus = async (postId: string, status: string) => {
    try {
      const res = await fetch(`/api/local-growth/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishStatus: status }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, publishStatus: status as any } : p))
        );
        loadStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Actions: Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Eliminare questo post dal piano editoriale?')) return;
    try {
      const res = await fetch(`/api/local-growth/posts/${postId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        loadStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Actions: Single Post Creation
  const handleCreateSinglePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const scheduledIso = newPostForm.scheduledAtDate
        ? new Date(`${newPostForm.scheduledAtDate}T${newPostForm.scheduledAtTime || '12:00'}:00.000Z`).toISOString()
        : undefined;

      const hashtagsArray = newPostForm.hashtags
        ? newPostForm.hashtags.split(/[,\s]+/).filter((h) => h.length > 0)
        : [];

      const res = await fetch('/api/local-growth/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: newPostForm.companyId || selectedCompanyId || undefined,
          channel: newPostForm.channel,
          postType: newPostForm.postType,
          title: newPostForm.title,
          hook: newPostForm.hook,
          caption: newPostForm.caption,
          callToAction: newPostForm.callToAction,
          hashtags: hashtagsArray,
          visualPrompt: newPostForm.visualPrompt,
          scheduledAt: scheduledIso,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsNewPostModalOpen(false);
        showToast('Post aggiunto con successo al piano editoriale!');
        loadSocialPosts();
        loadStats();
      } else {
        alert(data.error || 'Errore nella creazione del post');
      }
    } catch (err: any) {
      alert(err.message || 'Errore di connessione');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actions: Review AI Reply Generation
  const handleGenerateAiReply = async (reviewId: string) => {
    setGeneratingReplyForId(reviewId);
    try {
      const res = await fetch(`/api/local-growth/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_ai' }),
      });
      const data = await res.json();
      if (data.success && data.suggestedReply) {
        setReplyInputMap((prev) => ({ ...prev, [reviewId]: data.suggestedReply }));
        showToast('Risposta generata con parole chiave SEO e tono professionale.');
        loadGbpData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingReplyForId(null);
    }
  };

  // Actions: Save / Publish Review Reply
  const handleSaveReviewReply = async (reviewId: string, publishNow: boolean) => {
    const text = replyInputMap[reviewId];
    if (!text || !text.trim()) {
      alert('Inserisci o genera prima il testo della risposta.');
      return;
    }

    try {
      const res = await fetch(`/api/local-growth/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_reply',
          replyText: text.trim(),
          publishNow,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadGbpData();
        loadStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Actions: Seed Sample Reviews
  const handleSeedSampleReviews = async () => {
    if (!selectedCompanyId) {
      alert('Seleziona prima un\'azienda dal menu a tendina in alto per generare recensioni di prova.');
      return;
    }
    try {
      const res = await fetch('/api/local-growth/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_samples', companyId: selectedCompanyId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadGbpData();
        loadStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Actions: Create Google Business Post
  const handleCreateGbpPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGbpPostForm.companyId && !selectedCompanyId) {
      alert('Seleziona un\'azienda per l\'aggiornamento Google.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/local-growth/gbp-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGbpPostForm,
          companyId: newGbpPostForm.companyId || selectedCompanyId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsNewGbpPostModalOpen(false);
        showToast('Aggiornamento Google Business Profile pubblicato!');
        loadGbpData();
        loadStats();
      } else {
        alert(data.error || 'Errore nella pubblicazione');
      }
    } catch (err: any) {
      alert(err.message || 'Errore di connessione');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV Helper
  const handleExportCsv = () => {
    if (posts.length === 0) return;
    const headers = ['Canale', 'Data Pubblicazione', 'Titolo', 'Hook', 'Caption', 'Call To Action', 'Hashtags', 'Prompt Grafica', 'Stato'];
    const rows = posts.map((p) => [
      p.channel,
      p.scheduledAt ? new Date(p.scheduledAt).toLocaleString('it-IT') : 'N/D',
      `"${p.title.replace(/"/g, '""')}"`,
      `"${(p.hook || '').replace(/"/g, '""')}"`,
      `"${p.caption.replace(/"/g, '""')}"`,
      `"${(p.callToAction || '').replace(/"/g, '""')}"`,
      `"${p.hashtags.join(' ')}"`,
      `"${(p.visualPrompt || '').replace(/"/g, '""')}"`,
      p.publishStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `piano_editoriale_${selectedCompanyId || 'tutte'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyPostToClipboard = (postId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2000);
  };

  const getChannelBadge = (ch: string) => {
    switch (ch) {
      case 'instagram':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-pink-500/15 text-pink-300 border border-pink-500/30">Instagram</span>;
      case 'facebook':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-600/15 text-blue-300 border border-blue-600/30">Facebook</span>;
      case 'linkedin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-600/15 text-sky-300 border border-sky-600/30">LinkedIn</span>;
      case 'google_business':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Google Maps</span>;
      case 'tiktok':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">TikTok</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">Social</span>;
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'approvato':
      case 'programmato':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Approvato</span>;
      case 'pubblicato':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">Pubblicato</span>;
      case 'in_revisione':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">In Revisione</span>;
      case 'bozza':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-amber-400 border border-amber-500/30">Bozza AI</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl shadow-emerald-950/40 border border-emerald-500 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 text-pink-400 border border-pink-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">Local Growth Hub</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Fase 1 & Fase 2
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Piano editoriale social con Agente AI (30gg) e gestione reputazione Google Business Profile.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Company Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-2"
            >
              <option value="">Tutte le Attività / Clienti</option>
              {companiesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.city ? `(${c.city})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsPedModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-pink-600/20 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Genera PED 30gg AI</span>
          </button>

          <button
            onClick={() => setIsNewPostModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Nuovo Post</span>
          </button>

          <button
            onClick={() => setIsNewGbpPostModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/60 text-xs font-medium transition-all"
          >
            <MapPin className="h-4 w-4 text-emerald-400" />
            <span>Post su Google</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Post Social Totali</div>
            <div className="text-2xl font-bold text-white mt-1">{stats?.social?.totalPosts || 0}</div>
            <div className="text-[11px] text-emerald-400 mt-1">
              {stats?.social?.approvedPosts || 0} approvati / {stats?.social?.pendingPosts || 0} in bozza
            </div>
          </div>
          <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl">
            <Share2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Google Rating Medio</div>
            <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-1.5">
              <span>{stats?.gbp?.avgRating || '5.0'}</span>
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats?.gbp?.totalReviews || 0} recensioni monitorate
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Star className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Recensioni da Rispondere</div>
            <div className={`text-2xl font-bold mt-1 ${stats?.gbp?.pendingReplies > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
              {stats?.gbp?.pendingReplies || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats?.gbp?.positivePercentage || 100}% sentiment positivo
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <MessageSquare className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Aggiornamenti Maps Attivi</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats?.gbp?.activeUpdatesCount || 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Post Google & Offerte</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <MapPin className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('social_ped')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'social_ped'
              ? 'border-pink-500 text-pink-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>Fase 1: Social Media Planner (PED 30gg)</span>
          {posts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-pink-500/20 text-pink-300">
              {posts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('gbp_hub')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'gbp_hub'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Fase 2: Google Business Profile & Recensioni AI</span>
          {reviews.filter((r) => r.replyStatus === 'da_rispondere').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-300 font-bold">
              {reviews.filter((r) => r.replyStatus === 'da_rispondere').length} da rispondere
            </span>
          )}
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: SOCIAL MEDIA PLANNER (PED)                                    */}
      {/* ==================================================================== */}
      {activeTab === 'social_ped' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Filter className="h-3.5 w-3.5" />
                <span>Canale:</span>
              </div>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
              >
                <option value="all">Tutti i Canali</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="google_business">Google Maps</option>
                <option value="tiktok">TikTok</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white ml-2"
              >
                <option value="all">Tutti gli Stati</option>
                <option value="bozza">Bozza AI</option>
                <option value="approvato">Approvato</option>
                <option value="pubblicato">Pubblicato</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {selectedPostIds.length > 0 && (
                <button
                  onClick={handleBulkApprove}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approva Selezionati ({selectedPostIds.length})</span>
                </button>
              )}

              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="Esporta CSV per Meta Business Suite, Buffer o Hootsuite"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Esporta CSV Meta</span>
              </button>
            </div>
          </div>

          {/* Posts Grid */}
          {loadingPosts ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-pink-400" />
              <span className="text-sm">Caricamento piano editoriale in corso...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 space-y-3">
              <div className="p-3 w-12 h-12 mx-auto rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">Nessun post programmato</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clicca su "Genera PED 30gg AI" per creare all'istante una sequenza completa di contenuti strategici per l'attività selezionata.
              </p>
              <button
                onClick={() => setIsPedModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Genera Piano Editoriale AI a 30 Giorni</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {posts.map((p) => {
                const isSelected = selectedPostIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-pink-500/80 shadow-md shadow-pink-500/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Bar: Checkbox + Channel + Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedPostIds([...selectedPostIds, p.id]);
                              else setSelectedPostIds(selectedPostIds.filter((id) => id !== p.id));
                            }}
                            className="rounded border-slate-700 text-pink-600 focus:ring-pink-500"
                          />
                          {getChannelBadge(p.channel)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(p.publishStatus)}
                          {p.scheduledAt && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3 text-slate-500" />
                              {new Date(p.scheduledAt).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Topic */}
                      <div>
                        {p.topic && (
                          <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider block">
                            {p.topic}
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-white mt-0.5">{p.title}</h4>
                      </div>

                      {/* Hook & Caption */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                        {p.hook && (
                          <p className="font-semibold text-pink-200/90 italic">
                            "{p.hook}"
                          </p>
                        )}
                        <p className="text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4">
                          {p.caption}
                        </p>
                      </div>

                      {/* Call to action & hashtags */}
                      {p.callToAction && (
                        <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          <span>CTA: {p.callToAction}</span>
                        </div>
                      )}

                      {/* Visual Prompt Recommendation */}
                      {p.visualPrompt && (
                        <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-[11px] text-indigo-300 flex items-start gap-2">
                          <Camera className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-indigo-400" />
                          <span className="line-clamp-2"><strong>Suggerimento Grafica:</strong> {p.visualPrompt}</span>
                        </div>
                      )}

                      {/* Hashtags */}
                      {p.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.hashtags.slice(0, 5).map((h, i) => (
                            <span key={i} className="text-[10px] text-slate-500 hover:text-slate-400">
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        {p.publishStatus !== 'approvato' && (
                          <button
                            onClick={() => handleUpdatePostStatus(p.id, 'approvato')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 font-medium text-[11px] flex items-center gap-1 transition-colors"
                          >
                            <Check className="h-3 w-3" />
                            <span>Approva</span>
                          </button>
                        )}
                        <button
                          onClick={() => copyPostToClipboard(p.id, `${p.hook ? p.hook + '\n\n' : ''}${p.caption}\n\n${p.hashtags.join(' ')}`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] flex items-center gap-1 transition-colors"
                        >
                          {copiedPostId === p.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-300">Copiato</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copia</span>
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeletePost(p.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors text-[11px]"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: GOOGLE BUSINESS PROFILE (GBP) & RECENSIONI AI                 */}
      {/* ==================================================================== */}
      {activeTab === 'gbp_hub' && (
        <div className="space-y-6">
          {/* Sub Header & Local SEO Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <MapPin className="h-4 w-4" /> Posizionamento Locale & Local Pack su Google Maps
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Rispondere a ogni recensione entro 24 ore citando in modo naturale i servizi e la città aumenta il ranking organico nelle prime 3 posizioni di Google Maps.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeedSampleReviews}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Genera Recensioni di Prova</span>
              </button>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span>Gestione Recensioni Google ({reviews.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={reviewRatingFilter}
                  onChange={(e) => setReviewRatingFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                >
                  <option value="all">Tutte le valutazioni</option>
                  <option value="5">Solo 5 Stelle</option>
                  <option value="4">4 Stelle</option>
                  <option value="3">3 Stelle</option>
                </select>
              </div>
            </div>

            {loadingGbp ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
                <span className="text-sm">Caricamento recensioni Google in corso...</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-6">
                <p className="text-xs text-slate-400">
                  Nessuna recensione registrata per l'attività selezionata. Clicca su "Genera Recensioni di Prova" per simulare il flusso.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => {
                  const isReplied = r.replyStatus === 'risposta_pubblicata';
                  const isGenerating = generatingReplyForId === r.id;

                  return (
                    <div
                      key={r.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4"
                    >
                      {/* Reviewer Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white">
                            {r.reviewerName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{r.reviewerName}</span>
                              <span className="text-xs text-slate-500">• {new Date(r.reviewDate).toLocaleDateString('it-IT')}</span>
                              {r.companyName && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                                  {r.companyName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${
                                    i < r.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-slate-800 text-slate-700'
                                  }`}
                                />
                              ))}
                              <span className="text-[11px] text-slate-400 ml-1 font-semibold">
                                {r.rating}.0
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isReplied ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Risposta Pubblicata</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>In attesa di risposta</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Review Comment */}
                      <p className="text-xs text-slate-300 leading-relaxed pl-12">
                        "{r.comment}"
                      </p>

                      {/* Reply Box */}
                      <div className="pl-12 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Risposta del Titolare (Google Business)</span>
                          </label>

                          {!isReplied && (
                            <button
                              onClick={() => handleGenerateAiReply(r.id)}
                              disabled={isGenerating}
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>{isGenerating ? 'Generazione...' : 'Genera Risposta con AI'}</span>
                            </button>
                          )}
                        </div>

                        <textarea
                          rows={3}
                          value={replyInputMap[r.id] || ''}
                          onChange={(e) =>
                            setReplyInputMap({ ...replyInputMap, [r.id]: e.target.value })
                          }
                          disabled={isReplied}
                          placeholder="Clicca su 'Genera Risposta con AI' o scrivi qui la risposta da pubblicare su Google..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed disabled:opacity-75"
                        />

                        {!isReplied && (
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleSaveReviewReply(r.id, false)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                            >
                              Salva Bozza
                            </button>
                            <button
                              onClick={() => handleSaveReviewReply(r.id, true)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Pubblica Risposta su Google</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Google Business Posts / Updates Section */}
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span>Google Posts & Offerte su Maps ({gbpPosts.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Novità ed eventi pubblicati direttamente nella scheda attività di Google Search e Maps.
                </p>
              </div>

              <button
                onClick={() => setIsNewGbpPostModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuovo Google Post</span>
              </button>
            </div>

            {gbpPosts.length === 0 ? (
              <div className="py-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-500">
                Nessun aggiornamento pubblicato su Google Maps. Clicca su "Nuovo Google Post" per creare la prima offerta o aggiornamento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gbpPosts.map((gp) => (
                  <div key={gp.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        {gp.postType}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(gp.createdAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{gp.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{gp.summary}</p>
                    {gp.couponCode && (
                      <div className="p-1.5 rounded bg-slate-950 border border-dashed border-emerald-600/50 text-[11px] text-emerald-300 text-center font-mono">
                        Codice: <strong>{gp.couponCode}</strong>
                      </div>
                    )}
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">CTA: {gp.ctaType}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                        Pubblicato su Maps
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: GENERA PED 30 GIORNI AI                                    */}
      {/* ==================================================================== */}
      {isPedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPedModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Generatore Piano Editoriale Social (PED)</h3>
                <p className="text-xs text-slate-400">
                  L'Agente AI pianificherà un intero mese di contenuti strategici bilanciati.
                </p>
              </div>
            </div>

            <form onSubmit={handleGeneratePed} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Azienda / Cliente Target</label>
                <select
                  value={pedForm.companyId}
                  onChange={(e) => setPedForm({ ...pedForm, companyId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="">Seleziona azienda dal CRM...</option>
                  {companiesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.city ? `(${c.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Settore dell'Attività</label>
                  <select
                    value={pedForm.sector}
                    onChange={(e) => setPedForm({ ...pedForm, sector: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="horeca_ristoranti">Ristorazione & Food</option>
                    <option value="commercialisti">Studio Commercialisti</option>
                    <option value="studi_legali">Studio Legale / Notarile</option>
                    <option value="horeca_hotel">Hotel & Ricettivo</option>
                    <option value="local_services">Servizi Locali & Artigiani</option>
                    <option value="ecommerce">E-Commerce / Retail</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Mese di Pubblicazione</label>
                  <input
                    type="month"
                    value={pedForm.month}
                    onChange={(e) => setPedForm({ ...pedForm, month: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Numero di Post nel Mese</label>
                  <select
                    value={pedForm.numPosts}
                    onChange={(e) => setPedForm({ ...pedForm, numPosts: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="8">8 Post (2 a settimana)</option>
                    <option value="12">12 Post (3 a settimana - Consigliato)</option>
                    <option value="16">16 Post (4 a settimana)</option>
                    <option value="20">20 Post (5 a settimana)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Tono di Voce (Tone of Voice)</label>
                  <select
                    value={pedForm.toneOfVoice}
                    onChange={(e) => setPedForm({ ...pedForm, toneOfVoice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="accattivante_amichevole">Accattivante & Amichevole</option>
                    <option value="professionale">Professionale & Rigoroso</option>
                    <option value="elegante_autorevole">Elegante & Autorevole</option>
                    <option value="giovane_dinamico">Giovane & Dinamico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Obiettivo Principale</label>
                <select
                  value={pedForm.focusGoal}
                  onChange={(e) => setPedForm({ ...pedForm, focusGoal: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                >
                  <option value="brand_awareness">Brand Awareness & Visibilità Territoriale</option>
                  <option value="lead_generation">Generazione Contatti & Prenotazioni</option>
                  <option value="promozione_offerte">Promozione Menù / Offerte Speciali</option>
                  <option value="autorita_settore">Consolidamento Autorità & Recensioni</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Target / Pubblico Locale</label>
                <input
                  type="text"
                  value={pedForm.targetAudience}
                  onChange={(e) => setPedForm({ ...pedForm, targetAudience: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPedModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-pink-600/30 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Generazione in corso...' : 'Genera Piano con Agente AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: NUOVO POST SINGOLO                                         */}
      {/* ==================================================================== */}
      {isNewPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewPostModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Crea Singolo Post Social</h3>

            <form onSubmit={handleCreateSinglePost} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Canale</label>
                  <select
                    value={newPostForm.channel}
                    onChange={(e) => setNewPostForm({ ...newPostForm, channel: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="google_business">Google Maps</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Formato</label>
                  <select
                    value={newPostForm.postType}
                    onChange={(e) => setNewPostForm({ ...newPostForm, postType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="post">Post Singolo</option>
                    <option value="reel">Reel / Video</option>
                    <option value="carousel">Carosello</option>
                    <option value="story">Story</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Titolo Interno</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Piatto del mese, Presentazione nuovo avvocato..."
                  value={newPostForm.title}
                  onChange={(e) => setNewPostForm({ ...newPostForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Hook (Prima frase accattivante)</label>
                <input
                  type="text"
                  placeholder="Es. Non crederai mai a cosa abbiamo aggiunto nel nostro menù..."
                  value={newPostForm.hook}
                  onChange={(e) => setNewPostForm({ ...newPostForm, hook: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Testo Post (Caption)</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Scrivi qui il corpo del post..."
                  value={newPostForm.caption}
                  onChange={(e) => setNewPostForm({ ...newPostForm, caption: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Call to Action (CTA)</label>
                  <input
                    type="text"
                    placeholder="Es. Prenota al link in bio"
                    value={newPostForm.callToAction}
                    onChange={(e) => setNewPostForm({ ...newPostForm, callToAction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Hashtags (separati da spazio)</label>
                  <input
                    type="text"
                    placeholder="#cucina #roma #foodie"
                    value={newPostForm.hashtags}
                    onChange={(e) => setNewPostForm({ ...newPostForm, hashtags: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewPostModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvataggio...' : 'Crea Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: NUOVO POST GOOGLE BUSINESS (GBP)                            */}
      {/* ==================================================================== */}
      {isNewGbpPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewGbpPostModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Nuovo Post Google Business Profile</h3>
                <p className="text-xs text-slate-400">
                  Pubblica aggiornamenti ed offerte direttamente su Google Maps e nella Ricerca.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateGbpPost} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Azienda</label>
                <select
                  value={newGbpPostForm.companyId}
                  onChange={(e) => setNewGbpPostForm({ ...newGbpPostForm, companyId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Seleziona azienda dal CRM...</option>
                  {companiesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Tipo di Aggiornamento</label>
                  <select
                    value={newGbpPostForm.postType}
                    onChange={(e) => setNewGbpPostForm({ ...newGbpPostForm, postType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="standard">Aggiornamento Standard</option>
                    <option value="offerta">Offerta Speciale / Sconto</option>
                    <option value="evento">Evento Locale</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Pulsante Azione (CTA)</label>
                  <select
                    value={newGbpPostForm.ctaType}
                    onChange={(e) => setNewGbpPostForm({ ...newGbpPostForm, ctaType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="SCOPRI">Scopri di più</option>
                    <option value="PRENOTA">Prenota</option>
                    <option value="CHIAMA">Chiama ora</option>
                    <option value="ACQUISTA">Acquista</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Titolo dell'Aggiornamento</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Nuovo menu degustazione disponibile, Sconto 15%..."
                  value={newGbpPostForm.title}
                  onChange={(e) => setNewGbpPostForm({ ...newGbpPostForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Dettagli del Post</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descrivi l'offerta o la novità per i clienti che ti cercano su Google..."
                  value={newGbpPostForm.summary}
                  onChange={(e) => setNewGbpPostForm({ ...newGbpPostForm, summary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              {newGbpPostForm.postType === 'offerta' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Codice Coupon (Opzionale)</label>
                    <input
                      type="text"
                      placeholder="Es. AUTUNNO20"
                      value={newGbpPostForm.couponCode}
                      onChange={(e) => setNewGbpPostForm({ ...newGbpPostForm, couponCode: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Data Scadenza Offerta</label>
                    <input
                      type="date"
                      value={newGbpPostForm.endDate}
                      onChange={(e) => setNewGbpPostForm({ ...newGbpPostForm, endDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewGbpPostModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Pubblicazione...' : 'Pubblica su Google Maps'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
