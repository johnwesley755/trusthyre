import React, { useState } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Mail, 
  GraduationCap, 
  Languages, 
  Briefcase, 
  Download, 
  Printer,
  Loader2,
  Award,
  Globe,
  Check
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { toast } from 'sonner';
import { CandidateResumePDFDocument } from './CandidateResumePDFDocument';
import { normalizeSkills } from '../../../../utils/skills';

export interface ResumeData {
  fullName: string;
  phoneNumber?: string;
  email?: string;
  profileImageUrl?: string;
  city?: string;
  area?: string;
  location?: string;
  bio?: string;
  highestEducation?: string;
  isPursuingEducation?: boolean;
  collegeName?: string;
  degree?: string;
  specialization?: string;
  schoolMedium?: string;
  englishProficiency?: string;
  languagesKnown?: string[];
  skills?: string[] | string;
  preferredRoles?: string[];
  preferredCities?: string[];
  willingToRelocate?: boolean;
  trustScore?: number;
  level?: string;
  isVerified?: boolean;
  experienceYears?: number;
  dob?: string;
  gender?: string;
  jobTitle?: string;
  matchScore?: number;
  matchBand?: string;
  matchingSkills?: string[];
  missingSkills?: string[];
  matchSummary?: string;
  matchBreakdown?: {
    skills: number;
    experience: number;
    location: number;
    verification: number;
  };
}

interface CandidateResumeViewProps {
  data: ResumeData;
  onPrint?: () => void;
  showActions?: boolean;
}

/**
 * Deduplicates and formats candidate location strings (e.g. avoids "Zone 14 Perungudi, Chennai, Chennai")
 */
export const formatLocation = (data: { area?: string; city?: string; location?: string }): string => {
  const parts: string[] = [];

  if (data.area) {
    data.area.split(',').forEach(p => {
      const clean = p.trim();
      if (clean) parts.push(clean);
    });
  }

  if (data.city) {
    const cleanCity = data.city.trim();
    if (cleanCity) parts.push(cleanCity);
  } else if (!parts.length && data.location) {
    data.location.split(',').forEach(p => {
      const clean = p.trim();
      if (clean) parts.push(clean);
    });
  }

  // Deduplicate case-insensitively while preserving original casing
  const uniqueParts: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueParts.push(part);
    }
  }

  return uniqueParts.join(', ') || 'India';
};

export const CandidateResumeView: React.FC<CandidateResumeViewProps> = ({
  data,
  onPrint,
  showActions = true
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [imageError, setImageError] = useState(false);

  const skillsList = normalizeSkills(data.skills);

  const getEnglishLabel = (prof?: string) => {
    switch (prof) {
      case 'ADVANCED':
      case 'FLUENT': return 'Fluent (Speak, Read & Write comfortably)';
      case 'INTERMEDIATE':
      case 'GOOD': return 'Good (Conversational & functional)';
      case 'BASIC': return 'Basic';
      case 'NONE': return 'No English';
      default: return prof || 'Basic English';
    }
  };

  const handleDownloadPdf = async () => {
    const toastId = toast.loading('Generating executive vector resume PDF...');

    try {
      setIsGeneratingPdf(true);

      // Generate native vector PDF using @react-pdf/renderer
      const blob = await pdf(<CandidateResumePDFDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const sanitizedName = (data.fullName || 'Candidate')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');

      link.download = `${sanitizedName}_Executive_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success('Resume downloaded successfully!');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.dismiss(toastId);
      toast.error('Could not generate vector PDF. Opening print preview...');
      setTimeout(() => {
        window.print();
      }, 400);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDirectPrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const hasPhoto = Boolean(data.profileImageUrl && !imageError);
  const locationString = formatLocation(data);
  const primaryHeadline = data.preferredRoles && data.preferredRoles.length > 0
    ? data.preferredRoles.join(' \u2022 ')
    : (skillsList[0] || 'Professional Candidate');

  return (
    <div className="w-full max-w-4xl mx-auto font-sans">
      {/* Action Header Bar (No-Print) */}
      {showActions && (
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs" style={{ backgroundColor: "#ffffff", color: "#0f172a" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Verified Candidate Resume</p>
              <p className="text-xs text-slate-500">Standard Executive ATS Format &bull; Clean Printable Document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDirectPrint}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300 shadow-xs"
              title="Print standard A4 copy"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Resume</span>
            </button>
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Candidate-Job Match Insight Card (No-Print) */}
      {data.matchScore !== undefined && (
        <div className="no-print mb-5 p-4 rounded-xl bg-white border border-slate-200 shadow-xs" style={{ backgroundColor: "#ffffff", color: "#0f172a" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                <span className="text-base font-extrabold leading-none">{data.matchScore}%</span>
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">Match</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {data.matchBand || 'Candidate Fit Analysis'}
                  </span>
                  {data.jobTitle && (
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <span>&bull;</span>
                      <span>for {data.jobTitle}</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  {data.matchSummary || `${data.matchScore}% qualification overlap with requirements.`}
                </p>
              </div>
            </div>

            {data.matchBreakdown && (
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 text-[10px] font-semibold text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div>Skills: <span className="text-emerald-700 font-bold">{data.matchBreakdown.skills}%</span></div>
                <div className="sm:border-l sm:border-slate-200 sm:pl-2">Exp: <span className="text-slate-800 font-bold">{data.matchBreakdown.experience}%</span></div>
                <div className="sm:border-l sm:border-slate-200 sm:pl-2">Location: <span className="text-slate-800 font-bold">{data.matchBreakdown.location}%</span></div>
                <div className="sm:border-l sm:border-slate-200 sm:pl-2">Trust: <span className="text-slate-800 font-bold">{data.matchBreakdown.verification}%</span></div>
              </div>
            )}
          </div>

          {((data.matchingSkills && data.matchingSkills.length > 0) || (data.missingSkills && data.missingSkills.length > 0)) && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mr-1">Skills:</span>
              {data.matchingSkills?.slice(0, 5).map((s, i) => (
                <span key={`ms-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[10px]">
                  <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                  <span>{s}</span>
                </span>
              ))}
              {data.missingSkills?.slice(0, 3).map((s, i) => (
                <span key={`mis-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[10px]">
                  <span className="text-slate-400 font-bold">&bull;</span>
                  <span>Needs {s}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Executive Resume Sheet (Standard ATS Layout) */}
      <div 
        id="printable-candidate-cv" 
        className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-12 text-[#111827] relative print:border-none print:shadow-none print:p-0" style={{ backgroundColor: "#ffffff", color: "#111827" }}
      >
        {/* RESUME HEADER */}
        <header className="flex flex-col sm:flex-row items-start justify-between gap-5 pb-5 border-b-2 border-[#111827]">
          <div className="flex-1 min-w-0">
            {/* Candidate Full Name */}
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#111827]">
              {data.fullName || 'Candidate Name'}
            </h1>

            {/* Target Role Headline */}
            <p className="text-xs sm:text-sm font-semibold text-[#374151] mt-1 tracking-normal">
              {primaryHeadline}
            </p>

            {/* Single Unified Contact Strip with Bullet Separators */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-[#4B5563] mt-2.5 font-medium">
              {data.phoneNumber && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span>+91 {data.phoneNumber.slice(-10)}</span>
                </div>
              )}

              {data.phoneNumber && (data.email || locationString) && (
                <span className="text-slate-300">&bull;</span>
              )}

              {data.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span>{data.email}</span>
                </div>
              )}

              {data.email && locationString && (
                <span className="text-slate-300">&bull;</span>
              )}

              {locationString && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span>{locationString}</span>
                </div>
              )}
            </div>

            {/* Verification Status */}
            <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-slate-800 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-800" />
                Verified Candidate Profile
              </span>
              <span className="text-slate-300">&bull;</span>
              <span>Available for Placement</span>
            </div>
          </div>

          {/* Optional Portrait Frame (Discreet, professional monochrome border) */}
          {hasPhoto && (
            <div className="shrink-0 self-center sm:self-start">
              <img 
                src={data.profileImageUrl} 
                alt={data.fullName}
                onError={() => setImageError(true)}
                className="w-20 h-20 rounded-md object-cover border border-slate-300 shadow-2xs bg-slate-50"
              />
            </div>
          )}
        </header>

        {/* RESUME BODY CONTENT */}
        <main className="space-y-6 pt-5">
          {/* 1. PROFESSIONAL SUMMARY */}
          {data.bio && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] border-b border-[#111827] pb-1 mb-2.5">
                Professional Summary
              </h2>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed font-normal">
                {data.bio}
              </p>
            </section>
          )}

          {/* 2. CORE COMPETENCIES & TECHNICAL SKILLS */}
          {skillsList.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] border-b border-[#111827] pb-1 mb-2.5 flex items-center justify-between">
                <span>Core Competencies & Technical Skills</span>
                <span className="text-[10px] font-normal text-slate-500 lowercase">({skillsList.length} verified competencies)</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 text-xs text-[#374151] font-medium">
                {skillsList.map((skill, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-900 font-bold leading-none mt-0.5">&bull;</span>
                    <span className="leading-tight">{skill}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. TARGET JOB ROLES & INDUSTRY SPECIALIZATIONS */}
          {data.preferredRoles && data.preferredRoles.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] border-b border-[#111827] pb-1 mb-2.5">
                Target Roles & Career Domains
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                {data.preferredRoles.map((role, idx) => (
                  <span 
                    key={idx}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded font-medium text-slate-800"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 4. WORK EXPERIENCE & PROFESSIONAL HISTORY */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] border-b border-[#111827] pb-1 mb-2.5">
              Work Experience & Practical Training
            </h2>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#111827]">
                    {data.preferredRoles?.[0] || skillsList[0] || 'Technical Specialist'}
                  </h3>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    {data.experienceYears && data.experienceYears > 0 
                      ? `${data.experienceYears}+ Years Practical Industry Experience`
                      : 'Entry-Level / Fresher \u2014 Trained & Prepared for Placement'}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 sm:text-right">
                  TrustHyre Verified Profile
                </span>
              </div>
              <p className="text-xs text-[#374151] leading-relaxed">
                Demonstrated practical competence in trade operations, safety protocols, and daily task fulfillment. Background details and identity verified through TrustHyre candidate network.
              </p>
            </div>
          </section>

          {/* 5. EDUCATION & ACADEMIC CREDENTIALS */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] border-b border-[#111827] pb-1 mb-2.5">
              Education & Academic Background
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs">
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-[#111827]">
                  {data.degree || data.highestEducation || 'Graduate / Diploma / Secondary Education'}
                  {data.isPursuingEducation && ' (Currently Pursuing)'}
                </p>
                {data.collegeName && (
                  <p className="text-xs text-[#4B5563]">
                    {data.collegeName} {data.specialization ? ` \u2022 ${data.specialization}` : ''}
                  </p>
                )}
                {data.schoolMedium && (
                  <p className="text-[11px] text-slate-500">
                    Medium of Instruction: <span className="font-semibold text-slate-700">{data.schoolMedium}</span>
                  </p>
                )}
              </div>
              <div className="text-[11px] font-semibold text-slate-600 sm:text-right">
                {data.isPursuingEducation ? 'In Progress' : 'Completed'}
              </div>
            </div>
          </section>

          {/* 6. LANGUAGES & COMMUNICATION */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] border-b border-[#111827] pb-1 mb-2.5">
              Languages & Communication
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#374151]">
              <div>
                <span className="font-semibold text-slate-900 block">English Language Proficiency</span>
                <span className="text-slate-600 mt-0.5 block">{getEnglishLabel(data.englishProficiency)}</span>
              </div>

              {data.languagesKnown && data.languagesKnown.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-900 block">Additional Languages Known</span>
                  <span className="text-slate-600 mt-0.5 block">{data.languagesKnown.join(', ')}</span>
                </div>
              )}
            </div>
          </section>

          {/* 7. MOBILITY & WORK AVAILABILITY */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] border-b border-[#111827] pb-1 mb-2.5">
              Work Availability & Mobility
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#374151]">
              <div>
                <span className="font-semibold text-slate-900 block">Base Location</span>
                <span className="text-slate-600 mt-0.5 block">{locationString}</span>
              </div>

              <div>
                <span className="font-semibold text-slate-900 block">Relocation Readiness</span>
                <span className="text-slate-600 mt-0.5 block">
                  {data.willingToRelocate ? 'Open to Relocation' : 'Local City Commute Only'}
                </span>
              </div>

              {data.preferredCities && data.preferredCities.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-900 block">Preferred Cities</span>
                  <span className="text-slate-600 mt-0.5 block">{data.preferredCities.join(', ')}</span>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* RESUME FOOTER */}
        <footer className="mt-10 pt-3 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>TrustHyre Candidate Network &bull; Candidate Identity & Record Verified</span>
          <span className="mt-1 sm:mt-0 font-semibold text-slate-600">trusthyre.com/candidate</span>
        </footer>
      </div>

      {/* Clean A4 Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }
          body * {
            visibility: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          #printable-candidate-cv, #printable-candidate-cv * {
            visibility: visible !important;
          }
          #printable-candidate-cv {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            z-index: 999999 !important;
          }
        }
      `}</style>
    </div>
  );
};
