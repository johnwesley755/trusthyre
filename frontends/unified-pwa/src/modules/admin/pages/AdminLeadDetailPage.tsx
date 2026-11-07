import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadService } from '../../../services/lead.service';
import { mediaService } from '../../../services/media.service';
import { sanitizeHtmlDescription } from '../../../utils/textSanitizer';
import { TRADE_COVER_PRESETS, resolveTradeCover, resolveJobCategoryLabel } from '../../../utils/coverImage.utils';
import { AppLoader } from '../../../components/common/AppLoader';
import { toast } from 'sonner';
import {
  Building2,
  Globe,
  ExternalLink,
  Mail,
  Phone,
  Link2,
  Calendar,
  Sparkles,
  ArrowLeft,
  Edit3,
  Save,
  Check,
  Send,
  Loader2,
  Image as ImageIcon,
  UploadCloud,
  Briefcase,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';

const formatLink = (url?: string | null): string => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

const stripHtml = (html?: string | null): string => {
  if (!html) return '';
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    } catch {}
  }
  return html.replace(/<[^>]*>/g, ' ').trim();
};

export const AdminLeadDetailPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);

  // Edit Form State for currently active requirement
  const [editReqForm, setEditReqForm] = useState<{
    title: string;
    description: string;
    salaryRange: string;
    workersNeeded: number;
    coverImageUrl: string;
    category: string;
    city: string;
    address: string;
    experienceYearsRequired: number;
    allowDirectCall: boolean;
    allowDirectWhatsapp: boolean;
    contactPhone: string;
    isUrgentSpotHire: boolean;
    isWalkInInterview: boolean;
    walkInDates: string;
    walkInTiming: string;
    walkInVenue: string;
    walkInContactPerson: string;
    perks: string[];
    department: string;
    roleCategory: string;
    employmentType: string;
    shift: string;
    experience: string;
    education: string;
    languages: string;
    ageLimit: string;
    gender: string;
  }>({
    title: '',
    description: '',
    salaryRange: '',
    workersNeeded: 1,
    coverImageUrl: '',
    category: 'ELECTRICAL',
    city: '',
    address: '',
    experienceYearsRequired: 0,
    allowDirectCall: true,
    allowDirectWhatsapp: true,
    contactPhone: '',
    isUrgentSpotHire: false,
    isWalkInInterview: false,
    walkInDates: '',
    walkInTiming: '',
    walkInVenue: '',
    walkInContactPerson: '',
    perks: [],
    department: '',
    roleCategory: '',
    employmentType: '',
    shift: '',
    experience: '',
    education: '',
    languages: '',
    ageLimit: '',
    gender: '',
  });

  // Outreach Form State
  const [outreachForm, setOutreachForm] = useState({
    channel: 'PHONE',
    contactTarget: '',
    notes: '',
    outcome: 'INTERESTED',
  });

  const { data: lead, isLoading } = useQuery({
    queryKey: ['adminLeadDetail', leadId],
    queryFn: () => leadService.getLeadById(leadId!),
    enabled: Boolean(leadId),
  });

  const updateReqMutation = useMutation({
    mutationFn: ({ reqId, data }: { reqId: string; data: any }) =>
      leadService.updateRequirement(leadId!, reqId, data),
    onSuccess: () => {
      toast.success('Job requisition updated successfully');
      queryClient.invalidateQueries({ queryKey: ['adminLeadDetail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
      setEditingReqId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update requirement'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => leadService.updateStatus(leadId!, status),
    onSuccess: () => {
      toast.success('Lead progress updated');
      queryClient.invalidateQueries({ queryKey: ['adminLeadDetail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update lead status'),
  });

  const outreachMutation = useMutation({
    mutationFn: (data: typeof outreachForm) => leadService.logOutreach(leadId!, data),
    onSuccess: () => {
      toast.success('Outreach call logged successfully');
      setOutreachForm({ channel: 'PHONE', contactTarget: '', notes: '', outcome: 'INTERESTED' });
      queryClient.invalidateQueries({ queryKey: ['adminLeadDetail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to log outreach'),
  });

  const convertMutation = useMutation({
    mutationFn: () => leadService.convertLead(leadId!),
    onSuccess: (res) => {
      toast.success(`Company successfully onboarded to TrustHyre (${res.email})! Job post created.`);
      queryClient.invalidateQueries({ queryKey: ['adminLeadDetail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to onboard company'),
  });

  const startEditing = (req: any) => {
    setEditingReqId(req.id);
    let reqExtra: any = {};
    if (req.normalized_title && req.normalized_title.startsWith('{')) {
      try { reqExtra = JSON.parse(req.normalized_title); } catch {}
    }
    const walkIn = (req as any).walkInDetails || (req as any).walk_in_details || reqExtra?.walkInDetails || {};
    const rawPerks = Array.isArray((req as any).perks)
      ? (req as any).perks
      : (Array.isArray(reqExtra?.perks) ? reqExtra.perks : []);

    setEditReqForm({
      title: req.title || '',
      description: req.description || '',
      salaryRange: req.salary_range || '',
      workersNeeded: req.workers_needed || 1,
      coverImageUrl: reqExtra?.coverImageUrl || (req as any).cover_image_url || '',
      category: req.category || reqExtra?.category || lead?.industry || 'ELECTRICAL',
      city: req.city || lead?.city || '',
      address: req.location || reqExtra?.address || '',
      experienceYearsRequired: reqExtra?.experienceYearsRequired ?? 0,
      allowDirectCall: reqExtra?.allowDirectCall ?? true,
      allowDirectWhatsapp: reqExtra?.allowDirectWhatsapp ?? true,
      contactPhone: reqExtra?.contactPhone || lead?.official_phone || '',
      isUrgentSpotHire: Boolean(reqExtra?.isUrgentSpotHire),
      isWalkInInterview: Boolean(reqExtra?.isWalkInInterview),
      walkInDates: walkIn.dates || '',
      walkInTiming: walkIn.timing || '',
      walkInVenue: walkIn.venue || '',
      walkInContactPerson: walkIn.contactPerson || '',
      perks: rawPerks,
      department: reqExtra.department || '',
      roleCategory: reqExtra.roleCategory || reqExtra.role_category || '',
      employmentType: reqExtra.employmentType || reqExtra.employment_type || '',
      shift: reqExtra.shift || '',
      experience: reqExtra.experience || '',
      education: reqExtra.education || '',
      languages: reqExtra.languages || reqExtra.englishLevel || '',
      ageLimit: reqExtra.ageLimit || '',
      gender: reqExtra.gender || '',
    });
  };

  if (isLoading) {
    return <AppLoader variant="fullscreen" message="Loading hiring company details..." />;
  }

  if (!lead) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-[#0a0a0a]">Hiring Company Record Not Found</h2>
        <p className="text-sm text-[#717784] mt-1 mb-4">This lead record may have been merged or deleted.</p>
        <button
          onClick={() => navigate('/admin/leads')}
          className="px-4 py-2 bg-[#0f2f63] text-white rounded-xl text-xs font-bold"
        >
          Return to Hiring Leads
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 p-3 sm:p-6 font-['Onest',system-ui,sans-serif]">
      {/* Back button & Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e6e8ec]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/leads')}
            className="p-2 rounded-xl border border-[#e2e4e9] bg-white text-[#717784] hover:text-[#0a0a0a] hover:bg-[#f4f5f8] transition-all cursor-pointer shadow-2xs"
            title="Back to all leads"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#0f2f63] uppercase tracking-wider">Hiring Company Lead Dossier</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0f2f63] border border-blue-200">
                ID: {lead.id.slice(0, 8)}...
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0a0a0a] tracking-tight mt-0.5">
              {lead.company_name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {lead.status !== 'ONBOARDED' && (
            <button
              type="button"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0f2f63] hover:bg-[#163e7f] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Onboard to TrustHyre (Publish Jobs)</span>
            </button>
          )}
        </div>
      </div>

      {/* Company Metadata Header Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Company Identity */}
        <div className="bg-white p-5 rounded-2xl border border-[#e2e4e9] shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50/80 border border-blue-100 text-[#0f2f63] font-black flex items-center justify-center text-xl shrink-0">
              {lead.company_name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0a0a0a]">{lead.company_name}</h3>
              <p className="text-xs text-[#717784] font-medium">{lead.industry || 'General Trade'} • {lead.city || 'Pan India'}</p>
            </div>
          </div>
          {lead.company_website ? (
            <a
              href={formatLink(lead.company_website)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#0f2f63] hover:underline font-semibold"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lead.company_website.replace(/^https?:\/\//, '')}</span>
              <ExternalLink className="w-3 h-3 text-[#717784]" />
            </a>
          ) : (
            <span className="text-xs text-[#94a3b8] italic">No website URL recorded</span>
          )}
        </div>

        {/* Contact Information */}
        <div className="bg-white p-5 rounded-2xl border border-[#e2e4e9] shadow-xs space-y-2.5">
          <span className="text-[10px] font-bold text-[#717784] uppercase tracking-wider block">Official Channels</span>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#717784] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" /> Phone:
              </span>
              <span className="font-semibold text-[#0a0a0a]">{lead.official_phone || 'Finding contacts...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#717784] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#0f2f63]" /> Email:
              </span>
              <span className="font-semibold text-[#0a0a0a] truncate max-w-[200px]">{lead.official_email || 'Not Provided'}</span>
            </div>
            {lead.contact_page_url && (
              <div className="flex items-center justify-between pt-1 border-t border-[#e2e4e9]">
                <span className="text-[#717784]">Contact Form:</span>
                <a
                  href={formatLink(lead.contact_page_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0f2f63] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Open Page</span>
                  <ExternalLink className="w-3 h-3 text-[#717784]" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Lifecycle Status */}
        <div className="bg-white p-5 rounded-2xl border border-[#e2e4e9] shadow-xs space-y-2.5">
          <span className="text-[10px] font-bold text-[#717784] uppercase tracking-wider block">Pipeline Stage</span>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#717784]">Stage:</span>
            <select
              value={lead.status}
              onChange={(e) => updateStatusMutation.mutate(e.target.value)}
              className="bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#0a0a0a] outline-none focus:border-[#0f2f63]"
            >
              <option value="DISCOVERED">New Found</option>
              <option value="VERIFIED">Verified Info</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="ONBOARDED">Joined TrustHyre</option>
              <option value="EXPIRED">Closed / Expired</option>
            </select>
          </div>
          <div className="text-[11px] text-[#717784] flex justify-between pt-1">
            <span>First Discovered:</span>
            <span className="font-medium text-[#0a0a0a]">
              {new Date(lead.created_at).toLocaleDateString()}
            </span>
          </div>
          {lead.trusthire_employer_id && (
            <div className="p-2 bg-blue-50 text-[#0f2f63] rounded-xl text-[11px] font-bold text-center border border-blue-200">
              Linked Live TrustHyre Employer
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Requisitions List & Full Edit Mode, Right Outreach Call Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Job Requisitions with Complete Inline Editor */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0a0a0a]">
                Open Opportunities & Job Requisitions ({lead.requirements?.length || 0})
              </h2>
              <p className="text-xs text-[#717784]">Click "Edit Full Details" on any opening to configure banner, perks, walk-ins, and shift requirements.</p>
            </div>
          </div>

          <div className="space-y-4">
            {lead.requirements?.map((req) => {
              const isCurrentlyEditing = editingReqId === req.id;
              const cleanDesc = stripHtml(req.description);

              if (isCurrentlyEditing) {
                return (
                  <div key={req.id} className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#0f2f63] shadow-lg space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-[#e6e8ec]">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-[#0f2f63]" />
                        <h3 className="text-sm font-bold text-[#0a0a0a] uppercase tracking-wide">Editing Job Requisition</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingReqId(null)}
                        className="p-1 text-[#717784] hover:text-[#0a0a0a] rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cover Photo & Category Section */}
                    <div className="bg-[#f8f9fa] p-4 rounded-2xl border border-[#e6e8ec] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-[#0f2f63]" />
                          <span className="text-[11px] font-bold text-[#0a0a0a] uppercase tracking-wide">Worksite Photo & Cover Banner</span>
                        </div>
                        {editReqForm.coverImageUrl && (
                          <button
                            type="button"
                            onClick={() => setEditReqForm({ ...editReqForm, coverImageUrl: '' })}
                            className="text-[10px] text-rose-600 font-semibold hover:underline cursor-pointer"
                          >
                            Reset to Auto-Cover
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3.5">
                        <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-slate-200 border border-[#e2e4e9] relative shrink-0">
                          <img
                            src={editReqForm.coverImageUrl || resolveTradeCover(editReqForm.title, editReqForm.category)}
                            alt="Job cover"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded font-medium backdrop-blur-xs">
                            {editReqForm.coverImageUrl ? 'Custom' : 'Auto Category'}
                          </div>
                        </div>

                        <div className="w-full flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/jpg"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setIsUploading(true);
                                const localReader = new FileReader();
                                localReader.onload = (ev) => {
                                  const res = ev.target?.result as string;
                                  if (res) setEditReqForm(prev => ({ ...prev, coverImageUrl: res }));
                                };
                                localReader.readAsDataURL(file);
                                try {
                                  const res = await mediaService.uploadFile(file);
                                  if (res?.url) {
                                    setEditReqForm(prev => ({ ...prev, coverImageUrl: res.url }));
                                    toast.success('Cover photo uploaded!');
                                  }
                                } catch {
                                  toast.success('Photo ready!');
                                } finally {
                                  setIsUploading(false);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="px-3.5 py-1.5 rounded-lg bg-[#0f2f63] hover:bg-[#1a4487] text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                              <span>Upload Photo</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {TRADE_COVER_PRESETS.slice(0, 8).map(preset => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => setEditReqForm({ ...editReqForm, coverImageUrl: preset.url })}
                                className={`text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer transition-all ${
                                  editReqForm.coverImageUrl === preset.url 
                                    ? 'bg-[#0f2f63] text-white border-[#0f2f63]' 
                                    : 'bg-white text-[#717784] border-[#e6e8ec] hover:border-[#0f2f63]'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Title & Core Inputs */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Job Title *</label>
                      <input
                        type="text"
                        value={editReqForm.title}
                        onChange={(e) => setEditReqForm({ ...editReqForm, title: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e4e9] text-xs font-semibold focus:outline-none focus:border-[#0f2f63]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Trade Category *</label>
                        <select
                          value={editReqForm.category}
                          onChange={(e) => setEditReqForm({ ...editReqForm, category: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-semibold focus:outline-none focus:border-[#0f2f63] bg-white cursor-pointer"
                        >
                          <option value="ELECTRICAL">⚡ Electrical & Maintenance</option>
                          <option value="PLUMBING">🔧 Plumbing & Sanitation</option>
                          <option value="CONSTRUCTION">🏗️ Construction & Civil</option>
                          <option value="CARPENTRY">🪚 Carpentry & Woodwork</option>
                          <option value="PAINTING">🎨 Painting & Finishing</option>
                          <option value="HVAC">❄️ HVAC & Refrigeration</option>
                          <option value="WELDING">🔥 Welding & Fabrication</option>
                          <option value="LOGISTICS">🚚 Delivery & Driving</option>
                          <option value="FACILITY_MANAGEMENT">🏢 Facility Management</option>
                          <option value="SOLAR_RENEWABLE">☀️ Solar & Renewable</option>
                          <option value="AUTOMOTIVE">🚗 Automotive & Mechanic</option>
                          <option value="HOSPITALITY">🍽️ Cooking & Hospitality</option>
                          <option value="RETAIL">🛍️ Retail & Store Operations</option>
                          <option value="HEALTHCARE">🏥 Healthcare & Medical Staff</option>
                          <option value="EDUCATION">🎓 Education & Training</option>
                          <option value="OFFICE_ADMIN">💼 Office Admin & Computer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Salary Range</label>
                        <input
                          type="text"
                          value={editReqForm.salaryRange}
                          onChange={(e) => setEditReqForm({ ...editReqForm, salaryRange: e.target.value })}
                          placeholder="e.g. ₹25,000 - ₹35,000"
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Workers Needed</label>
                        <input
                          type="number"
                          min="1"
                          value={editReqForm.workersNeeded}
                          onChange={(e) => setEditReqForm({ ...editReqForm, workersNeeded: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Worksite Location / Street Address</label>
                        <input
                          type="text"
                          value={editReqForm.address}
                          onChange={(e) => setEditReqForm({ ...editReqForm, address: e.target.value })}
                          placeholder="e.g. Guindy Industrial Estate, Plot 14"
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">City / Region</label>
                        <input
                          type="text"
                          value={editReqForm.city}
                          onChange={(e) => setEditReqForm({ ...editReqForm, city: e.target.value })}
                          placeholder="e.g. Chennai"
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-[#0a0a0a] uppercase">Job Description & Scope</label>
                        <button
                          type="button"
                          onClick={() => setEditReqForm({ ...editReqForm, description: sanitizeHtmlDescription(editReqForm.description) })}
                          className="text-[10px] text-[#0f2f63] font-semibold hover:underline cursor-pointer"
                        >
                          Clean HTML
                        </button>
                      </div>
                      <textarea
                        rows={6}
                        value={editReqForm.description}
                        onChange={(e) => setEditReqForm({ ...editReqForm, description: e.target.value })}
                        placeholder="Enter clean job description, duties, and hiring requirements..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e4e9] text-xs leading-relaxed focus:outline-none focus:border-[#0f2f63]"
                      />
                    </div>

                    {/* Workplace Perks */}
                    <div className="pt-3 border-t border-[#e6e8ec] space-y-2">
                      <label className="text-[11px] font-bold text-[#0f2f63] uppercase tracking-wider block">
                        Workplace Perks & Benefits Provided
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'Free Food', label: '🍛 Free Food / Meals' },
                          { id: 'Room Provided', label: '🏠 Room / Lodging' },
                          { id: 'Daily Pay', label: '💵 Daily / Weekly Payout' },
                          { id: 'Overtime Pay', label: '⏱️ Overtime (OT) Pay' },
                          { id: 'Travel Allowance', label: '⛽ Fuel / Travel Allowance' },
                          { id: 'ESI PF Benefits', label: '🛡️ ESI / PF Benefits' },
                        ].map(perk => {
                          const isSelected = editReqForm.perks.includes(perk.id);
                          return (
                            <button
                              key={perk.id}
                              type="button"
                              onClick={() => {
                                setEditReqForm(prev => ({
                                  ...prev,
                                  perks: prev.perks.includes(perk.id)
                                    ? prev.perks.filter(p => p !== perk.id)
                                    : [...prev.perks, perk.id]
                                }));
                              }}
                              className={`p-2.5 rounded-xl border text-[11px] font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#0f2f63] text-white border-[#0f2f63]'
                                  : 'bg-white text-[#0a0a0a] border-[#e6e8ec] hover:border-[#0f2f63]/40'
                              }`}
                            >
                              <span>{perk.label}</span>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Contact Channels */}
                    <div className="pt-3 border-t border-[#e6e8ec] space-y-3">
                      <span className="text-[11px] font-bold text-[#0f2f63] uppercase tracking-wider block">Candidate Direct Contact</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 rounded-xl border border-[#e6e8ec] bg-white">
                          <div>
                            <p className="text-xs font-bold text-[#0a0a0a]">Direct Phone Call</p>
                            <p className="text-[10px] text-[#717784]">Enables Call HR button</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={editReqForm.allowDirectCall}
                            onChange={(e) => setEditReqForm({ ...editReqForm, allowDirectCall: e.target.checked })}
                            className="w-4 h-4 accent-[#0f2f63] cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-[#e6e8ec] bg-white">
                          <div>
                            <p className="text-xs font-bold text-[#0a0a0a]">WhatsApp Chat</p>
                            <p className="text-[10px] text-[#717784]">Enables WhatsApp button</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={editReqForm.allowDirectWhatsapp}
                            onChange={(e) => setEditReqForm({ ...editReqForm, allowDirectWhatsapp: e.target.checked })}
                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Recruiter Phone Number</label>
                        <input
                          type="tel"
                          value={editReqForm.contactPhone}
                          onChange={(e) => setEditReqForm({ ...editReqForm, contactPhone: e.target.value })}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                        />
                      </div>
                    </div>

                    {/* Walk-in Interview Details */}
                    <div className="pt-3 border-t border-[#e6e8ec] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#0f2f63] uppercase tracking-wider">Walk-in Interview FastTrack</span>
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editReqForm.isWalkInInterview}
                            onChange={(e) => setEditReqForm({ ...editReqForm, isWalkInInterview: e.target.checked })}
                            className="w-4 h-4 accent-amber-500 cursor-pointer"
                          />
                          <span>Is Walk-in Interview</span>
                        </label>
                      </div>

                      {editReqForm.isWalkInInterview && (
                        <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-[#0a0a0a] uppercase mb-1">Walk-in Dates</label>
                              <input
                                type="text"
                                value={editReqForm.walkInDates}
                                onChange={(e) => setEditReqForm({ ...editReqForm, walkInDates: e.target.value })}
                                placeholder="e.g. 06 Nov - 09 Nov (Mon to Fri)"
                                className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white focus:outline-none focus:border-[#0f2f63]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#0a0a0a] uppercase mb-1">Timing Slot</label>
                              <input
                                type="text"
                                value={editReqForm.walkInTiming}
                                onChange={(e) => setEditReqForm({ ...editReqForm, walkInTiming: e.target.value })}
                                placeholder="e.g. 10:00 AM - 04:00 PM"
                                className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white focus:outline-none focus:border-[#0f2f63]"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-[#0a0a0a] uppercase mb-1">Venue / Landmark</label>
                              <input
                                type="text"
                                value={editReqForm.walkInVenue}
                                onChange={(e) => setEditReqForm({ ...editReqForm, walkInVenue: e.target.value })}
                                placeholder="e.g. Near Metro Station, Opp. Police Station"
                                className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white focus:outline-none focus:border-[#0f2f63]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#0a0a0a] uppercase mb-1">Contact Person / HR</label>
                              <input
                                type="text"
                                value={editReqForm.walkInContactPerson}
                                onChange={(e) => setEditReqForm({ ...editReqForm, walkInContactPerson: e.target.value })}
                                placeholder="e.g. Mr. Ramesh (HR Manager)"
                                className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white focus:outline-none focus:border-[#0f2f63]"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Eligibility & Shift Criteria */}
                    <div className="pt-3 border-t border-[#e6e8ec] space-y-3">
                      <span className="text-[11px] font-bold text-[#0f2f63] uppercase tracking-wider block">Role & Eligibility Criteria</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Department</label>
                          <input
                            type="text"
                            placeholder="e.g. Restaurant / Hospitality"
                            value={editReqForm.department}
                            onChange={(e) => setEditReqForm({ ...editReqForm, department: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Role / Category</label>
                          <input
                            type="text"
                            placeholder="e.g. Cook / Chef / Kitchen Help"
                            value={editReqForm.roleCategory}
                            onChange={(e) => setEditReqForm({ ...editReqForm, roleCategory: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Employment Type</label>
                          <select
                            value={editReqForm.employmentType}
                            onChange={(e) => setEditReqForm({ ...editReqForm, employmentType: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63] bg-white"
                          >
                            <option value="">Not specified</option>
                            <option value="Full Time">Full Time</option>
                            <option value="Part Time">Part Time</option>
                            <option value="Contract">Contract</option>
                            <option value="Shift Based">Shift Based</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Shift</label>
                          <select
                            value={editReqForm.shift}
                            onChange={(e) => setEditReqForm({ ...editReqForm, shift: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63] bg-white"
                          >
                            <option value="">Not specified</option>
                            <option value="Day Shift">Day Shift</option>
                            <option value="Night Shift">Night Shift</option>
                            <option value="Rotational Shift">Rotational Shift</option>
                            <option value="Flexible Hours">Flexible Hours</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Experience</label>
                          <input
                            type="text"
                            placeholder="e.g. 1-2 Yrs"
                            value={editReqForm.experience}
                            onChange={(e) => setEditReqForm({ ...editReqForm, experience: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Education</label>
                          <select
                            value={editReqForm.education}
                            onChange={(e) => setEditReqForm({ ...editReqForm, education: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63] bg-white"
                          >
                            <option value="">Not specified</option>
                            <option value="Below 10th">Below 10th</option>
                            <option value="10th Pass">10th Pass</option>
                            <option value="12th Pass">12th Pass</option>
                            <option value="Diploma / ITI">Diploma / ITI</option>
                            <option value="Graduate">Graduate</option>
                            <option value="Any Education">Any Education</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Languages</label>
                          <input
                            type="text"
                            placeholder="e.g. English, Tamil, Hindi"
                            value={editReqForm.languages}
                            onChange={(e) => setEditReqForm({ ...editReqForm, languages: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#e6e8ec]">
                      <button
                        type="button"
                        onClick={() => setEditingReqId(null)}
                        className="px-4 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium cursor-pointer hover:bg-[#f4f5f8]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={updateReqMutation.isPending}
                        onClick={() => {
                          updateReqMutation.mutate({
                            reqId: req.id,
                            data: {
                              title: editReqForm.title,
                              description: editReqForm.description,
                              salaryRange: editReqForm.salaryRange,
                              workersNeeded: editReqForm.workersNeeded,
                              category: editReqForm.category,
                              city: editReqForm.city,
                              location: editReqForm.address,
                              coverImageUrl: editReqForm.coverImageUrl,
                              cover_image_url: editReqForm.coverImageUrl,
                              perks: editReqForm.perks,
                              allowDirectCall: editReqForm.allowDirectCall,
                              allowDirectWhatsapp: editReqForm.allowDirectWhatsapp,
                              contactPhone: editReqForm.contactPhone,
                              isUrgentSpotHire: editReqForm.isUrgentSpotHire,
                              isWalkInInterview: editReqForm.isWalkInInterview,
                              walkInDetails: editReqForm.isWalkInInterview ? {
                                isWalkIn: true,
                                dates: editReqForm.walkInDates,
                                timing: editReqForm.walkInTiming,
                                venue: editReqForm.walkInVenue,
                                contactPerson: editReqForm.walkInContactPerson,
                              } : null,
                              additionalDetails: {
                                coverImageUrl: editReqForm.coverImageUrl,
                                category: editReqForm.category,
                                address: editReqForm.address,
                                city: editReqForm.city,
                                department: editReqForm.department,
                                roleCategory: editReqForm.roleCategory,
                                employmentType: editReqForm.employmentType,
                                shift: editReqForm.shift,
                                experience: editReqForm.experience,
                                education: editReqForm.education,
                                languages: editReqForm.languages,
                                ageLimit: editReqForm.ageLimit,
                                gender: editReqForm.gender,
                                perks: editReqForm.perks,
                                allowDirectCall: editReqForm.allowDirectCall,
                                allowDirectWhatsapp: editReqForm.allowDirectWhatsapp,
                                contactPhone: editReqForm.contactPhone,
                                isUrgentSpotHire: editReqForm.isUrgentSpotHire,
                                isWalkInInterview: editReqForm.isWalkInInterview,
                                walkInDetails: editReqForm.isWalkInInterview ? {
                                  isWalkIn: true,
                                  dates: editReqForm.walkInDates,
                                  timing: editReqForm.walkInTiming,
                                  venue: editReqForm.walkInVenue,
                                  contactPerson: editReqForm.walkInContactPerson,
                                } : null,
                              }
                            }
                          });
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#0f2f63] hover:bg-[#163e7f] text-white text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Requirement</span>
                      </button>
                    </div>
                  </div>
                );
              }

              // Normal Card View
              return (
                <div key={req.id} className="bg-white p-5 rounded-2xl border border-[#e2e4e9] shadow-xs space-y-3 hover:border-[#0f2f63]/40 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0f2f63] border border-blue-200">
                          {resolveJobCategoryLabel(req.title, req.category || lead.industry)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {req.workers_needed || 1} Worker(s) Needed
                        </span>
                        {req.salary_range && (
                          <span className="text-xs font-bold text-emerald-700">
                            {req.salary_range}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#0a0a0a] leading-snug">{req.title}</h3>
                      {cleanDesc ? (
                        <p className="text-xs text-[#5a6270] mt-1.5 leading-relaxed line-clamp-3 whitespace-pre-line">
                          {cleanDesc}
                        </p>
                      ) : (
                        <p className="text-xs text-[#94a3b8] italic mt-1">No description text provided in posting</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start">
                      <button
                        type="button"
                        onClick={() => startEditing(req)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0f2f63]/5 hover:bg-[#0f2f63] text-[#0f2f63] hover:text-white rounded-xl text-xs font-bold border border-[#0f2f63]/20 transition-all cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Full Details</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#e2e4e9] text-xs text-[#717784]">
                    <div className="flex items-center gap-3">
                      <span>Source: <strong>{req.source_name || 'Portal'}</strong></span>
                      {req.city && <span>• Location: <strong>{req.city}</strong></span>}
                    </div>

                    {req.source_url && (
                      <a
                        href={formatLink(req.source_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#0f2f63] hover:underline font-semibold text-xs"
                      >
                        <Link2 className="w-3 h-3" />
                        <span>Open Original Posting</span>
                        <ExternalLink className="w-3 h-3 text-[#717784]" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (4 cols): Outreach Activity Logging Console */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-[#e2e4e9] shadow-xs space-y-3.5">
            <h3 className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#0f2f63]" />
              <span>Log Business Outreach Call</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!outreachForm.notes.trim()) {
                  toast.error('Outreach notes are required');
                  return;
                }
                outreachMutation.mutate(outreachForm);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Outreach Channel</label>
                <select
                  value={outreachForm.channel}
                  onChange={(e) => setOutreachForm({ ...outreachForm, channel: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs font-medium text-[#0a0a0a] outline-none focus:border-[#0f2f63]"
                >
                  <option value="PHONE">📞 Phone Call</option>
                  <option value="EMAIL">✉️ Email Outreach</option>
                  <option value="IN_PERSON">🏢 In Person Visit</option>
                  <option value="CONTACT_FORM">🌐 Web Contact Form</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Call Outcome</label>
                <select
                  value={outreachForm.outcome}
                  onChange={(e) => setOutreachForm({ ...outreachForm, outcome: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs font-medium text-[#0a0a0a] outline-none focus:border-[#0f2f63]"
                >
                  <option value="INTERESTED">⭐ Interested in TrustHyre</option>
                  <option value="FOLLOW_UP">⏳ Needs Follow-Up</option>
                  <option value="NOT_INTERESTED">❌ Not Interested</option>
                  <option value="NO_ANSWER">📵 No Answer / Busy</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Spoke With (Contact Person)</label>
                <input
                  type="text"
                  value={outreachForm.contactTarget}
                  onChange={(e) => setOutreachForm({ ...outreachForm, contactTarget: e.target.value })}
                  placeholder="e.g. Spoke with HR Manager / Owner"
                  className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] placeholder:text-[#94a3b8] outline-none focus:border-[#0f2f63]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Notes & Discussion Summary *</label>
                <textarea
                  rows={3}
                  required
                  value={outreachForm.notes}
                  onChange={(e) => setOutreachForm({ ...outreachForm, notes: e.target.value })}
                  placeholder="Summarize conversation, requirements discussed, next steps..."
                  className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] placeholder:text-[#94a3b8] outline-none focus:border-[#0f2f63]"
                />
              </div>

              <button
                type="submit"
                disabled={outreachMutation.isPending}
                className="w-full px-4 py-2.5 bg-[#0f2f63] hover:bg-[#163e7f] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {outreachMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Log Outreach Action</span>
              </button>
            </form>
          </div>

          {/* Past Call Logs Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-[#e2e4e9] shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider flex items-center justify-between">
              <span>Outreach Timeline</span>
              <span className="text-[10px] text-[#717784] font-semibold">{lead.outreach_logs?.length || 0} records</span>
            </h3>

            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {lead.outreach_logs && lead.outreach_logs.length > 0 ? (
                lead.outreach_logs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-[#f8fafc] border border-[#e2e4e9] rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0a0a0a]">{log.channel}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-[#0f2f63] border border-blue-200 rounded text-[9px] font-bold">
                        {log.outcome || 'COMPLETED'}
                      </span>
                    </div>
                    {log.contact_target && (
                      <p className="text-[11px] text-[#717784] font-medium">Contact: {log.contact_target}</p>
                    )}
                    <p className="text-[#5a6270] leading-snug">{log.notes}</p>
                    <span className="text-[10px] text-[#94a3b8] block pt-1">
                      {new Date(log.contacted_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#94a3b8] italic text-center py-4">No outreach logged yet for this hiring company.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

