import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../../../api/apiClient";
import { useAuth } from "../../../providers/AuthContext";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  LocateFixed, 
  Loader2, 
  LogOut,
  CheckCircle2,
  AlertCircle,
  HardHat,
  Wrench,
  Truck,
  ChefHat,
  Hotel,
  Home,
  Store,
  Shield,
  Factory,
  Scissors,
  Stethoscope
} from "lucide-react";
import { OnboardingVisualHero } from "../components/OnboardingVisualHero";

const INDUSTRY_OPTIONS = [
  { id: 'CONSTRUCTION', label: 'Construction & Civil', icon: HardHat },
  { id: 'MAINTENANCE', label: 'Maintenance & Facility', icon: Wrench },
  { id: 'LOGISTICS', label: 'Logistics & Warehousing', icon: Truck },
  { id: 'COOKING_CHEF', label: 'Commercial Kitchens', icon: ChefHat },
  { id: 'HOSPITALITY', label: 'Hospitality & Dining', icon: Hotel },
  { id: 'DOMESTIC_HELP', label: 'Domestic & Facility Help', icon: Home },
  { id: 'RETAIL', label: 'Retail & Showrooms', icon: Store },
  { id: 'SECURITY', label: 'Physical Security', icon: Shield },
  { id: 'MANUFACTURING', label: 'Manufacturing & Plants', icon: Factory },
  { id: 'GARMENT', label: 'Garment & Apparel', icon: Scissors },
  { id: 'HEALTHCARE', label: 'Healthcare & Support', icon: Stethoscope }
];

const STEP_TITLES: Record<number, string> = {
  1: "Company Details",
  2: "Workforce Domain & Bio",
  3: "Base Location & Verification"
};

export default function EmployerOnboardingPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: user?.companyName || "",
    businessPhone: user?.phoneNumber?.replace(/\D/g, '').slice(-10) || "",
    industry: "",
    companyWebsite: "",
    profileBio: "",
    businessAddress: "",
    city: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const nextStep = () => {
    setErrorMessage("");
    if (step === 1) {
      if (!formData.companyName.trim()) {
        setErrorMessage("Please enter your company or business name.");
        return;
      }
      const clean = formData.businessPhone.replace(/\D/g, '');
      if (clean.length !== 10) {
        setErrorMessage("Please enter a valid 10-digit business phone number.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.industry) {
        setErrorMessage("Please select your primary industry sector.");
        return;
      }
      setStep(3);
    }
  };

  const prevStep = () => {
    setErrorMessage("");
    if (step > 1) setStep(s => s - 1);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          businessAddress: "Detecting address..."
        }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await response.json();
          
          const address = data.display_name || "Detected Location";
          const detectedCity = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || "Chennai";
          
          setFormData(prev => ({
            ...prev,
            businessAddress: address,
            city: detectedCity
          }));
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setFormData(prev => ({
            ...prev,
            businessAddress: "Manual location set",
            city: prev.city || "Chennai"
          }));
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        setErrorMessage("Location access was denied. Please type your city and address manually.");
        console.error(err);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    if (!formData.city && !formData.businessAddress) {
      setErrorMessage("Please provide your office city or base location.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.put('/api/employer/profile', {
        companyName: formData.companyName.trim(),
        industry: formData.industry,
        companyWebsite: formData.companyWebsite.trim(),
        profileBio: formData.profileBio.trim() || `${formData.companyName} operating in ${formData.industry}.`,
        businessTier: "VERIFIED",
        is_verified: true,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.businessAddress,
        city: formData.city || "Chennai"
      });

      const syncRes = await apiClient.post('/api/auth/sync', { 
        role: "EMPLOYER", 
        onboarded: true,
        phone_number: formData.businessPhone || undefined
      });
      const syncedUser = syncRes.data?.data || syncRes.data;
      
      localStorage.setItem('onboarded', 'true');
      updateUser({
        ...user,
        ...syncedUser,
        role: "EMPLOYER",
        onboarded: true,
        phoneNumber: formData.businessPhone || user?.phoneNumber,
        companyName: formData.companyName || user?.companyName,
      });

      navigate("/find-workers", { replace: true });
    } catch (error: any) {
      console.error("Onboarding failure:", error);
      const msg = error.response?.data?.message || "Verification sync failed. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = Math.round((step / 3) * 100);

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] selection:bg-[#2563c9] selection:text-white flex flex-col">
      
      {/* Framed Full-Screen Canvas matching Landing & Auth Architecture */}
      <div className="relative w-full flex-1 min-h-[calc(100svh-1rem)] sm:min-h-[calc(100svh-1.5rem)] lg:h-[calc(100svh-1.5rem)] rounded-2xl sm:rounded-[2rem] overflow-hidden border border-[#e6e8ec] bg-white shadow-xl grid grid-cols-1 lg:grid-cols-12 transition-all">
        
        {/* Left Side: Full-Bleed Brand Visual Hero with Sector Photography */}
        <div className="lg:col-span-5 xl:col-span-5 hidden lg:block h-full">
          <OnboardingVisualHero 
            role="EMPLOYER" 
            currentStep={step} 
            totalSteps={3} 
          />
        </div>

        {/* Right Side: Clean Modern Form with Independent Smooth Scroll */}
        <div className="lg:col-span-7 xl:col-span-7 p-4 sm:p-8 lg:p-10 flex flex-col justify-between relative bg-white h-full overflow-y-auto">
          
          {/* Mobile Banner with Sector Photography & Logo (Visible only on < lg screens) */}
          <div className="block lg:hidden mb-4">
            <OnboardingVisualHero 
              role="EMPLOYER" 
              currentStep={step} 
              totalSteps={3} 
              isMobileBanner={true} 
            />
          </div>

          {/* Top Navigation Row: Step Counter + Back Button + Sign Out */}
          <div className="shrink-0">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#717784] hover:text-[#0A1931] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                )}
                <div>
                  <h1 className="text-sm font-bold text-[#0A1931] leading-tight">
                    {STEP_TITLES[step]}
                  </h1>
                  <p className="text-[11px] text-[#717784] font-medium hidden sm:block">
                    Step {step} of 3 • Enterprise Onboarding & Verification
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#0f2f63]">
                  Step {step} of 3
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#717784] hover:text-[#0A1931] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            </div>

            {/* Sleek Minimal Progress Bar */}
            <div className="w-full bg-[#f4f4f4] h-1.5 rounded-full overflow-hidden mb-6">
              <div 
                className="bg-[#0f2f63] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* FORM BODY BY STEP */}
          <div className="flex-1 flex flex-col justify-center py-2">
            
            {/* Step 1: Company Name, Phone, Website */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1931]">
                    Company / Business Name *
                  </label>
                  <div className="relative">
                    <input 
                      className="w-full bg-white border border-[#e6e8ec] hover:border-[#0f2f63]/50 focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-3 text-sm text-[#0A1931] outline-none transition-all placeholder:text-slate-400 font-medium" 
                      placeholder="e.g. Reliance Logistics / Apex Engineering" 
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      required
                    />
                    <Building2 className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1931]">
                      Business Phone Number *
                    </label>
                    <span className="text-[10px] text-[#717784] font-medium">10-Digit Mobile</span>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center gap-1.5 text-slate-700 font-bold text-xs pointer-events-none select-none border-r border-slate-200 pr-2.5 z-10">
                      <span className="text-[10px] tracking-wider uppercase font-bold text-neutral-500">IN</span>
                      <span>+91</span>
                    </div>
                    <input 
                      className="w-full bg-white border border-[#e6e8ec] hover:border-[#0f2f63]/50 focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl pl-18 pr-4 py-3 text-sm text-[#0A1931] outline-none transition-all placeholder:text-slate-400 font-medium" 
                      placeholder="98765 43210" 
                      type="tel"
                      maxLength={10}
                      value={formData.businessPhone}
                      onChange={(e) => setFormData({...formData, businessPhone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1931]">
                      Company Website
                    </label>
                    <span className="text-[10px] font-semibold text-[#717784] uppercase">Optional</span>
                  </div>
                  <div className="relative">
                    <input 
                      className="w-full bg-white border border-[#e6e8ec] hover:border-[#0f2f63]/50 focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-3 text-sm text-[#0A1931] outline-none transition-all placeholder:text-slate-400 font-medium" 
                      placeholder="https://yourcompany.com" 
                      type="url"
                      value={formData.companyWebsite}
                      onChange={(e) => setFormData({...formData, companyWebsite: e.target.value})}
                    />
                    <Globe className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Industry Sector & Mission */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1931]">
                    Select Primary Industry Sector *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
                    {INDUSTRY_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const isSelected = formData.industry === opt.id;
                      return (
                        <button 
                          key={opt.id}
                          type="button"
                          onClick={() => setFormData({...formData, industry: opt.id})}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63] ${
                            isSelected 
                              ? 'bg-[#0f2f63] text-white border-[#0f2f63] shadow-xs' 
                              : 'bg-white border-[#e6e8ec] text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-500'}`} />
                          <span className="text-xs font-medium truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#e6e8ec]">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1931]">
                      Company Overview & Hiring Requirements
                    </label>
                    <span className="text-[10px] text-[#717784] font-medium">
                      {formData.profileBio.length} / 500
                    </span>
                  </div>
                  <textarea 
                    className="w-full bg-white border border-[#e6e8ec] hover:border-[#0f2f63]/50 focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl p-3.5 text-xs text-[#0A1931] placeholder:text-slate-400 outline-none transition-all resize-none font-medium h-28" 
                    placeholder="Tell candidates about your operations, typical shifts, and hiring expectations..."
                    value={formData.profileBio}
                    onChange={(e) => setFormData({...formData, profileBio: e.target.value.slice(0, 500)})}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Location Details */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#fbfbfb] border border-[#e6e8ec] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0A1931]">Operating Base / City</span>
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={isLocating}
                      className="text-xs font-bold text-[#0f2f63] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                      <span>{isLocating ? "Detecting..." : "Auto-Detect"}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <input 
                      type="text"
                      placeholder="City (e.g. Chennai / Bengaluru)"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none"
                    />

                    <input 
                      type="text"
                      placeholder="Detailed Office / Facility Address"
                      value={formData.businessAddress}
                      onChange={(e) => setFormData({...formData, businessAddress: e.target.value})}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Direct Candidate Access</p>
                    <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                      Your company profile will be verified on completion, enabling direct phone connections and photo attendance verification.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ANCHORED BOTTOM ACTION BAR */}
          <div className="pt-4 border-t border-[#e6e8ec] shrink-0 mt-4">
            <div className="flex items-center justify-between gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-3 bg-[#f4f4f4] hover:bg-slate-200/80 text-[#0A1931] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-[#0f2f63] hover:bg-[#0c244c] active:bg-[#081a38] text-white py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ml-auto"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.companyName}
                  className="bg-[#0f2f63] hover:bg-[#0c244c] active:bg-[#081a38] disabled:opacity-50 text-white py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ml-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Company...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Verification & Find Workers</span>
                      <Building2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
