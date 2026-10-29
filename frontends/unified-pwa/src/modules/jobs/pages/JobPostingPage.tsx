import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService } from '../../../services/job.service';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Briefcase, 
  Plus, 
  X, 
  ChevronRight, 
  Loader2, 
  CheckCircle, 
  Lightbulb, 
  IndianRupee, 
  CalendarClock, 
  ShieldCheck,
  Building2,
  MapPin,
  Sparkles,
  Check,
  ArrowRight,
  Eye,
  Send
} from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';
import { toast } from 'sonner';

export const JobPostingPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [skills, setSkills] = useState<string[]>(['Safety Protocol', 'Punctual']);
  const [skillInput, setSkillInput] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);

  // Live preview reactive states
  const [previewTitle, setPreviewTitle] = useState('Master Electrical Specialist');
  const [previewIndustry, setPreviewIndustry] = useState('ELECTRICAL');
  const [previewBudget, setPreviewBudget] = useState('28000');
  const [previewExp, setPreviewExp] = useState('2');
  const [previewExpiresAt, setPreviewExpiresAt] = useState('');

  const minExpiryDateTime = useMemo(() => {
    const now = new Date(Date.now() + 5 * 60 * 1000); // at least 5 minutes in future
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }, []);

  const mutation = useMutation({
    mutationFn: (job: any) => jobService.createJob(job),
    onSuccess: (newJob) => {
      if (newJob) {
        queryClient.setQueryData(['employerJobs'], (old: any) => {
          if (!old) return [newJob];
          return Array.isArray(old) ? [newJob, ...old] : old;
        });
        queryClient.setQueryData(['jobs'], (old: any) => {
          if (!old) return [newJob];
          return Array.isArray(old) ? [newJob, ...old] : old;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job published successfully! Candidates are being notified.');
      navigate('/jobs');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to post job. Please verify all fields.');
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const expiresAtRaw = formData.get('expiresAt') as string;
    let expiresAtIso: string | undefined = undefined;

    if (expiresAtRaw && expiresAtRaw.trim() !== '') {
      const parsedDate = new Date(expiresAtRaw);
      if (isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
        toast.error("Auto-expiry date and time must be set in the future.");
        return;
      }
      expiresAtIso = parsedDate.toISOString();
    }

    const jobData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      industry: formData.get('industry') as string,
      location: address,
      latitude: coords?.lat,
      longitude: coords?.lon,
      experienceYearsRequired: Number(formData.get('experienceYearsRequired') || 0),
      budget: Number(formData.get('budget')),
      address: address,
      city: city,
      requiredSkills: skills,
      status: 'OPEN' as const,
      expiresAt: expiresAtIso,
    };
    mutation.mutate(jobData);
  };

  const addSkill = () => {
    if (skillInput && !skills.includes(skillInput)) {
      setSkills([...skills, skillInput]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const QUICK_SKILL_SUGGESTIONS = [
    "Quality Inspection", "Safety Gear Certified", "Three Phase Wiring", 
    "Conduit Bending", "Tool Maintenance", "Blueprint Reading", "Rapid Assembly"
  ];

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <main className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* 1. Header Hero Card */}
        <div className="bg-[#f4f4f4] rounded-[2rem] p-6 sm:p-8 border border-[#e6e8ec]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] animate-pulse" />
                <span className="text-[10px] font-semibold uppercase text-[#0f2f63]">
                  Job & Shift Posting
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a]">
                Post a New Job Opening
              </h1>
              <p className="text-xs text-[#717784] font-medium leading-relaxed max-w-xl">
                Quickly find verified workers nearby with authenticated profiles and zero agency middle-men fees.
              </p>
            </div>

            <Link
              to="/jobs"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-[#e6e8ec] text-[#0a0a0a] text-xs font-semibold uppercase transition-all"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#717784]" />
              <span>Manage Existing Jobs</span>
            </Link>
          </div>
        </div>

        {/* 3. Main Form & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Form Column (8 cols) */}
          <div className="col-span-1 lg:col-span-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Step 1: Role Fundamentals */}
              <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] space-y-4">
                <div className="flex items-center gap-2 border-b border-[#e6e8ec] pb-3">
                  <div className="w-6 h-6 rounded-full bg-[#0f2f63] text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h3 className="text-xs font-bold uppercase text-[#717784]">
                    Role Fundamentals & Scope
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">Job Title *</label>
                    <input 
                      name="title"
                      required
                      defaultValue={previewTitle}
                      onChange={(e) => setPreviewTitle(e.target.value)}
                      placeholder="e.g. Master Industrial Electrician"
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">Industry Category *</label>
                    <select 
                      name="industry"
                      defaultValue={previewIndustry}
                      onChange={(e) => setPreviewIndustry(e.target.value)}
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all cursor-pointer"
                    >
                      <option value="ELECTRICAL">Electrical Work</option>
                      <option value="PLUMBING">Plumbing</option>
                      <option value="CONSTRUCTION">Construction & Masonry</option>
                      <option value="MAINTENANCE">Facility Maintenance & Repair</option>
                      <option value="LOGISTICS">Logistics & Warehouse</option>
                      <option value="COOKING_CHEF">Cooking / Commercial Chef</option>
                      <option value="HOSPITALITY">Hospitality & Hotel Staff</option>
                      <option value="DOMESTIC_HELP">Housekeeping / Cleaning</option>
                      <option value="SECURITY">Security Services</option>
                      <option value="MANUFACTURING">Manufacturing & Fabrication</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a]">Role Scope & Responsibilities *</label>
                  <textarea 
                    name="description"
                    required
                    placeholder="Describe daily tasks, working hours, tools provided, break times, and specific site regulations..."
                    rows={4}
                    className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Step 2: Worksite Location */}
              <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] space-y-4">
                <div className="flex items-center gap-2 border-b border-[#e6e8ec] pb-3">
                  <div className="w-6 h-6 rounded-full bg-[#0f2f63] text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <h3 className="text-xs font-bold uppercase text-[#717784]">
                    Worksite Location & GPS Geolocation
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">Street / Site Address *</label>
                    <input 
                      name="address"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Guindy Industrial Estate, Plot 14"
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">City / Region *</label>
                    <input 
                      name="city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Chennai"
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Location Picker Map Component */}
                <div className="bg-white p-3 rounded-2xl border border-[#e6e8ec] relative z-0 isolate">
                  <LocationPicker 
                    onLocationSelect={(lat, lon, addr, cty) => {
                      setCoords({ lat, lon });
                      setAddress(addr);
                      setCity(cty);
                    }} 
                  />
                </div>
              </div>

              {/* Step 3: Compensation & Required Experience */}
              <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] space-y-4">
                <div className="flex items-center gap-2 border-b border-[#e6e8ec] pb-3">
                  <div className="w-6 h-6 rounded-full bg-[#0f2f63] text-white flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <h3 className="text-xs font-bold uppercase text-[#717784]">
                    Compensation, Duration & Skill Requirements
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">Monthly Budget (₹) *</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717784]" />
                      <input 
                        name="budget"
                        type="number"
                        required
                        defaultValue={previewBudget}
                        onChange={(e) => setPreviewBudget(e.target.value)}
                        placeholder="28000"
                        className="w-full bg-white border border-[#e6e8ec] rounded-xl pl-9 pr-3 py-3 text-xs font-bold text-[#0a0a0a] tabular-nums focus:border-[#0f2f63] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">Min. Experience (Years)</label>
                    <input 
                      name="experienceYearsRequired"
                      type="text"
                      min={0}
                      defaultValue={previewExp}
                      onChange={(e) => setPreviewExp(e.target.value)}
                      placeholder="2"
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#0a0a0a]">Auto-Expiry Date & Time (Optional)</label>
                      {previewExpiresAt ? (
                        <button
                          type="button"
                          onClick={() => setPreviewExpiresAt('')}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline"
                        >
                          Remove Expiry
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#717784] font-medium">Optional</span>
                      )}
                    </div>
                    <input 
                      name="expiresAt"
                      type="datetime-local"
                      min={minExpiryDateTime}
                      value={previewExpiresAt}
                      onChange={(e) => setPreviewExpiresAt(e.target.value)}
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all cursor-pointer"
                    />
                    <p className="text-[10px] text-[#717784]">
                      Leave blank for open-ended hiring, or pick a date & time if you want this opening to automatically expire.
                    </p>
                  </div>
                </div>

                {/* Skill Tags */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-[#0a0a0a]">Technical Skill Tags</label>
                  <div className="flex gap-2">
                    <input 
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="Type a skill and press Enter (e.g. Conduit Bending, Three Phase)..."
                      className="flex-1 bg-white border border-[#e6e8ec] rounded-xl px-3.5 py-2.5 text-xs text-[#0a0a0a] focus:border-[#0f2f63] outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={addSkill} 
                      className="px-4 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active Skill Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skills.map(skill => (
                      <span 
                        key={skill} 
                        className="bg-white border border-[#e6e8ec] px-3 py-1 rounded-full text-xs font-semibold text-[#0a0a0a] flex items-center gap-1.5 shadow-2xs"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{skill}</span>
                        <X 
                          className="w-3.5 h-3.5 cursor-pointer text-[#717784] hover:text-rose-600 ml-0.5" 
                          onClick={() => removeSkill(skill)} 
                        />
                      </span>
                    ))}
                  </div>

                  {/* Quick Skill Suggestions */}
                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase text-[#717784] mb-1.5">Quick Suggestions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SKILL_SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => !skills.includes(s) && setSkills([...skills, s])}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-[#e6e8ec] text-[#717784] cursor-pointer"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button Action Row */}
              <div className="bg-[#fbfbfb] p-4 rounded-2xl border border-[#e6e8ec] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#717784]">
                  <p className="font-semibold text-[#0a0a0a]">Secure Protected Shift Posting</p>
                  <p className="text-[11px]">Funds are held securely and released upon candidate check-out confirmation.</p>
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full sm:w-auto px-8 py-3 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-medium text-xs uppercase shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {mutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Publish Role & Deploy Shift</span>
                </button>
              </div>

            </form>
          </div>

          {/* Right Column: Sticky Live Preview & Guarantees (4 cols) */}
          <div className="col-span-1 lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            
            {/* Live Mockup Card */}
            <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 border border-[#e6e8ec] space-y-4">
              {/* <div className="flex items-center justify-between border-b border-[#e6e8ec] pb-3">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#0f2f63]" />
                  <h3 className="text-xs font-bold uppercase text-[#717784]">
                    Live Candidate Feed Preview
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live Sync
                </span>
              </div> */}

              {/* Mockup Card */}
              <div className="bg-white rounded-2xl p-5 border border-[#e6e8ec] shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-[#0f2f63]/5 text-[#0f2f63] text-[9px] font-bold border border-[#0f2f63]/10">
                      {previewIndustry}
                    </span>
                    <h4 className="text-sm font-bold text-[#0a0a0a] mt-1 leading-snug">
                      {previewTitle || 'Job Title'}
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-xl tabular-nums">
                    ₹{Number(previewBudget || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="text-xs text-[#717784] space-y-1">
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0f2f63]" />
                    <span>{city || address || 'Designated worksite location'}</span>
                  </p>
                  <p className="text-[11px] text-[#717784]">
                    Min. {previewExp || 0} years experience required
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {skills.slice(0, 3).map(s => (
                    <span key={s} className="px-2 py-0.5 bg-[#f4f4f4] rounded-md text-[10px] font-medium text-[#0a0a0a]">
                      {s}
                    </span>
                  ))}
                  {skills.length > 3 && (
                    <span className="px-2 py-0.5 bg-[#f4f4f4] rounded-md text-[10px] font-medium text-[#717784]">
                      +{skills.length - 3} more
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-[#e6e8ec] flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Job Listing</span>
                  </span>
                  {previewExpiresAt && (
                    <span className="text-[#717784] text-[10px] flex items-center gap-1 font-medium">
                      <CalendarClock className="w-3 h-3 text-[#0f2f63]" />
                      <span>Closes {new Date(previewExpiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(previewExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Hiring Speed & Protection Note */}
            <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 border border-[#e6e8ec] space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-[#0a0a0a]">TrustHyre Hiring Advantages</h4>
              </div>

              <ul className="space-y-2.5 text-[#717784] leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Nearby verified candidates receive direct push notifications instantly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Average shift fulfillment turnaround of under 4 hours across major commercial zones.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Zero hidden recruiter commissions or subscription lock-ins.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};
