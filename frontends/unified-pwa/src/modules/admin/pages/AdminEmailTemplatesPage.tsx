import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Mail,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  History,
  RotateCcw,
  X,
  ShieldCheck,
  ShieldAlert,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import {
  adminEmailTemplateService,
  type EmailTemplate,
  type BrevoRemoteTemplate
} from '../../../services/adminEmailTemplate.service';
import { AppLoader } from '../../../components/common/AppLoader';
import { useAuth } from '../../../providers/AuthContext';

export const AdminEmailTemplatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'ALL' | 'APPLICATION' | 'BREVO' | 'DRAFTS' | 'PUBLISHED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedHistoryTemplate, setSelectedHistoryTemplate] = useState<EmailTemplate | null>(null);
  const [quickTestTemplate, setQuickTestTemplate] = useState<EmailTemplate | null>(null);
  const [quickTestEmail, setQuickTestEmail] = useState('');

  const quickTestMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      adminEmailTemplateService.sendTestEmail(id, email),
    onSuccess: () => {
      toast.success(`Test email dispatched to ${quickTestEmail}`);
      setQuickTestTemplate(null);
      setQuickTestEmail('');
    },
    onError: (err: any) => {
      toast.error(`Test Send Failed: ${err.message}`);
    },
  });

  const { data: inventory, isLoading, isRefetching } = useQuery({
    queryKey: ['adminEmailTemplates'],
    queryFn: adminEmailTemplateService.getInventory,
    staleTime: 60 * 1000,
  });

  const { data: historyDetails, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['emailTemplateHistory', selectedHistoryTemplate?.id],
    queryFn: () => adminEmailTemplateService.getTemplateById(selectedHistoryTemplate!.id),
    enabled: Boolean(selectedHistoryTemplate?.id),
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ id, versionId }: { id: string; versionId: string }) =>
      adminEmailTemplateService.rollbackTemplate(id, versionId),
    onSuccess: () => {
      toast.success('Successfully rolled back template version and synchronized Brevo');
      setSelectedHistoryTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['adminEmailTemplates'] });
    },
    onError: (err: any) => {
      toast.error(`Rollback Failed: ${err.message}`);
    },
  });

  const syncMutation = useMutation({
    mutationFn: adminEmailTemplateService.syncBrevo,
    onSuccess: (data) => {
      toast.success(`Synchronized ${data.count || 0} templates from Brevo`);
      queryClient.invalidateQueries({ queryKey: ['adminEmailTemplates'] });
    },
    onError: (err: any) => {
      toast.error(`Brevo Sync Failed: ${err.message}`);
    },
  });

  const importMutation = useMutation({
    mutationFn: (brevoId: number) => adminEmailTemplateService.importBrevoTemplate(brevoId),
    onSuccess: () => {
      toast.success('Template imported as application draft');
      queryClient.invalidateQueries({ queryKey: ['adminEmailTemplates'] });
    },
    onError: (err: any) => {
      toast.error(`Import Failed: ${err.message}`);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => adminEmailTemplateService.duplicateTemplate(id),
    onSuccess: () => {
      toast.success('Template duplicated');
      queryClient.invalidateQueries({ queryKey: ['adminEmailTemplates'] });
    },
    onError: (err: any) => {
      toast.error(`Duplicate Failed: ${err.message}`);
    },
  });

  if (isLoading) {
    return <AppLoader variant="page" message="Loading email template management registry..." />;
  }

  const localTemplates = inventory?.localTemplates || [];
  const brevoTemplates = inventory?.brevoTemplates || [];
  const codeTemplates = inventory?.codeTemplates || [];

  // Metrics
  const totalLocal = localTemplates.length;
  const totalBrevo = brevoTemplates.length;
  const publishedCount = localTemplates.filter((t) => t.status === 'PUBLISHED').length;
  const draftCount = localTemplates.filter((t) => t.status === 'DRAFT').length;

  // Filter local templates
  const filteredLocal = localTemplates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.template_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchesTab =
      activeTab === 'ALL' ||
      activeTab === 'APPLICATION' ||
      (activeTab === 'DRAFTS' && t.status === 'DRAFT') ||
      (activeTab === 'PUBLISHED' && t.status === 'PUBLISHED');
    return matchesSearch && matchesCategory && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#e6e8ec] dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#0f2f63]/10 text-[#0f2f63] dark:bg-blue-900/30 dark:text-blue-400">
              <Mail className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#0f2f63] dark:text-white">Email Template Studio</h1>
          </div>
          <p className="text-sm text-[#717784] dark:text-zinc-400">
            Design, preview, test, and publish custom transactional email templates with live Brevo synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || isRefetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending || isRefetching ? 'animate-spin' : ''}`} />
            Refresh Brevo
          </button>

          <Link
            to="/admin/email-templates/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0f2f63] hover:bg-[#1a4487] text-white transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Template
          </Link>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">App Templates</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalLocal}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Published Live</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{publishedCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Drafts in Progress</span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{draftCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Brevo Remote</span>
          <div className="text-2xl font-bold text-[#0f2f63] dark:text-blue-400 mt-1">{totalBrevo}</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates, keys, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#0f2f63]"
          />
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Templates' },
            { id: 'APPLICATION', label: 'TrustHyre Managed' },
            { id: 'BREVO', label: 'Brevo Remote' },
            { id: 'DRAFTS', label: 'Drafts' },
            { id: 'PUBLISHED', label: 'Published' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: TrustHyre Managed Templates */}
      {(activeTab === 'ALL' || activeTab === 'APPLICATION' || activeTab === 'DRAFTS' || activeTab === 'PUBLISHED') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              TrustHyre Managed Templates ({filteredLocal.length})
            </h2>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
            {filteredLocal.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                No templates matched your current filters. Click "Create Template" to begin.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Template Name &amp; Key</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold">Brevo ID</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Last Modified</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {filteredLocal.map((tpl) => (
                      <tr key={tpl.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{tpl.name}</div>
                          <div className="font-mono text-[11px] text-[#0f2f63] dark:text-blue-400">{tpl.template_key}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{tpl.subject}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                            {tpl.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {tpl.brevo_template_id ? `#${tpl.brevo_template_id}` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              tpl.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {tpl.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {tpl.updated_at ? new Date(tpl.updated_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setQuickTestTemplate(tpl);
                                setQuickTestEmail(user?.email || '');
                              }}
                              title="Send Live Test Email (Protected by Rate Limiter)"
                              className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedHistoryTemplate(tpl)}
                              title="View Version History & Rollback"
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateMutation.mutate(tpl.id)}
                              title="Duplicate Template"
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              to={`/admin/email-templates/${tpl.id}/edit`}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-[#0f2f63]/10 text-[#0f2f63] hover:bg-[#0f2f63] hover:text-white dark:bg-blue-900/30 dark:text-blue-300 transition"
                            >
                              Edit / Preview
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 2: Code-Managed Built-in Templates */}
      {(activeTab === 'ALL' || activeTab === 'APPLICATION') && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Existing Application Templates (Code-Managed)
              </h2>
              <p className="text-xs text-slate-500">
                Built-in email senders in TypeScript. Initially managed in code until safely migrated.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {codeTemplates.map((codeTpl) => {
              const existingDbTpl = localTemplates.find((lt) => lt.template_key === codeTpl.key);
              return (
                <div
                  key={codeTpl.key}
                  className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        {codeTpl.category}
                      </span>
                      {existingDbTpl ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Managed in DB
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Code-Only</span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2">{codeTpl.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{codeTpl.description}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-400 flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{codeTpl.key}</span>
                    {existingDbTpl ? (
                      <Link
                        to={`/admin/email-templates/${existingDbTpl.id}/edit`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-2xs shrink-0"
                      >
                        Edit Template
                      </Link>
                    ) : (
                      <Link
                        to={`/admin/email-templates/new?codeKey=${encodeURIComponent(codeTpl.key)}&name=${encodeURIComponent(codeTpl.name)}&category=${encodeURIComponent(codeTpl.category)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#1a4487] dark:hover:bg-[#0052cc] text-white transition shadow-2xs shrink-0"
                      >
                        <Sparkles className="w-3 h-3" />
                        Import &amp; Customize
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: Brevo Remote Templates */}
      {(activeTab === 'ALL' || activeTab === 'BREVO') && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Brevo Remote Templates ({brevoTemplates.length})
              </h2>
              <p className="text-xs text-slate-500">
                Transactional templates living directly on Brevo's delivery servers.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
            {brevoTemplates.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                No templates discovered in Brevo, or Brevo API is currently offline.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Brevo ID &amp; Name</th>
                      <th className="py-3 px-4 font-semibold">Subject</th>
                      <th className="py-3 px-4 font-semibold">Sender</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {brevoTemplates.map((bt) => (
                      <tr key={bt.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{bt.name}</div>
                          <div className="font-mono text-[11px] text-[#0f2f63] dark:text-blue-400">ID: #{bt.id}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-zinc-300 max-w-xs truncate">
                          {bt.subject || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {bt.sender?.email || 'Default'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              bt.isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {bt.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => importMutation.mutate(bt.id)}
                            disabled={importMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            Import as Copy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Version History & Rollback Modal */}
      {selectedHistoryTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-['Onest',system-ui,sans-serif]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#0f2f63] dark:text-blue-400 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    Version History: {selectedHistoryTemplate.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                  Key: {selectedHistoryTemplate.template_key}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryTemplate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Versions List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading version timeline...
                </div>
              ) : (historyDetails?.versions || []).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No published revisions found for this template yet. Save and publish a version to generate history.
                </div>
              ) : (
                (historyDetails?.versions || [])
                  .slice()
                  .sort((a, b) => b.version_number - a.version_number)
                  .map((v) => {
                    const isCurrent = selectedHistoryTemplate.published_version_id === v.id;
                    return (
                      <div
                        key={v.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                            : 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                Version #{v.version_number}
                              </span>
                              {isCurrent ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                  Currently Active
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                                  Previous Revision
                                </span>
                              )}
                              {v.brevo_template_id && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  Brevo #{v.brevo_template_id}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1">
                              <strong>Subject:</strong> {v.subject}
                            </p>

                            {v.change_summary && (
                              <p className="text-xs text-slate-500 mt-1 italic">
                                "{v.change_summary}"
                              </p>
                            )}

                            <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2 flex-wrap">
                              <span>Published: {new Date(v.published_at || v.created_at).toLocaleString('en-IN')}</span>
                              {v.created_by && <span>• Author: {v.created_by}</span>}
                            </div>
                          </div>

                          {/* Rollback Action */}
                          {!isCurrent && (
                            <div className="shrink-0">
                              {isSuperAdmin ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    rollbackMutation.mutate({
                                      id: selectedHistoryTemplate.id,
                                      versionId: v.id,
                                    })
                                  }
                                  disabled={rollbackMutation.isPending}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 transition shadow-2xs cursor-pointer disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Rollback to #{v.version_number}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  Super Admin only
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-200 dark:border-zinc-800 text-right">
              <button
                type="button"
                onClick={() => setSelectedHistoryTemplate(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-800 dark:text-zinc-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quick Test Email Modal */}
      {quickTestTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                Send Live Test Email
              </h3>
              <button
                type="button"
                onClick={() => setQuickTestTemplate(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 space-y-1">
              <div className="font-semibold flex items-center justify-between">
                <span>Template: {quickTestTemplate.name}</span>
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                  {quickTestTemplate.template_key}
                </span>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-400">
                Subject: <span className="italic">{quickTestTemplate.subject}</span>
              </p>
            </div>

            {/* Rate Limiting Notice */}
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>Rate Limiter Active:</strong> Maximum 10 test emails per 5 minutes per administrator. Emails are delivered live via Brevo transactional servers.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Recipient Test Email Address *
              </label>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={quickTestEmail}
                onChange={(e) => setQuickTestEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickTestTemplate(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  quickTestMutation.mutate({
                    id: quickTestTemplate.id,
                    email: quickTestEmail.trim(),
                  })
                }
                disabled={quickTestMutation.isPending || !quickTestEmail.includes('@')}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#0f2f63] hover:bg-[#1a4487] text-white disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
              >
                {quickTestMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Dispatch Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
