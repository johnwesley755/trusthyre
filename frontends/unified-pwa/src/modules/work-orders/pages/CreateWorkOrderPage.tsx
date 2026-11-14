import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  IndianRupee, 
  FileText, 
  ShieldCheck, 
  Check, 
  X,
  AlertCircle,
  HelpCircle,
  Coffee, 
  Home, 
  Truck, 
  Send, 
  Eye, 
  ChevronLeft,
  Upload,
  File,
  CheckCircle2,
  Trash2,
  Loader2,
  Paperclip
} from 'lucide-react';
import { workOrderService, type CreateWorkOrderPayload } from '../../../services/workOrder.service';
import { jobService } from '../../../services/job.service';
import { workerService } from '../../../services/worker.service';
import { mediaService } from '../../../services/media.service';
import { SignatureCanvas } from '../../../components/common/SignatureCanvas';
import { toast } from 'sonner';

export default function CreateWorkOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const applicationId = searchParams.get('applicationId') || undefined;
  const workerId = searchParams.get('workerId') || '';
  const jobId = searchParams.get('jobId') || undefined;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Form State: strictly initialize from real job data without fabricated defaults
  const [jobTitle, setJobTitle] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [worksiteName, setWorksiteName] = useState('');
  const [worksiteAddress, setWorksiteAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  
  // Schedule & Timings
  const [startDate, setStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [shiftTiming, setShiftTiming] = useState('09:00 - 18:00');
  const [weeklyRestDay, setWeeklyRestDay] = useState('SUNDAY');
  const [dailyWorkingHours, setDailyWorkingHours] = useState<number | ''>(8);
  const [overtimeTerms, setOvertimeTerms] = useState('');

  // Compensation & Frequency
  const [wageAmount, setWageAmount] = useState<number | ''>('');
  const [wageFrequency, setWageFrequency] = useState<'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PROJECT'>('DAILY');

  // Amenities
  const [foodProvided, setFoodProvided] = useState(false);
  const [accommodationProvided, setAccommodationProvided] = useState(false);
  const [transportProvided, setTransportProvided] = useState(false);
  const [otherBenefits, setOtherBenefits] = useState('');
  const [agreedDeductions, setAgreedDeductions] = useState('');
  
  // Extended Terms & Attachments
  const [customTerms, setCustomTerms] = useState('');
  const [attachmentUrls, setAttachmentUrls] = useState<Array<{ name: string; url: string; size?: string }>>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [employerSignatureUrl, setEmployerSignatureUrl] = useState<string | null>(null);

  // Load Job details if provided
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobService.getJobById(jobId!),
    enabled: Boolean(jobId),
  });

  // Load Candidate profile if provided
  const { data: worker } = useQuery({
    queryKey: ['worker', workerId],
    queryFn: () => workerService.getProfileById(workerId),
    enabled: Boolean(workerId),
  });

  const candidateName = worker?.fullName || (worker as any)?.user?.name || 'Assigned Candidate';

  useEffect(() => {
    if (job) {
      setJobTitle(job.title || '');
      setWorkDescription(job.description || '');
      setWorksiteName(job.title ? `${job.title} Project Site` : 'Site Office');
      setWorksiteAddress(job.location || job.address || '');
      setCity(job.city || '');
      if (job.budget) {
        setWageAmount(job.budget);
      }
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      setStartDate(tomorrow);
    }
  }, [job]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds maximum size of 10MB.');
      return;
    }

    try {
      setIsUploadingFile(true);
      const res = await mediaService.uploadFile(file);
      if (res?.url) {
        setAttachmentUrls((prev) => [
          ...prev, 
          { 
            name: file.name, 
            url: res.url, 
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          }
        ]);
        toast.success(`Attached ${file.name}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload document');
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachmentUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (autoSend: boolean) => {
    if (!workerId) {
      toast.error("Candidate ID is required to issue a work order.");
      return;
    }
    if (!jobTitle.trim()) {
      toast.error("Please enter a valid job/assignment title.");
      return;
    }
    if (!worksiteName.trim() || !worksiteAddress.trim() || !city.trim()) {
      toast.error("Worksite name, address, and city are mandatory fields.");
      return;
    }
    if (!startDate) {
      toast.error("Please select a start date.");
      return;
    }
    if (!wageAmount || Number(wageAmount) <= 0) {
      toast.error("Please specify a valid agreed wage amount.");
      return;
    }
    if (!dailyWorkingHours || Number(dailyWorkingHours) <= 0) {
      toast.error("Please specify daily working hours.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateWorkOrderPayload = {
        jobId,
        applicationId,
        workerId,
        jobTitle: jobTitle.trim(),
        workDescription: workDescription.trim() || undefined,
        worksiteName: worksiteName.trim(),
        worksiteAddress: worksiteAddress.trim(),
        city: city.trim(),
        district: district.trim() || undefined,
        startDate,
        expectedEndDate: expectedEndDate || undefined,
        shiftTiming: shiftTiming.trim(),
        weeklyRestDay,
        dailyWorkingHours: Number(dailyWorkingHours),
        overtimeTerms: overtimeTerms.trim() || undefined,
        wageAmount: Number(wageAmount),
        wageFrequency,
        foodProvided,
        accommodationProvided,
        transportProvided,
        otherBenefits: otherBenefits.trim() || undefined,
        agreedDeductions: agreedDeductions.trim() || undefined,
        customTermsAndConditions: customTerms.trim() || undefined,
        attachmentUrls: attachmentUrls.map((a) => a.url),
        employerSignatureUrl: employerSignatureUrl || undefined,
        autoSend
      };

      await workOrderService.createWorkOrder(payload);
      toast.success(autoSend ? 'Digital Work Order issued and sent to candidate!' : 'Draft Work Order saved successfully');
      
      queryClient.invalidateQueries({ queryKey: ['employerWorkOrders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      
      if (jobId) {
        navigate(`/jobs/${jobId}/applicants`);
      } else {
        navigate('/work-orders');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen p-3 sm:p-6 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-[#0a0a0a] dark:text-zinc-100">
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        
        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#717784] hover:text-[#0f2f63] dark:hover:text-sky-400 transition-colors cursor-pointer w-fit"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Candidates</span>
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-full border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isPreviewMode ? 'Edit' : 'Preview'}</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-full border border-[#0f2f63] dark:border-sky-500 text-[#0f2f63] dark:text-sky-400 hover:bg-[#0f2f63]/5 text-xs font-bold transition-all cursor-pointer text-center"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Issue & Send to Candidate</span>
            </button>
          </div>
        </div>

        {/* Hero Title Container */}
        <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-6 sm:p-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f2f63]/10 dark:bg-sky-500/10 text-[#0f2f63] dark:text-sky-400 text-xs font-bold">
            <FileText className="w-3.5 h-3.5" />
            <span>Digital Work Order Generator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Formalize Employment Agreement
          </h1>
          <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 max-w-2xl">
            Issuing a binding digital work order for <strong className="text-slate-900 dark:text-zinc-100">{candidateName}</strong>. Specify responsibilities, schedule, wage transparency, and legal terms with digital signature verification.
          </p>
        </div>

        {isPreviewMode ? (
          /* Live Document Preview Screen */
          <div className="bg-white dark:bg-[#121215] rounded-[2rem] p-6 sm:p-10 border border-[#e6e8ec] dark:border-zinc-800 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b pb-4 border-[#e6e8ec] dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">TrustHyre Digital Work Order</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{jobTitle || 'Untitled Position'}</h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-sky-950/40 text-[#0f2f63] dark:text-sky-300 border border-blue-200 dark:border-sky-800 text-xs font-bold">
                READY FOR ISSUANCE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 dark:text-zinc-500 font-semibold block uppercase text-[10px]">Candidate</span>
                <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm">{candidateName}</p>
                <p className="text-slate-500 dark:text-zinc-400">{city || 'Assigned Zone'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 dark:text-zinc-500 font-semibold block uppercase text-[10px]">Worksite Location</span>
                <p className="font-bold text-slate-900 dark:text-zinc-100">{worksiteName || 'Site Office'}</p>
                <p className="text-slate-500 dark:text-zinc-400">{worksiteAddress || 'Address on file'}</p>
              </div>
            </div>

            {/* Scope */}
            {workDescription && (
              <div className="space-y-2 border-t pt-4 border-[#e6e8ec] dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">Scope of Responsibilities</span>
                <p className="text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{workDescription}</p>
              </div>
            )}

            {/* Compensation & Schedule Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#f8f9fa] dark:bg-zinc-900/60 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 text-center">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Wage Rate</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">₹{Number(wageAmount || 0).toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-500 block">/{wageFrequency.toLowerCase()}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Start Date</span>
                <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">{startDate || 'TBD'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Shift Hours</span>
                <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">{shiftTiming}</span>
                <span className="text-[10px] text-slate-500 block">{dailyWorkingHours} hrs/day</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Rest Day</span>
                <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">{weeklyRestDay}</span>
              </div>
            </div>

            {/* Custom Terms & Conditions */}
            {customTerms && (
              <div className="space-y-2 border-t pt-4 border-[#e6e8ec] dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">Specific Contract Clauses & Milestones</span>
                <div className="p-4 bg-slate-50 dark:bg-zinc-900/80 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-mono">
                  {customTerms}
                </div>
              </div>
            )}

            {/* Attached Documents */}
            {attachmentUrls.length > 0 && (
              <div className="space-y-2 border-t pt-4 border-[#e6e8ec] dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">Attached Annexures & Documents</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachmentUrls.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/50 flex items-center gap-2 hover:border-[#0f2f63] dark:hover:border-sky-500 transition-colors"
                    >
                      <Paperclip className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate flex-1">{att.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="border-t pt-4 border-[#e6e8ec] dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-2">Authorized Signatures</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">Employer Authorized Signatory</span>
                  {employerSignatureUrl ? (
                    <img src={employerSignatureUrl} alt="Employer Signature" className="h-16 object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400 italic">Signature provided upon issuance</span>
                  )}
                </div>
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">Candidate Acceptance Signatory</span>
                  <span className="text-xs text-slate-400 italic">Counter-signed by {candidateName} upon receipt</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Form Entry Screen */
          <div className="space-y-6">
            
            {/* 1. Assignment & Worksite Details */}
            <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215] p-6 sm:p-8 space-y-5">
              <h3 className="text-sm font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                <span>1. Assignment Title & Location Specifics</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">
                    Trade Role / Job Title *
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Master Commercial Electrician"
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0f2f63]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">
                    Worksite / Facility Name *
                  </label>
                  <input
                    type="text"
                    value={worksiteName}
                    onChange={(e) => setWorksiteName(e.target.value)}
                    placeholder="e.g. Gateway Towers Tower B"
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#0f2f63]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">
                    City / Zone *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Chennai"
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#0f2f63]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">
                    Complete Physical Worksite Address *
                  </label>
                  <textarea
                    rows={2}
                    value={worksiteAddress}
                    onChange={(e) => setWorksiteAddress(e.target.value)}
                    placeholder="Provide exact landmark, gate number, and physical reporting address"
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#0f2f63]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">
                    Detailed Work Description & Trade Responsibilities
                  </label>
                  <textarea
                    rows={4}
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    placeholder="Outline day-to-day duties, deliverables, technical safety protocols, and operational expectations..."
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#0f2f63]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Schedule, Timings & Overtime */}
            <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215] p-6 sm:p-8 space-y-5">
              <h3 className="text-sm font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                <span>2. Schedule, Working Hours & Overtime Terms</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Reporting Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Expected End Date (Optional)</label>
                  <input
                    type="date"
                    value={expectedEndDate}
                    onChange={(e) => setExpectedEndDate(e.target.value)}
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Weekly Rest Day</label>
                  <select
                    value={weeklyRestDay}
                    onChange={(e) => setWeeklyRestDay(e.target.value)}
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100 font-semibold"
                  >
                    <option value="SUNDAY">Sunday</option>
                    <option value="MONDAY">Monday</option>
                    <option value="ROTATIONAL">Rotational / Shift Basis</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Daily Working Hours *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="16"
                    value={dailyWorkingHours}
                    onChange={(e) => setDailyWorkingHours(parseFloat(e.target.value) || '')}
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100 font-bold"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Shift Timing *</label>
                  <input
                    type="text"
                    value={shiftTiming}
                    onChange={(e) => setShiftTiming(e.target.value)}
                    placeholder="e.g. 09:00 AM - 06:00 PM (1 hr lunch)"
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">
                    Overtime Calculation & Policies
                  </label>
                  <textarea
                    rows={2}
                    value={overtimeTerms}
                    onChange={(e) => setOvertimeTerms(e.target.value)}
                    placeholder="Specify overtime rate (e.g. 1.5x or 2x hourly calculation), approval process, and maximum permissible extra hours..."
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* 3. Wage & Welfare Provisions */}
            <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215] p-6 sm:p-8 space-y-5">
              <h3 className="text-sm font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                <span>3. Compensation & Welfare Provisions</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Agreed Wage Amount (₹) *</label>
                  <input
                    type="number"
                    min="100"
                    value={wageAmount}
                    onChange={(e) => setWageAmount(parseFloat(e.target.value) || '')}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-emerald-700 dark:text-emerald-400 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Payout Frequency *</label>
                  <select
                    value={wageFrequency}
                    onChange={(e) => setWageFrequency(e.target.value as any)}
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100 font-bold"
                  >
                    <option value="DAILY">Daily (Instant Check-out)</option>
                    <option value="WEEKLY">Weekly Payout</option>
                    <option value="MONTHLY">Monthly Salary</option>
                    <option value="HOURLY">Hourly Metered</option>
                    <option value="PROJECT">Milestone / Deliverable Based</option>
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-2 pt-2">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200 block">Employer-Provided Welfare</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 p-3.5 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#fbfbfb] dark:bg-[#1C1C21] cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={foodProvided}
                        onChange={(e) => setFoodProvided(e.target.checked)}
                        className="rounded border-[#e6e8ec] text-[#0f2f63] focus:ring-0"
                      />
                      <Coffee className="w-4 h-4 text-amber-600" />
                      <span>Food Provided</span>
                    </label>

                    <label className="flex items-center gap-2 p-3.5 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#fbfbfb] dark:bg-[#1C1C21] cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={accommodationProvided}
                        onChange={(e) => setAccommodationProvided(e.target.checked)}
                        className="rounded border-[#e6e8ec] text-[#0f2f63] focus:ring-0"
                      />
                      <Home className="w-4 h-4 text-indigo-600" />
                      <span>Accommodation</span>
                    </label>

                    <label className="flex items-center gap-2 p-3.5 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#fbfbfb] dark:bg-[#1C1C21] cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={transportProvided}
                        onChange={(e) => setTransportProvided(e.target.checked)}
                        className="rounded border-[#e6e8ec] text-[#0f2f63] focus:ring-0"
                      />
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>Free Transport</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Other Benefits, PPE & Gear</label>
                  <input
                    type="text"
                    value={otherBenefits}
                    onChange={(e) => setOtherBenefits(e.target.value)}
                    placeholder="e.g. Safety helmet, steel-toe boots, and health insurance coverage on site"
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Statutory Deductions (if any)</label>
                  <input
                    type="text"
                    value={agreedDeductions}
                    onChange={(e) => setAgreedDeductions(e.target.value)}
                    placeholder="e.g. Mandatory statutory PF/ESI or zero deduction direct payout"
                    className="w-full px-4 py-3 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* 4. Special Clauses, Milestones & Terms */}
            <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215] p-6 sm:p-8 space-y-4">
              <h3 className="text-sm font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                <span>4. Specific Contract Clauses & Milestones (Full Textarea)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Provide comprehensive contractual requirements, safety rules, non-disclosure terms, or milestone completion criteria.
              </p>
              <textarea
                rows={6}
                value={customTerms}
                onChange={(e) => setCustomTerms(e.target.value)}
                placeholder="Enter custom terms and conditions, performance milestones, confidentiality agreements, or termination notice rules..."
                className="w-full p-4 text-xs rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-100 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#0f2f63]"
              />
            </div>

            {/* 5. PDF & Image Document Attachments */}
            <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215] p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                    <span>5. Upload PDF & Image Attachments</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Attach signed legal annexures, site safety drawings, or detailed specification sheets (PDF, PNG, JPG).
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-[#0a0a0a] dark:text-zinc-100 rounded-full text-xs font-bold transition cursor-pointer">
                  {isUploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isUploadingFile ? 'Uploading...' : 'Attach Document'}</span>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={handleFileUpload}
                    disabled={isUploadingFile}
                    className="hidden"
                  />
                </label>
              </div>

              {attachmentUrls.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {attachmentUrls.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#fbfbfb] dark:bg-[#1C1C21] flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <File className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">{file.name}</p>
                          {file.size && <span className="text-[10px] text-slate-400 block">{file.size}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-[#e6e8ec] dark:border-zinc-800 rounded-2xl text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-zinc-400">No documents attached yet</p>
                  <p className="text-[11px] text-slate-400">PDFs and images uploaded here are accessible by the candidate.</p>
                </div>
              )}
            </div>

            {/* 6. Employer Digital Signature */}
            <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215] p-6 sm:p-8 space-y-4">
              <h3 className="text-sm font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                <span>6. Employer Authorized Digital Signature</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Sign in the box below to authorize and validate this digital work order. Your digital signature will be timestamped and sealed on the final agreement.
              </p>
              <SignatureCanvas
                label="Employer Authorized Signature"
                onSignatureChange={(sig) => setEmployerSignatureUrl(sig)}
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto px-5 py-3 rounded-full border border-[#e6e8ec] dark:border-zinc-700 text-xs font-semibold text-[#717784] hover:text-[#0a0a0a] dark:hover:text-white transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="w-full sm:w-auto px-5 py-3 rounded-full border border-[#0f2f63] dark:border-sky-500 text-[#0f2f63] dark:text-sky-400 hover:bg-[#0f2f63]/5 text-xs font-bold transition cursor-pointer text-center whitespace-nowrap"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold transition shadow-md active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Issue & Send to Candidate</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
