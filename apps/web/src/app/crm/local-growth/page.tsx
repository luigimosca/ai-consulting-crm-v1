'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  Share2,
  Building2,
  Star,
  MessageSquare,
  Plus,
  CheckCircle2,
  Clock,
  Check,
  X,
  RefreshCw,
  Copy,
  Filter,
  Camera,
  Download,
  MapPin,
  Tag,
  Bot,
  PhoneCall,
  Send,
  Globe,
  FileText,
  Code,
  Search,
  UserCheck,
  ShieldCheck,
  Zap,
  Trash2,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  sector?: string;
  city?: string;
  phone?: string;
  address?: string;
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

interface WhatsappFaqItem {
  question: string;
  answer: string;
}

interface WhatsappAgent {
  id: string;
  companyId: string;
  agentName: string;
  whatsappPhone?: string | null;
  status: 'attivo' | 'pausa' | 'configurazione';
  welcomeMessage: string;
  businessHours?: string | null;
  addressInfo?: string | null;
  pricingMenuInfo?: string | null;
  faqs: WhatsappFaqItem[];
  bookingEnabled: boolean;
  leadCaptureEnabled: boolean;
  escalationPhone?: string | null;
  toneOfVoice: 'cordiale_locale' | 'formale_professionale' | 'rapido_diretto';
  webhookVerifyToken?: string | null;
  companyName?: string | null;
}

interface WhatsappMessageItem {
  role: 'customer' | 'agent_ai' | 'operator';
  text: string;
  timestamp: string;
}

interface WhatsappConversation {
  id: string;
  agentId?: string | null;
  companyId: string;
  customerPhone: string;
  customerName: string;
  intentDetected: 'info_orari_indirizzo' | 'preventivo_listino' | 'prenotazione_appuntamento' | 'assistenza_reclamo' | 'altro';
  status: 'risolta_ai' | 'in_corso' | 'richiede_operatore' | 'prenotazione_confermata';
  messages: WhatsappMessageItem[];
  linkedLeadId?: string | null;
  linkedAppointmentId?: string | null;
  lastMessageAt: string;
  companyName?: string | null;
}

interface ServiceShowcaseItem {
  name: string;
  description: string;
  priceLabel: string;
  badge?: string;
}

interface LocalSeoWebsite {
  id: string;
  companyId: string;
  domainUrl?: string | null;
  heroTitle: string;
  heroSubtitle: string;
  primaryCtaText: string;
  targetCity: string;
  targetKeywords: string[];
  servicesShowcase: ServiceShowcaseItem[];
  schemaMarkupJson?: string | null;
  seoHealthScore: number;
  status: 'bozza' | 'online' | 'in_aggiornamento';
  companyName?: string | null;
  publicSlug?: string;
  publicUrl?: string;
}

interface LocalSeoArticle {
  id: string;
  companyId: string;
  title: string;
  slug: string;
  targetKeyword: string;
  targetCity: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  contentHtml: string;
  readingTimeMinutes: number;
  seoScore: number;
  publishStatus: 'bozza' | 'approvato' | 'pubblicato' | 'indicizzato';
  publishedAt?: string | null;
  companyName?: string | null;
  createdAt: string;
}

export default function LocalGrowthPage() {
  const [activeTab, setActiveTab] = useState<'social_ped' | 'gbp_hub' | 'whatsapp_ai' | 'seo_blog'>('social_ped');
  const [companiesList, setCompaniesList] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Fase 1: Social PED State
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Fase 2: GBP State
  const [reviews, setReviews] = useState<GbpReview[]>([]);
  const [gbpPosts, setGbpPosts] = useState<GbpPost[]>([]);
  const [loadingGbp, setLoadingGbp] = useState(false);
  const [reviewRatingFilter, setReviewRatingFilter] = useState<string>('all');
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [generatingReplyForId, setGeneratingReplyForId] = useState<string | null>(null);

  // Fase 3: WhatsApp AI Agent State
  const [waAgent, setWaAgent] = useState<WhatsappAgent | null>(null);
  const [waConversations, setWaConversations] = useState<WhatsappConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [loadingWa, setLoadingWa] = useState(false);
  const [waForm, setWaForm] = useState<{
    agentName: string;
    whatsappPhone: string;
    status: 'attivo' | 'pausa' | 'configurazione';
    welcomeMessage: string;
    businessHours: string;
    addressInfo: string;
    pricingMenuInfo: string;
    bookingEnabled: boolean;
    leadCaptureEnabled: boolean;
    escalationPhone: string;
    toneOfVoice: 'cordiale_locale' | 'formale_professionale' | 'rapido_diretto';
  }>({
    agentName: '',
    whatsappPhone: '+39 348 9001122',
    status: 'attivo',
    welcomeMessage: '',
    businessHours: '',
    addressInfo: '',
    pricingMenuInfo: '',
    bookingEnabled: true,
    leadCaptureEnabled: true,
    escalationPhone: '',
    toneOfVoice: 'cordiale_locale',
  });
  const [simCustomerName, setSimCustomerName] = useState('Marco Rossi');
  const [simCustomerPhone, setSimCustomerPhone] = useState('+39 347 1122334');
  const [simMessageText, setSimMessageText] = useState('');
  const [operatorReplyText, setOperatorReplyText] = useState('');

  // Fase 4: Local SEO Website & Blog State
  const [seoWebsite, setSeoWebsite] = useState<LocalSeoWebsite | null>(null);
  const [seoArticles, setSeoArticles] = useState<LocalSeoArticle[]>([]);
  const [loadingSeo, setLoadingSeo] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<LocalSeoArticle | null>(null);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [seoTargetCity, setSeoTargetCity] = useState('Milano');

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
          if (data.companies.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(data.companies[0].id);
            if (data.companies[0].city) {
              setSeoTargetCity(data.companies[0].city);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load companies', err);
      }
    }
    initData();
  }, []);

  // Reload data when selectedCompanyId or activeTab changes
  useEffect(() => {
    loadStats();
    if (activeTab === 'social_ped') {
      loadSocialPosts();
    } else if (activeTab === 'gbp_hub') {
      loadGbpData();
    } else if (activeTab === 'whatsapp_ai') {
      loadWhatsappData();
    } else if (activeTab === 'seo_blog') {
      loadSeoData();
    }
  }, [selectedCompanyId, activeTab, channelFilter, statusFilter, reviewRatingFilter]);

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

  const loadWhatsappData = async () => {
    setLoadingWa(true);
    try {
      const agentUrl = selectedCompanyId
        ? `/api/local-growth/whatsapp-agent?companyId=${selectedCompanyId}`
        : '/api/local-growth/whatsapp-agent';
      const agentRes = await fetch(agentUrl);
      const agentData = await agentRes.json();
      if (agentData.success && agentData.agent) {
        const ag: WhatsappAgent = agentData.agent;
        setWaAgent(ag);
        setWaForm({
          agentName: ag.agentName || '',
          whatsappPhone: ag.whatsappPhone || '+39 348 9001122',
          status: ag.status || 'attivo',
          welcomeMessage: ag.welcomeMessage || '',
          businessHours: ag.businessHours || '',
          addressInfo: ag.addressInfo || '',
          pricingMenuInfo: ag.pricingMenuInfo || '',
          bookingEnabled: ag.bookingEnabled,
          leadCaptureEnabled: ag.leadCaptureEnabled,
          escalationPhone: ag.escalationPhone || '',
          toneOfVoice: ag.toneOfVoice || 'cordiale_locale',
        });
      } else {
        setWaAgent(null);
      }

      const convUrl = selectedCompanyId
        ? `/api/local-growth/whatsapp-conversations?companyId=${selectedCompanyId}`
        : '/api/local-growth/whatsapp-conversations';
      const convRes = await fetch(convUrl);
      const convData = await convRes.json();
      if (convData.success) {
        const list: WhatsappConversation[] = convData.conversations || [];
        setWaConversations(list);
        if (list.length > 0 && !selectedConvId) {
          setSelectedConvId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load WhatsApp data', err);
    } finally {
      setLoadingWa(false);
    }
  };

  const loadSeoData = async () => {
    setLoadingSeo(true);
    try {
      const webUrl = selectedCompanyId
        ? `/api/local-growth/seo-website?companyId=${selectedCompanyId}`
        : '/api/local-growth/seo-website';
      const webRes = await fetch(webUrl);
      const webData = await webRes.json();
      if (webData.success) {
        setSeoWebsite(webData.website || null);
        if (webData.website?.targetCity) {
          setSeoTargetCity(webData.website.targetCity);
        }
      }

      const artUrl = selectedCompanyId
        ? `/api/local-growth/seo-articles?companyId=${selectedCompanyId}`
        : '/api/local-growth/seo-articles';
      const artRes = await fetch(artUrl);
      const artData = await artRes.json();
      if (artData.success) {
        setSeoArticles(artData.articles || []);
      }
    } catch (err) {
      console.error('Failed to load SEO data', err);
    } finally {
      setLoadingSeo(false);
    }
  };

  const getEffectiveCompanyId = () => {
    if (selectedCompanyId) return selectedCompanyId;
    if (companiesList.length > 0) return companiesList[0].id;
    return '';
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

  // Actions: Fase 2 GBP
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

  const handleSeedSampleReviews = async () => {
    const cid = getEffectiveCompanyId();
    if (!cid) {
      alert("Seleziona prima un'azienda dal menu a tendina in alto.");
      return;
    }
    try {
      const res = await fetch('/api/local-growth/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_samples', companyId: cid }),
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

  const handleCreateGbpPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const cid = newGbpPostForm.companyId || getEffectiveCompanyId();
    if (!cid) {
      alert("Seleziona un'azienda per l'aggiornamento Google.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/local-growth/gbp-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGbpPostForm,
          companyId: cid,
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

  // Actions: Fase 3 WhatsApp AI Agent
  const handleAutoGenerateWaAgent = async () => {
    const cid = getEffectiveCompanyId();
    if (!cid) {
      alert("Seleziona prima un'attività dal menu in alto.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/local-growth/whatsapp-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: cid,
          autoGenerateKnowledgeBase: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadWhatsappData();
        loadStats();
      } else {
        alert(data.error || 'Errore generazione Agente WhatsApp');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWaAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cid = getEffectiveCompanyId();
    if (!cid) {
      alert("Seleziona prima un'attività dal menu in alto.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/local-growth/whatsapp-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: cid,
          ...waForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadWhatsappData();
        loadStats();
      } else {
        alert(data.error || 'Errore nel salvataggio');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateIncomingMessage = async (customText?: string) => {
    const cid = getEffectiveCompanyId();
    const textToSend = customText ?? simMessageText;
    if (!cid || !textToSend.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/local-growth/whatsapp-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: cid,
          customerName: simCustomerName || 'Cliente WhatsApp',
          customerPhone: simCustomerPhone || '+39 347 1122334',
          messageText: textToSend.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.conversation) {
        setSimMessageText('');
        showToast(data.message);
        await loadWhatsappData();
        setSelectedConvId(data.conversation.id);
        loadStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedWaConversations = async () => {
    const cid = getEffectiveCompanyId();
    if (!cid) {
      alert("Seleziona prima un'attività dal menu in alto.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/local-growth/whatsapp-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'seed_samples',
          companyId: cid,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadWhatsappData();
        loadStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOperatorReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !operatorReplyText.trim()) return;
    try {
      const res = await fetch('/api/local-growth/whatsapp-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'operator_reply',
          conversationId: selectedConvId,
          replyText: operatorReplyText.trim(),
          status: 'risolta_ai',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOperatorReplyText('');
        showToast(data.message);
        loadWhatsappData();
        loadStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Actions: Fase 4 Local SEO Website & Blog
  const handleGenerateSeoWebsite = async () => {
    const cid = getEffectiveCompanyId();
    if (!cid) {
      alert("Seleziona prima un'attività dal menu in alto.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/local-growth/seo-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: cid,
          targetCity: seoTargetCity || 'Milano',
          autoOptimizeAi: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadSeoData();
        loadStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateSeoArticlesBatch = async () => {
    const cid = getEffectiveCompanyId();
    if (!cid) {
      alert("Seleziona prima un'attività dal menu in alto.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/local-growth/seo-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_batch',
          companyId: cid,
          targetCity: seoTargetCity || 'Milano',
          count: 4,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadSeoData();
        loadStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSeoArticle = async (articleId: string) => {
    if (!confirm('Eliminare questo articolo dal blog SEO?')) return;
    try {
      const res = await fetch(`/api/local-growth/seo-articles?id=${articleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSeoArticles((prev) => prev.filter((a) => a.id !== articleId));
        loadStats();
      }
    } catch (err) {
      console.error(err);
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

  const getWaIntentBadge = (intent: string) => {
    switch (intent) {
      case 'prenotazione_appuntamento':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">📅 Prenotazione</span>;
      case 'preventivo_listino':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">💰 Preventivo & Listino</span>;
      case 'assistenza_reclamo':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">🚨 Richiede Operatore</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">ℹ️ Info Orari & Sede</span>;
    }
  };

  const activeConversation = waConversations.find((c) => c.id === selectedConvId) || waConversations[0] || null;

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
          <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-emerald-500/20 text-pink-400 border border-pink-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">Local Growth & Visibility Hub</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Suite Completa Fasi 1-4
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Piano Editoriale Social AI, Google Business Profile, Agente WhatsApp 24/7 e Sito & Blog SEO Locale Automatizzato.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Company Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                const found = companiesList.find((c) => c.id === e.target.value);
                if (found?.city) setSeoTargetCity(found.city);
              }}
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
            onClick={() => setActiveTab('whatsapp_ai')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-950/70 hover:bg-green-900/80 text-green-300 border border-green-700/60 text-xs font-semibold transition-all"
          >
            <Bot className="h-4 w-4 text-green-400" />
            <span>Agente WhatsApp 24/7</span>
          </button>

          <button
            onClick={() => setActiveTab('seo_blog')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 text-xs font-semibold transition-all"
          >
            <Globe className="h-4 w-4 text-indigo-400" />
            <span>Sito & Blog SEO</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (4 Pillars) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('social_ped')}
          className="cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-pink-500/40 p-4 rounded-xl flex items-center justify-between transition-all"
        >
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">1. Piano Social PED</div>
            <div className="text-2xl font-bold text-white mt-1">{stats?.social?.totalPosts || 0} Post</div>
            <div className="text-[11px] text-emerald-400 mt-1">
              {stats?.social?.approvedPosts || 0} approvati • {stats?.social?.pendingPosts || 0} bozze
            </div>
          </div>
          <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl">
            <Share2 className="h-5 w-5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('gbp_hub')}
          className="cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 p-4 rounded-xl flex items-center justify-between transition-all"
        >
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">2. Google Maps & Review</div>
            <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-1.5">
              <span>{stats?.gbp?.avgRating || '5.0'}</span>
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats?.gbp?.totalReviews || 0} recensioni • {stats?.gbp?.activeUpdatesCount || 0} post Maps
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <MapPin className="h-5 w-5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('whatsapp_ai')}
          className="cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-green-500/40 p-4 rounded-xl flex items-center justify-between transition-all"
        >
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">3. Agente WhatsApp 24/7</div>
            <div className="text-2xl font-bold text-green-400 mt-1">
              {stats?.whatsapp?.totalConversations || 0} Chat
            </div>
            <div className="text-[11px] text-emerald-300 mt-1">
              {stats?.whatsapp?.confirmedBookings || 0} prenotazioni • {stats?.whatsapp?.leadsCaptured || 0} lead CRM
            </div>
          </div>
          <div className="p-3 bg-green-500/10 text-green-400 rounded-xl">
            <Bot className="h-5 w-5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('seo_blog')}
          className="cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 p-4 rounded-xl flex items-center justify-between transition-all"
        >
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">4. Sito & Blog SEO Locale</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {stats?.seo?.totalArticles || 0} Articoli
            </div>
            <div className="text-[11px] text-indigo-300 mt-1">
              SEO Score: {stats?.seo?.avgSeoScore || 96}/100 • Schema JSON-LD
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Globe className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 4-Tab Switcher */}
      <div className="flex flex-wrap border-b border-slate-800 gap-1">
        <button
          onClick={() => setActiveTab('social_ped')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'social_ped'
              ? 'border-pink-500 text-pink-400 bg-pink-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>1. Social Planner (PED 30gg)</span>
          {posts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-pink-500/20 text-pink-300">
              {posts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('gbp_hub')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'gbp_hub'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>2. Google Business & Recensioni AI</span>
          {reviews.filter((r) => r.replyStatus === 'da_rispondere').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-500/20 text-rose-300 font-bold">
              {reviews.filter((r) => r.replyStatus === 'da_rispondere').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('whatsapp_ai')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'whatsapp_ai'
              ? 'border-green-500 text-green-400 bg-green-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>3. Agente WhatsApp 24/7</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-green-500/20 text-green-300">
            {waConversations.length} chat
          </span>
        </button>

        <button
          onClick={() => setActiveTab('seo_blog')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'seo_blog'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>4. Sito Vetrina & Blog SEO Locale</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-500/20 text-indigo-300">
            {seoArticles.length} articoli
          </span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: SOCIAL MEDIA PLANNER (PED)                                    */}
      {/* ==================================================================== */}
      {activeTab === 'social_ped' && (
        <div className="space-y-4">
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
                onClick={() => setIsNewPostModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Singolo Post</span>
              </button>

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
                Clicca su &ldquo;Genera PED 30gg AI&rdquo; per creare all&apos;istante una sequenza completa di contenuti strategici per l&apos;attività selezionata.
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

                      <div>
                        {p.topic && (
                          <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider block">
                            {p.topic}
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-white mt-0.5">{p.title}</h4>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                        {p.hook && (
                          <p className="font-semibold text-pink-200/90 italic">
                            &ldquo;{p.hook}&rdquo;
                          </p>
                        )}
                        <p className="text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4">
                          {p.caption}
                        </p>
                      </div>

                      {p.callToAction && (
                        <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          <span>CTA: {p.callToAction}</span>
                        </div>
                      )}

                      {p.visualPrompt && (
                        <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-[11px] text-indigo-300 flex items-start gap-2">
                          <Camera className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-indigo-400" />
                          <span className="line-clamp-2"><strong>Suggerimento Grafica:</strong> {p.visualPrompt}</span>
                        </div>
                      )}

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
              <button
                onClick={() => setIsNewGbpPostModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuova Offerta / Post Maps</span>
              </button>
            </div>
          </div>

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
                  Nessuna recensione registrata per l&apos;attività selezionata. Clicca su &ldquo;Genera Recensioni di Prova&rdquo; per simulare il flusso.
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

                      <p className="text-xs text-slate-300 leading-relaxed pl-12">
                        &ldquo;{r.comment}&rdquo;
                      </p>

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
                Nessun aggiornamento pubblicato su Google Maps. Clicca su &ldquo;Nuovo Google Post&rdquo; per creare la prima offerta o aggiornamento.
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
      {/* TAB 3: AGENTE WHATSAPP AI 24/7 PER ATTIVITÀ LOCALI                   */}
      {/* ==================================================================== */}
      {activeTab === 'whatsapp_ai' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-green-950/50 via-slate-900 to-emerald-950/40 border border-green-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-green-400 font-bold text-xs uppercase tracking-wider">
                <Bot className="h-4 w-4" /> Concierge & Segreteria WhatsApp AI 24/7 collegata al CRM
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Risponde istantaneamente ai messaggi dei clienti su orari, prezzi, menu e disponibilità, **acquisisce automaticamente il Lead nel CRM** e **fissa gli appuntamenti/prenotazioni direttamente nel Calendario**.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAutoGenerateWaAgent}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-green-600/20 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Genera Knowledge Base AI per l&apos;Attività</span>
              </button>
              <button
                onClick={handleSeedWaConversations}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Simula 3 Chat Clienti Reali</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Knowledge Base & Agent Config (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-400" />
                  <h3 className="text-sm font-bold text-white">Configurazione & Istruzioni Agente</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  waForm.status === 'attivo'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {waForm.status === 'attivo' ? '● Online 24/7' : 'In Pausa'}
                </span>
              </div>

              <form onSubmit={handleSaveWaAgent} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Nome Assistente AI</label>
                    <input
                      type="text"
                      value={waForm.agentName}
                      onChange={(e) => setWaForm({ ...waForm, agentName: e.target.value })}
                      placeholder="Es. Concierge WhatsApp"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Numero WhatsApp Business</label>
                    <input
                      type="text"
                      value={waForm.whatsappPhone}
                      onChange={(e) => setWaForm({ ...waForm, whatsappPhone: e.target.value })}
                      placeholder="+39 348 9001122"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Messaggio di Benvenuto Automatico</label>
                  <textarea
                    rows={3}
                    value={waForm.welcomeMessage}
                    onChange={(e) => setWaForm({ ...waForm, welcomeMessage: e.target.value })}
                    placeholder="Clicca su 'Genera Knowledge Base AI' in alto per autocompilare tutti i dati dell'attività..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white leading-relaxed"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Orari di Apertura & Giorni di Chiusura</label>
                  <input
                    type="text"
                    value={waForm.businessHours}
                    onChange={(e) => setWaForm({ ...waForm, businessHours: e.target.value })}
                    placeholder="Es. Lun-Sab 09:00-20:00 (Domenica chiuso)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Indirizzo Sede & Info Parcheggio</label>
                  <input
                    type="text"
                    value={waForm.addressInfo}
                    onChange={(e) => setWaForm({ ...waForm, addressInfo: e.target.value })}
                    placeholder="Es. Via Roma 42, Milano (Parcheggio convenzionato a 50m)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Listino Prezzi / Menu / Servizi Principali</label>
                  <textarea
                    rows={3}
                    value={waForm.pricingMenuInfo}
                    onChange={(e) => setWaForm({ ...waForm, pricingMenuInfo: e.target.value })}
                    placeholder="Inserisci i prezzi, le tariffe o il menu che l'agente può comunicare ai clienti..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white leading-relaxed"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300 font-medium">Prenotazione automatica nel Calendario CRM</span>
                    <input
                      type="checkbox"
                      checked={waForm.bookingEnabled}
                      onChange={(e) => setWaForm({ ...waForm, bookingEnabled: e.target.checked })}
                      className="rounded border-slate-700 text-green-600 focus:ring-green-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300 font-medium">Acquisizione automatica Lead nel CRM</span>
                    <input
                      type="checkbox"
                      checked={waForm.leadCaptureEnabled}
                      onChange={(e) => setWaForm({ ...waForm, leadCaptureEnabled: e.target.checked })}
                      className="rounded border-slate-700 text-green-600 focus:ring-green-500"
                    />
                  </label>
                </div>

                {waAgent?.faqs && waAgent.faqs.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      FAQ Memorizzate dall&apos;Agente ({waAgent.faqs.length})
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {waAgent.faqs.map((faq, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px]">
                          <div className="font-semibold text-green-300">D: {faq.question}</div>
                          <div className="text-slate-400 mt-0.5">R: {faq.answer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-xs shadow-md shadow-green-600/20 transition-all"
                >
                  {isSubmitting ? 'Salvataggio in corso...' : 'Salva Configurazione Agente WhatsApp'}
                </button>
              </form>
            </div>

            {/* Right Column: Live WhatsApp Simulator & Conversation Inbox (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Interactive Simulator Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5" /> Test Live: Simula Messaggio Cliente su WhatsApp
                  </span>
                  <span className="text-[11px] text-slate-400">Risposta AI istantanea + Sync CRM</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={simCustomerName}
                    onChange={(e) => setSimCustomerName(e.target.value)}
                    placeholder="Nome Cliente (es. Marco Rossi)"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    value={simCustomerPhone}
                    onChange={(e) => setSimCustomerPhone(e.target.value)}
                    placeholder="Telefono Cliente (+39 347...)"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simMessageText}
                    onChange={(e) => setSimMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSimulateIncomingMessage();
                      }
                    }}
                    placeholder="Scrivi come un cliente (es. 'Vorrei prenotare per domani alle 20:30 per 4 persone')..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-green-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSimulateIncomingMessage()}
                    disabled={isSubmitting || !simMessageText.trim()}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Invia a WhatsApp AI</span>
                  </button>
                </div>

                {/* Quick Test Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 mr-1">Test rapidi 1-clic:</span>
                  <button
                    type="button"
                    onClick={() => handleSimulateIncomingMessage('Ciao! Vorrei prenotare per domani sera, avete posto?')}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-800/50 text-[11px]"
                  >
                    📅 Prenota Appuntamento / Tavolo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateIncomingMessage('Buongiorno, quali sono i vostri prezzi e come funziona il servizio?')}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-800/50 text-[11px]"
                  >
                    💰 Chiedi Prezzi / Preventivo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateIncomingMessage('Siete aperti oggi? Dove vi trovate e dove posso parcheggiare?')}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-blue-300 border border-blue-800/50 text-[11px]"
                  >
                    📍 Chiedi Orari & Parcheggio
                  </button>
                </div>
              </div>

              {/* Conversations Split View */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 min-h-[420px]">
                {/* Thread List (5 cols) */}
                <div className="md:col-span-5 border-r border-slate-800 pr-2 space-y-2 max-h-[420px] overflow-y-auto">
                  <div className="text-xs font-bold text-slate-300 px-1 pb-1">
                    Conversazioni Recenti ({waConversations.length})
                  </div>
                  {waConversations.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 px-2">
                      Nessuna chat presente. Usa i pulsanti di test rapido qui sopra per provare l&apos;Agente WhatsApp!
                    </div>
                  ) : (
                    waConversations.map((c) => {
                      const isSelected = activeConversation?.id === c.id;
                      const lastMsg = c.messages[c.messages.length - 1];
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedConvId(c.id)}
                          className={`p-3 rounded-xl cursor-pointer border transition-all space-y-1.5 ${
                            isSelected
                              ? 'bg-green-950/30 border-green-500/50'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{c.customerName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{c.customerPhone}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {getWaIntentBadge(c.intentDetected)}
                            {c.linkedLeadId && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Lead CRM ✓
                              </span>
                            )}
                            {c.linkedAppointmentId && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                In Agenda ✓
                              </span>
                            )}
                          </div>
                          {lastMsg && (
                            <p className="text-[11px] text-slate-400 line-clamp-2">{lastMsg.text}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Active Chat Window (7 cols) */}
                <div className="md:col-span-7 flex flex-col justify-between pl-1">
                  {activeConversation ? (
                    <>
                      <div className="border-b border-slate-800 pb-2.5 mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{activeConversation.customerName}</span>
                            <span className="text-xs text-slate-400 font-mono">{activeConversation.customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getWaIntentBadge(activeConversation.intentDetected)}
                            {activeConversation.linkedLeadId && (
                              <span className="text-[10px] text-indigo-300 flex items-center gap-1">
                                <UserCheck className="h-3 w-3" /> Salvato nei Lead CRM
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Messages Bubble List */}
                      <div className="flex-1 space-y-3 overflow-y-auto max-h-[290px] pr-2 py-1">
                        {activeConversation.messages.map((m, idx) => {
                          const isCustomer = m.role === 'customer';
                          return (
                            <div
                              key={idx}
                              className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-line ${
                                  isCustomer
                                    ? 'bg-slate-800 text-slate-100 rounded-tl-none'
                                    : m.role === 'operator'
                                    ? 'bg-indigo-900/80 text-white border border-indigo-700 rounded-tr-none'
                                    : 'bg-green-900/60 text-green-50 border border-green-700/60 rounded-tr-none'
                                }`}
                              >
                                <div className="text-[10px] font-bold mb-1 opacity-75">
                                  {isCustomer
                                    ? `👤 ${activeConversation.customerName}`
                                    : m.role === 'operator'
                                    ? '👨‍💼 Operatore Umano'
                                    : '🤖 Agente WhatsApp AI 24/7'}
                                </div>
                                {m.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Operator Manual Intervention Bar */}
                      <form onSubmit={handleSendOperatorReply} className="pt-3 mt-2 border-t border-slate-800 flex gap-2">
                        <input
                          type="text"
                          value={operatorReplyText}
                          onChange={(e) => setOperatorReplyText(e.target.value)}
                          placeholder="Intervieni manualmente nella chat come operatore..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                        >
                          Rispondi
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      Seleziona o simula una conversazione WhatsApp per visualizzare i messaggi.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: SITO VETRINA & BLOG SEO LOCALE AUTOMATIZZATO                   */}
      {/* ==================================================================== */}
      {activeTab === 'seo_blog' && (
        <div className="space-y-6">
          {/* Top Action Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-purple-950/40 border border-indigo-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Globe className="h-4 w-4" /> Sito Vetrina Ad Alta Conversione & Blog SEO Locale Automatizzato
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Genera automaticamente la struttura del **Sito Vetrina Locale**, i dati strutturati **Schema.org `LocalBusiness` JSON-LD** per Google e gli **Articoli Blog SEO geolocalizzati** sulla città del cliente per dominare le ricerche organiche.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                <input
                  type="text"
                  value={seoTargetCity}
                  onChange={(e) => setSeoTargetCity(e.target.value)}
                  placeholder="Città target (es. Milano)"
                  className="bg-transparent text-xs text-white w-28 focus:outline-none"
                />
              </div>

              <button
                onClick={handleGenerateSeoWebsite}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Genera Sito Vetrina & Schema SEO</span>
              </button>

              <button
                onClick={handleGenerateSeoArticlesBatch}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Genera 4 Articoli Blog SEO Locali</span>
              </button>
            </div>
          </div>

          {/* Showcase Website Preview Card */}
          {seoWebsite ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ● Sito Vetrina Pubblicato • SEO Score {seoWebsite.seoHealthScore}/100
                    </span>
                    <span className="text-xs text-indigo-400 font-mono">
                      {seoWebsite.publicUrl || `/vetrina/${seoWebsite.companyId}`}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1.5">{seoWebsite.heroTitle}</h3>
                  <p className="text-xs text-slate-300 mt-1">{seoWebsite.heroSubtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={seoWebsite.publicUrl || `/vetrina/${seoWebsite.companyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Apri Sito Vetrina Live</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const fullUrl = `${window.location.origin}${seoWebsite.publicUrl || `/vetrina/${seoWebsite.companyId}`}`;
                      navigator.clipboard.writeText(fullUrl);
                      showToast('Link pubblico del Sito Vetrina copiato negli appunti!');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copia Link Pubblico</span>
                  </button>

                  <button
                    onClick={() => setShowSchemaModal(true)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Code className="h-4 w-4" />
                    <span>Schema.org JSON-LD</span>
                  </button>
                </div>
              </div>

              {/* Services Showcase Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {seoWebsite.servicesShowcase.map((srv, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="space-y-1.5">
                      {srv.badge && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                          {srv.badge}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-white">{srv.name}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{srv.description}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">{srv.priceLabel}</span>
                      <span className="text-[11px] text-indigo-300 font-medium">{seoWebsite.primaryCtaText} →</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Geolocalized Keywords Bar */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                  <Search className="h-3.5 w-3.5 text-indigo-400" /> Keywords Locali presidiate:
                </span>
                {seoWebsite.targetKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full text-[11px] bg-indigo-950/60 text-indigo-300 border border-indigo-800/50"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
              <Globe className="h-8 w-8 text-indigo-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Sito Vetrina Locale non ancora generato</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clicca su &ldquo;Genera Sito Vetrina & Schema SEO&rdquo; per creare subito Hero, Servizi, Keywords geolocalizzate e dati strutturati JSON-LD per Google.
              </p>
            </div>
          )}

          {/* Automated SEO Blog Articles Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-400" />
                <span>Articoli Blog SEO Geolocalizzati ({seoArticles.length})</span>
              </h3>
              <a
                href="/vetrina"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Esplora Directory Pubblica Vetrine</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {loadingSeo ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
                <span className="text-xs">Caricamento articoli SEO...</span>
              </div>
            ) : seoArticles.length === 0 ? (
              <div className="py-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-6 space-y-3">
                <p className="text-xs text-slate-400">
                  Nessun articolo SEO presente. Clicca su &ldquo;Genera 4 Articoli Blog SEO Locali&rdquo; per produrre automaticamente articoli ottimizzati sulla città e sul settore dell&apos;attività.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {seoArticles.map((art) => {
                  const baseVetrinaUrl = seoWebsite?.publicUrl || `/vetrina/${art.companyId}`;
                  const publicArticleUrl = `${baseVetrinaUrl}/blog/${art.slug}`;
                  return (
                    <div
                      key={art.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              SEO {art.seoScore}/100
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              📍 {art.targetCity}
                            </span>
                            <span className="text-[11px] text-slate-400">• {art.readingTimeMinutes} min lettura</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-emerald-400">
                            {art.publishStatus}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white">{art.title}</h4>
                        <div className="text-[11px] text-amber-300 font-mono">
                          Keyword Target: &ldquo;{art.targetKeyword}&rdquo; • /{art.slug}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{art.excerpt}</p>

                        {/* SERP Snippet Preview */}
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Anteprima Risultato Google (SERP)</div>
                          <div className="text-xs font-semibold text-blue-400 truncate">{art.metaTitle}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-2">{art.metaDescription}</div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <a
                            href={publicArticleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Vedi Articolo Live</span>
                          </a>
                          <button
                            onClick={() => setPreviewArticle(art)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 font-semibold text-xs flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Anteprima</span>
                          </button>
                          <button
                            onClick={() => copyPostToClipboard(art.id, art.contentHtml)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                          >
                            {copiedPostId === art.id ? (
                              <span className="text-emerald-300">HTML Copiato ✓</span>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copia HTML</span>
                              </>
                            )}
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteSeoArticle(art.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: PREVIEW ARTICOLO BLOG SEO COMPLETO                            */}
      {/* ==================================================================== */}
      {previewArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setPreviewArticle(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 pr-8">
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold">
                <span>Keyword: {previewArticle.targetKeyword}</span>
                <span>•</span>
                <span>Città: {previewArticle.targetCity}</span>
                <span>•</span>
                <span>SEO Score: {previewArticle.seoScore}/100</span>
              </div>
              <h3 className="text-lg font-bold text-white">{previewArticle.title}</h3>
            </div>

            <div
              className="prose prose-invert prose-sm max-w-none bg-slate-950 border border-slate-800 rounded-xl p-5 text-slate-200 space-y-3 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: previewArticle.contentHtml }}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  copyPostToClipboard(previewArticle.id, previewArticle.contentHtml);
                  showToast('Codice HTML dell articolo copiato negli appunti!');
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copia Articolo HTML per WordPress / Sito</span>
              </button>
              <button
                onClick={() => setPreviewArticle(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: SCHEMA.ORG LOCALBUSINESS JSON-LD                              */}
      {/* ==================================================================== */}
      {showSchemaModal && seoWebsite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowSchemaModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
            <div>
              <h3 className="text-base font-bold text-white">Dati Strutturati Schema.org LocalBusiness (JSON-LD)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pronto da inserire nell&apos;header del sito per comunicare a Google indirizzo, orari, coordinate e fascia prezzo.
              </p>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-80">
              {seoWebsite.schemaMarkupJson}
            </pre>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(seoWebsite.schemaMarkupJson || '');
                  showToast('Schema.org JSON-LD copiato negli appunti!');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Copia JSON-LD
              </button>
            </div>
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
                  L&apos;Agente AI pianificherà un intero mese di contenuti strategici bilanciati.
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
                  <label className="font-semibold text-slate-300 block mb-1">Settore dell&apos;Attività</label>
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
                <label className="font-semibold text-slate-300 block mb-1">Titolo dell&apos;Aggiornamento</label>
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
