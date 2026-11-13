import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';
import { BaseModal } from '../../../components/common/BaseModal';
import { workOrderService, type CreateWorkOrderPayload } from '../../../services/workOrder.service';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: {
    userId: string;
    fullName: string;
    skills?: string[];
    city?: string;
  };
  job?: {
    id?: string;
    title?: string;
    description?: string;
    location?: string;
    city?: string;
    budget?: number;
    payoutFrequency?: string;
  };
  applicationId?: string;
  onSuccess?: () => void;
}

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  isOpen,
  onClose,
  candidate,
  job,
  applicationId,
  onSuccess
}) => {
  const queryClient = useQueryClient();
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
  const [shiftTiming, setShiftTiming] = useState('');
  const [weeklyRestDay, setWeeklyRestDay] = useState('SUNDAY');
  const [dailyWorkingHours, setDailyWorkingHours] = useState<number | ''>('');
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

  const [isConfirmedAcknowledged, setIsConfirmedAcknowledged] = useState(false);

  // Reset & re-populate state whenever selected candidate or job changes
  useEffect(() => {
    if (isOpen) {
      setJobTitle(job?.title || '');
      setWorkDescription(job?.description || '');
      setWorksiteName(job?.title ? `${job.title} Project Site` : '');
      setWorksiteAddress(job?.location || '');
      setCity(job?.city || candidate.city || '');
      setDistrict('');
      
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      setStartDate(tomorrow);
      setExpectedEndDate('');
      setShiftTiming('09:00 - 18:00');
      setWeeklyRestDay('SUNDAY');
      setDailyWorkingHours(8);
      setOvertimeTerms('');

      setWageAmount(job?.budget ? Number(job.budget) : '');
      setWageFrequency((job?.payoutFrequency as any) || 'DAILY');

      setFoodProvided(false);
      setAccommodationProvided(false);
      setTransportProvided(false);
      setOtherBenefits('');
      setAgreedDeductions('');
      setIsPreviewMode(false);
      setIsConfirmedAcknowledged(false);
    }
  }, [isOpen, candidate.userId, job?.id, job?.title, job?.description, job?.location, job?.budget, job?.payoutFrequency]);

  const handleSubmit = async (autoSend: boolean) => {
    if (!jobTitle.trim()) {
      toast.error('Job title is required');
      return;
    }
    if (!worksiteName.trim() || !worksiteAddress.trim() || !city.trim()) {
      toast.error('Worksite name, address, and city are mandatory');
      return;
    }
    if (!startDate) {
      toast.error('Start date is required');
      return;
    }
    if (!wageAmount || Number(wageAmount) <= 0) {
      toast.error('Agreed wage amount must be greater than zero');
      return;
    }
    if (!dailyWorkingHours || Number(dailyWorkingHours) <= 0) {
      toast.error('Daily working hours must be greater than zero');
      return;
    }

    if (autoSend && !isPreviewMode) {
      setIsPreviewMode(true);
      toast.info('Please review the work order terms and acknowledge before sending.');
      return;
    }

    if (autoSend && !isConfirmedAcknowledged) {
      toast.error('Please check the confirmation box acknowledging these terms are agreed.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateWorkOrderPayload = {
        jobId: job?.id,
        applicationId,
        workerId: candidate.userId,
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
        autoSend
      };

      await workOrderService.createWorkOrder(payload);
      toast.success(autoSend ? 'Digital Work Order issued and sent to candidate!' : 'Draft Work Order saved successfully');
      
      queryClient.invalidateQueries({ queryKey: ['employerWorkOrders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Digital Work Order"
      subtitle={`Formalizing agreed conditions for ${candidate.fullName}`}
      icon={<FileText className="w-5 h-5 text-[#0f2f63] dark:text-sky-400" />}
      iconBgColor="bg-[#0f2f63]/10 dark:bg-sky-500/10 text-[#0f2f63]"
      maxWidth="2xl"
      bodyClassName="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto font-['Onest',system-ui,sans-serif]"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full border border-[#e6e8ec] dark:border-zinc-700 text-xs font-semibold text-[#717784] hover:text-[#0a0a0a] dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="px-4 py-2.5 rounded-full border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isPreviewMode ? 'Edit Terms' : 'Review Terms'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2.5 rounded-full border border-[#0f2f63] dark:border-sky-500 text-[#0f2f63] dark:text-sky-400 hover:bg-[#0f2f63]/5 text-xs font-bold transition-all cursor-pointer"
            >
              Save Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Issue & Send to Candidate</span>
            </button>
          </div>
        </div>
      }
    >
      {isPreviewMode ? (
        /* Final Terms Review Screen */
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs">
          <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-zinc-800">
            <span className="font-bold text-slate-900 dark:text-white text-sm">{jobTitle || 'Untitled Position'}</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
              ₹{Number(wageAmount || 0).toLocaleString('en-IN')} / {wageFrequency.toLowerCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-zinc-300">
            <div><strong>Candidate:</strong> {candidate.fullName}</div>
            <div><strong>Location:</strong> {worksiteName}, {city}</div>
            <div><strong>Address:</strong> {worksiteAddress}</div>
            <div><strong>Timings:</strong> {shiftTiming} ({dailyWorkingHours} hrs/day)</div>
            <div><strong>Start Date:</strong> {startDate}</div>
            <div><strong>Weekly Rest Day:</strong> {weeklyRestDay}</div>
            <div><strong>Overtime:</strong> {overtimeTerms || 'Not specified / statutory standard'}</div>
            <div><strong>Amenities:</strong> {[foodProvided && 'Food', accommodationProvided && 'Accommodation', transportProvided && 'Transport'].filter(Boolean).join(', ') || 'None provided'}</div>
            {otherBenefits && <div className="col-span-2"><strong>Benefits:</strong> {otherBenefits}</div>}
            {agreedDeductions && <div className="col-span-2"><strong>Deductions:</strong> {agreedDeductions}</div>}
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-900 dark:text-amber-300 text-[11px] space-y-2">
            <div>Please review and confirm that these employment terms accurately reflect what was negotiated before issuing the work order.</div>
            <label className="flex items-center gap-2 font-bold cursor-pointer pt-1 text-slate-900 dark:text-white">
              <input
                type="checkbox"
                checked={isConfirmedAcknowledged}
                onChange={(e) => setIsConfirmedAcknowledged(e.target.checked)}
                className="rounded border-slate-300 text-[#0f2f63] focus:ring-0"
              />
              <span>I have reviewed these terms and confirm they represent our agreed employment conditions.</span>
            </label>
          </div>
        </div>
      ) : (
        /* Edit Form */
        <div className="space-y-6">
          {/* 1. Work Details Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
              <span>1. Work Details & Location</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Job Title *</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100 focus:ring-2 focus:ring-[#0f2f63]/20"
                  placeholder="e.g. Senior Commercial Mason"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Worksite Facility / Name *</label>
                <input
                  type="text"
                  value={worksiteName}
                  onChange={(e) => setWorksiteName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
                  placeholder="e.g. Metro Line IV Phase B Works"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Full Physical Address *</label>
                <input
                  type="text"
                  value={worksiteAddress}
                  onChange={(e) => setWorksiteAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
                  placeholder="Plot No, Landmark, Road, Pin Code"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">City / Town *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
                  placeholder="Chennai"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">District / Taluk</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
                  placeholder="Kanchipuram / Tambaram"
                />
              </div>
            </div>
          </div>

          {/* 2. Schedule & Working Hours */}
          <div className="space-y-4 pt-4 border-t border-[#e6e8ec] dark:border-zinc-800">
            <h4 className="text-xs font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
              <span>2. Schedule & Working Hours</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Expected End Date</label>
                <input
                  type="date"
                  value={expectedEndDate}
                  onChange={(e) => setExpectedEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Shift Timing *</label>
                <input
                  type="text"
                  value={shiftTiming}
                  onChange={(e) => setShiftTiming(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
                  placeholder="09:00 - 18:00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Daily Working Hours *</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="16"
                  value={dailyWorkingHours}
                  onChange={(e) => setDailyWorkingHours(parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Weekly Rest Day</label>
                <select
                  value={weeklyRestDay}
                  onChange={(e) => setWeeklyRestDay(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
                >
                  <option value="SUNDAY">Sunday</option>
                  <option value="MONDAY">Monday</option>
                  <option value="ROTATIONAL">Rotational / Shift Basis</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Overtime Terms & Rules</label>
                <input
                  type="text"
                  value={overtimeTerms}
                  onChange={(e) => setOvertimeTerms(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
                  placeholder="e.g. 1.5x regular wage rate for work beyond daily working hours"
                />
              </div>
            </div>
          </div>

          {/* 3. Wage & Amenities */}
          <div className="space-y-4 pt-4 border-t border-[#e6e8ec] dark:border-zinc-800">
            <h4 className="text-xs font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
              <span>3. Compensation & Welfare Provisions</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Agreed Wage Amount (₹) *</label>
                <input
                  type="number"
                  min="100"
                  value={wageAmount}
                  onChange={(e) => setWageAmount(parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Payout Frequency *</label>
                <select
                  value={wageFrequency}
                  onChange={(e) => setWageFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100 font-bold"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="HOURLY">Hourly</option>
                  <option value="PROJECT">Project / Milestone</option>
                </select>
              </div>
            </div>

            {/* Amenity Checkboxes */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200 block">Employer Provided Amenities</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#121215] cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={foodProvided}
                    onChange={(e) => setFoodProvided(e.target.checked)}
                    className="rounded border-[#e6e8ec] text-[#0f2f63] focus:ring-0"
                  />
                  <Coffee className="w-3.5 h-3.5 text-amber-600" />
                  <span>Food Provided</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#121215] cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={accommodationProvided}
                    onChange={(e) => setAccommodationProvided(e.target.checked)}
                    className="rounded border-[#e6e8ec] text-[#0f2f63] focus:ring-0"
                  />
                  <Home className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Accommodation</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#121215] cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={transportProvided}
                    onChange={(e) => setTransportProvided(e.target.checked)}
                    className="rounded border-[#e6e8ec] text-[#0f2f63] focus:ring-0"
                  />
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Free Transport</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Other Benefits & Gear</label>
              <input
                type="text"
                value={otherBenefits}
                onChange={(e) => setOtherBenefits(e.target.value)}
                placeholder="e.g. Safety shoes, gloves, and helmet provided on site"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Agreed Statutory Deductions (if any)</label>
              <input
                type="text"
                value={agreedDeductions}
                onChange={(e) => setAgreedDeductions(e.target.value)}
                placeholder="e.g. Legally permitted statutory contributions only"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
              />
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
};
