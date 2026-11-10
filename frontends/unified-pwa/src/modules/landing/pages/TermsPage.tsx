import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  FileText, 
  Scale, 
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  Printer, 
  ArrowLeft,
  Lock,
  Building2,
  Users,
  HelpCircle,
  Globe,
} from 'lucide-react';
import trustHyreLogo from '../../../assets/TrustHyre Skills and Opportunities Logo.png';
import { SeoHead } from '../../../components/common/SeoHead';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../../providers/TranslationContext';
import { AutoTranslate } from '../../../components/common/AutoTranslate';
import { Dropdown } from '../../../components/ui/dropdown';

export const TermsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('agreement');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage } = useTranslation();

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const sections = [
    { id: 'agreement', title: '1. Agreement & Acceptance', icon: Scale },
    { id: 'accounts', title: '2. User Accounts & Verification', icon: Users },
    { id: 'employers', title: '3. Employer Obligations', icon: Building2 },
    { id: 'workers', title: '4. Worker Rights & Commitments', icon: ShieldCheck },
    { id: 'engagements', title: '5. Platform Workflow & Direct Engagements', icon: Briefcase },
    { id: 'prohibited', title: '6. Prohibited Activities', icon: AlertCircle },
    { id: 'liability', title: '7. Limitation of Liability', icon: Lock },
    { id: 'governing', title: '8. Governing Law & Dispute Resolution', icon: Scale },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0A1931] font-sans antialiased selection:bg-[#0f2f63] selection:text-white flex flex-col justify-between">
      <SeoHead
        title="Terms of Service"
        description="Review TrustHyre's Terms of Service and operational guidelines for employers and verified skilled professionals."
        canonicalPath="/terms"
      />
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3 sm:gap-4">
          <Link to="/" className="flex items-center group py-1 shrink-0" aria-label="TrustHyre Home">
            <img 
              src={trustHyreLogo} 
              alt="TrustHyre" 
              className="h-9 sm:h-11 md:h-12 w-auto object-contain block select-none mix-blend-multiply group-hover:opacity-90 transition-opacity" 
            />
          </Link>

          {/* Quick Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-full border border-slate-200/80 text-xs font-semibold">
            <Link
              to="/terms"
              className="px-3 sm:px-3.5 py-1.5 rounded-full bg-[#0f2f63] text-white shadow-xs transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="px-3 sm:px-3.5 py-1.5 rounded-full text-slate-600 hover:text-[#0A1931] hover:bg-white/60 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector Dropdown */}
            <div className="relative">
              <Dropdown
                variant="outline"
                size="sm"
                fullWidth={false}
                icon={<Globe className="w-3.5 h-3.5 text-[#0066FF]" />}
                value={language}
                onChange={(val) => setLanguage(val as any)}
                options={SUPPORTED_LANGUAGES.map((l) => ({
                  value: l.code,
                  label: l.native,
                  sublabel: l.name,
                }))}
                triggerClassName="rounded-full px-3 py-1.5"
                menuClassName="w-44 right-0"
              />
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-[#0A1931] hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#0f2f63] py-1.5 px-3 rounded-full hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <AutoTranslate>
        <section className="bg-gradient-to-b from-white to-[#F8FAFC] border-b border-slate-200/80 py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0f2f63] text-xs font-bold uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                <span>Legal & Platform Agreement</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0A1931] tracking-tight">
                Terms of Service
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                These terms govern your access to and use of TrustHyre&apos;s workforce platform, direct hiring network, and verified skill profiles.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 pt-2">
                <span className="bg-white px-3 py-1 rounded-md border border-slate-200 shadow-2xs">
                  Effective: October 14, 2026
                </span>
                <span className="bg-white px-3 py-1 rounded-md border border-slate-200 shadow-2xs">
                  Version 2.4 (National & Enterprise)
                </span>
                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md border border-emerald-200 shadow-2xs inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Legally Compliant
                </span>
              </div>
            </div>
          </div>
        </section>
      </AutoTranslate>

      {/* Main Content Layout with Sticky Sidebar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        <AutoTranslate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left: Sticky Table of Contents (Desktop) */}
            <aside className="lg:col-span-4 sticky top-24 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">
                  Table of Contents
                </h2>
                <nav className="space-y-1">
                  {sections.map((sec) => {
                    const Icon = sec.icon;
                    const isActive = activeSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#0f2f63] text-white shadow-xs'
                            : 'text-slate-600 hover:text-[#0A1931] hover:bg-slate-100/80'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{sec.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Support Callout */}
              <div className="bg-blue-50/70 rounded-2xl border border-blue-100 p-5 space-y-3">
                <div className="flex items-center gap-2 text-[#0f2f63] font-bold text-xs uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4" />
                  <span>Need Clarification?</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Have questions regarding work agreements, hiring terms, or platform features?
                </p>
                <a
                  href="mailto:legal@trusthyre.com"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f2f63] hover:text-[#2563c9] underline underline-offset-2"
                >
                  Contact Legal Counsel &rarr;
                </a>
              </div>
            </aside>

            {/* Right: Detailed Terms Sections */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Quick Executive Summary Card */}
              <div className="bg-white rounded-2xl border-2 border-blue-100 p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-[#0f2f63] font-black text-sm">
                  <ShieldCheck className="w-5 h-5 text-[#0066FF]" />
                  <span>Executive Summary of User Commitments</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  TrustHyre connects skilled workers with verified employers. By using the platform, you agree to:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-slate-700 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Provide truthful personal or company credentials.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Abide by mutually agreed job terms and contracts.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Zero tolerance for workplace harassment or abusive conduct.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Resolve concerns through direct platform support.</span>
                  </li>
                </ul>
              </div>

              {/* Section 1 */}
              <section id="agreement" className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">1. Agreement & Acceptance</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  By creating an account, browsing job listings, searching worker profiles, or using any feature on TrustHyre (operated by TrustHyre Technologies Pvt. Ltd., &ldquo;TrustHyre&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree with these terms, you must not access or utilize the platform.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  These terms apply universally to individual candidates seeking employment (&ldquo;Workers&rdquo;), corporate recruiters, business managers, household employers (&ldquo;Employers&rdquo;), and general visitors.
                </p>
              </section>

              {/* Section 2 */}
              <section id="accounts" className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <Users className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">2. User Accounts & Verification</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  To access specialized capabilities including job application tracking, profile management, and direct hiring, you must register for an account. You agree to:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li>Provide accurate, current, and complete registration data during onboarding.</li>
                  <li>Maintain the strict confidentiality of your account credentials and one-time passcodes (OTP).</li>
                  <li>Promptly notify TrustHyre Support of any unauthorized security breach or compromise.</li>
                  <li>Submit authentic personal, business, or professional credentials when completing verification tier assessment.</li>
                </ul>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <strong>Profile Integrity:</strong> Accounts submitting fraudulent information, synthetic profiles, or impersonating other individuals will be immediately terminated.
                </div>
              </section>

              {/* Section 3 */}
              <section id="employers" className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">3. Employer Obligations & Fair Hiring</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Employers posting job openings or engaging workers through TrustHyre represent and warrant that:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li>All posted compensation, job site locations, working hours, and physical requirements are genuine and accurate.</li>
                  <li>Workplaces comply with prevailing labor laws, occupational safety codes, and hygiene standards.</li>
                  <li>No candidate shall be subject to discrimination based on caste, religion, gender, or geographic origin.</li>
                  <li>Employers shall never demand cash security deposits, recruitment fees, or retention of personal documents from candidates.</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="workers" className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">4. Worker Rights & Commitments</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Workers registered on TrustHyre receive fair assessment, transparent compensation details, and prompt dispute review. In return, workers agree to:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li>Perform agreed-upon duties in a diligent, professional, and reliable manner.</li>
                  <li>Refrain from unannounced abandonment of active work shifts without reasonable notification.</li>
                  <li>Accurately declare trade certifications, experience levels, and past project references.</li>
                </ul>
              </section>

              {/* Section 5 */}
              <section id="engagements" className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">5. Platform Workflow & Direct Engagements</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  TrustHyre operates as an authenticated digital venue connecting independent job seekers and employers:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li>TrustHyre facilitates job postings, application tracking, skill credential validation, and GPS photo attendance verification.</li>
                  <li>All hiring contracts, terms of employment, and compensation arrangements are established directly and independently between employers and candidates.</li>
                  <li>Users are responsible for confirming mutually agreed expectations, safety standards, and project deliverables prior to commencing work.</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="prohibited" className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">6. Prohibited Activities</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Users are strictly prohibited from engaging in any of the following activities:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li>Scraping, harvesting, or reverse-engineering candidate profiles or employer job data.</li>
                  <li>Posting fraudulent, unlawful, misleading, or deceptive job offers or resumes.</li>
                  <li>Soliciting unauthorized off-platform transactions to evade platform safety policies.</li>
                  <li>Deploying malicious automation, bot attacks, denial-of-service scripts, or vulnerability probing.</li>
                </ul>
              </section>

              {/* Section 7 */}
              <section id="liability" className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">7. Limitation of Liability</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  TrustHyre provides an intelligent facilitation platform connecting verified workers and employers. While we provide skill assessment badges and profile verification tools, employers and workers independently contract and execute their work engagements.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  To the maximum extent permitted by applicable law, TrustHyre shall not be liable for indirect, incidental, special, punitive, or consequential damages resulting from user conduct or off-platform interactions.
                </p>
              </section>

              {/* Section 8 */}
              <section id="governing" className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">8. Governing Law & Dispute Resolution</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  These Terms of Service are governed by and construed in accordance with the laws of India, including the Information Technology Act, 2000 and Digital Personal Data Protection Act, 2023. Any dispute arising out of or related to these terms shall be submitted to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India.
                </p>
              </section>

            </div>
          </div>
        </AutoTranslate>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} TrustHyre Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6 font-semibold">
            <Link to="/terms" className="text-[#0f2f63] font-bold">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-[#0f2f63] transition-colors">Privacy Policy</Link>
            <a href="mailto:support@trusthyre.com" className="hover:text-[#0f2f63] transition-colors">Help & Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
