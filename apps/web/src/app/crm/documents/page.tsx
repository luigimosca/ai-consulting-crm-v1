'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  FileText,
  Search,
  Upload,
  Download,
  Trash2,
  Filter,
  FolderKanban,
  Briefcase,
  FileCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export default function GlobalDocumentsPage() {
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');

  // Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('deliverable');
  const [uploadEntityType, setUploadEntityType] = useState('project');
  const [uploadEntityId, setUploadEntityId] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      let url = `/api/documents?t=${Date.now()}`;
      if (categoryFilter !== 'all') url += `&category=${categoryFilter}`;
      if (entityTypeFilter !== 'all') url += `&entityType=${entityTypeFilter}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;

      const [docsRes, projRes] = await Promise.all([
        fetch(url),
        fetch('/api/projects'),
      ]);

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocumentsList(data.documents || []);
      }

      if (projRes.ok) {
        const pData = await projRes.json();
        setProjectsList(pData.projects || []);
        if (pData.projects?.length > 0 && !uploadEntityId) {
          setUploadEntityId(pData.projects[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter, entityTypeFilter]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle || uploadFile.name);
      formData.append('category', uploadCategory);
      formData.append('entityType', uploadEntityType);
      formData.append('entityId', uploadEntityId);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        fetchDocuments();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Errore durante il caricamento del file');
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare definitivamente questo documento?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'deliverable':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">Deliverable</Badge>;
      case 'brief':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">Brief</Badge>;
      case 'contratto':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">Contratto</Badge>;
      case 'preventivo_firmato':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30">Preventivo Firmato</Badge>;
      case 'specifica_tecnica':
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30">Specifica</Badge>;
      case 'report':
        return <Badge variant="outline" className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30">Report</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Vault Documentale</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              {documentsList.length} File
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Archiviazione sicura e centralizzata di contratti, deliverable, brief e allegati operativi (max 25MB).
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsUploadModalOpen(true)}
          className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Carica File nel Vault</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cerca per titolo o nome file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDocuments()}
            className="pl-9 bg-slate-900 border-slate-800 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border-slate-800 text-xs w-40"
          >
            <option value="all">Tutte le categorie</option>
            <option value="deliverable">Deliverable</option>
            <option value="brief">Brief</option>
            <option value="contratto">Contratto</option>
            <option value="preventivo_firmato">Preventivo Firmato</option>
            <option value="specifica_tecnica">Specifica Tecnica</option>
            <option value="report">Report</option>
            <option value="altro">Altro</option>
          </Select>

          <Select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="bg-slate-900 border-slate-800 text-xs w-36"
          >
            <option value="all">Tutte le entità</option>
            <option value="project">Progetto</option>
            <option value="order">Commessa</option>
            <option value="quote">Preventivo</option>
            <option value="task">Attività</option>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchDocuments} className="text-xs">
            Filtra
          </Button>
        </div>
      </div>

      {/* Documents Table */}
      <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Entità Collegata</th>
                <th className="py-3 px-4">Dimensione</th>
                <th className="py-3 px-4">Caricato Da</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Caricamento vault in corso...
                  </td>
                </tr>
              ) : documentsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nessun documento trovato nel Vault.
                  </td>
                </tr>
              ) : (
                documentsList.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200">{doc.title}</div>
                          <div className="text-[10px] font-mono text-slate-400">{doc.originalName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getCategoryBadge(doc.category)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] text-blue-400 uppercase bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/40">
                        {doc.entityType}: {doc.entityId?.slice(0, 10)}...
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {doc.uploadedByName || 'Admin'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {doc.createdAt?.slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(doc.id)}
                          className="p-1 h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL: UPLOAD FILE */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Carica Documento nel Vault</h3>

            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Titolo Documento *</label>
                <Input
                  required
                  placeholder="Es: Contratto Firmato o Deliverable Finale"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Categoria</label>
                  <Select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    <option value="deliverable">Deliverable</option>
                    <option value="brief">Brief</option>
                    <option value="contratto">Contratto</option>
                    <option value="preventivo_firmato">Preventivo Firmato</option>
                    <option value="specifica_tecnica">Specifica Tecnica</option>
                    <option value="report">Report</option>
                    <option value="altro">Altro</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Tipo Entità</label>
                  <Select
                    value={uploadEntityType}
                    onChange={(e) => setUploadEntityType(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    <option value="project">Progetto</option>
                    <option value="order">Commessa</option>
                    <option value="quote">Preventivo</option>
                    <option value="task">Attività</option>
                  </Select>
                </div>
              </div>

              {uploadEntityType === 'project' && (
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Progetto di Riferimento</label>
                  <Select
                    value={uploadEntityId}
                    onChange={(e) => setUploadEntityId(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.title}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {uploadEntityType !== 'project' && (
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">ID Entità di Riferimento</label>
                  <Input
                    required
                    placeholder="Es: ord_... o qte_..."
                    value={uploadEntityId}
                    onChange={(e) => setUploadEntityId(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">File da Caricare (max 25MB) *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setIsUploadModalOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" isLoading={isUploading} className="bg-emerald-600 hover:bg-emerald-500">
                  Carica nel Vault
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
