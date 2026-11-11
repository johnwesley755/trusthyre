import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  Server, 
  Database, 
  UserCheck, 
  FileCheck2, 
  CheckCircle2, 
  Printer, 
  ArrowLeft,
  KeyRound,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import trustHyreLogoLight from '../../../assets/TrustHyre Skills and Opportunities Logo.png';
import trustHyreLogoDark from '../../../assets/TrustHyre Logo with Skills Tagline.png';
import { SeoHead } from '../../../components/common/SeoHead';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../../providers/TranslationContext';
import { AutoTranslate } from '../../../components/common/AutoTranslate';
import { Dropdown } from '../../../components/ui/dropdown';

export const PrivacyPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('collection');
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
    { id: 'collection', title: '1. Information We Collect', icon: Database },
    { id: 'usage', title: '2. How We Use Your Data', icon: UserCheck },
    { id: 'legal-basis', title: '3. Legal Basis for Processing', icon: FileCheck2 },
    { id: 'sharing', title: '4. Third-Party Data Sharing', icon: Server },
    { id: 'security', title: '5. Security Safeguards & Encryption', icon: Lock },
    { id: 'retention', title: '6. Data Retention & Deletion', icon: KeyRound },
    { id: 'rights', title: '7. Your Privacy Rights (DPDP Act)', icon: Eye },
    { id: 'grievance', title: '8. Grievance Officer & Contact', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#000000] text-[#0A1931] dark:text-zinc-100 font-sans antialiased selection:bg-[#0f2f63] selection:text-white flex flex-col justify-between transition-colors duration-200">
      <SeoHead
        title="Privacy Policy"
        description="Learn how TrustHyre collects, encrypts, and protects your personal data in accordance with DPDP compliance."
        canonicalPath="/privacy"
      />
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3 sm:gap-4">
          <Link to="/" className="flex items-center group py-1 shrink-0" aria-label="TrustHyre Home">
            <img 
              src={trustHyreLogoLight} 
              alt="TrustHyre" 
              className="h-9 sm:h-11 md:h-12 w-auto object-contain block dark:hidden select-none group-hover:opacity-90 transition-opacity" 
            />
            <img 
              src={trustHyreLogoDark} 
              alt="TrustHyre" 
              className="h-9 sm:h-11 md:h-12 w-auto object-contain hidden dark:block select-none group-hover:opacity-90 transition-opacity" 
            />
          </Link>

          {/* Quick Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-900 rounded-full border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold">
            <Link
              to="/terms"
              className="px-3 sm:px-3.5 py-1.5 rounded-full text-slate-600 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="px-3 sm:px-3.5 py-1.5 rounded-full bg-[#0f2f63] dark:bg-[#2563EB] text-white shadow-xs transition-colors"
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
                icon={<Globe className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#38BDF8]" />}
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
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-[#0f2f63] dark:hover:text-white py-1.5 px-3 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white dark:from-[#09090b] to-[#F8FAFC] dark:to-[#000000] border-b border-slate-200/80 dark:border-zinc-800 py-10 sm:py-14 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Data Protection & Privacy Standard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0A1931] dark:text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed">
              We believe privacy is a fundamental right. This policy outlines how TrustHyre collects, encrypts, processes, and protects your personal data in accordance with the Digital Personal Data Protection (DPDP) Act, 2023.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 pt-2">
              <span className="bg-white dark:bg-[#121215] px-3 py-1 rounded-md border border-slate-200 dark:border-zinc-800 shadow-2xs">
                Last Revised: October 14, 2026
              </span>
              <span className="bg-white dark:bg-[#121215] px-3 py-1 rounded-md border border-slate-200 dark:border-zinc-800 shadow-2xs">
                Applies to: Candidates, Recruiters & Enterprise
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 shadow-2xs inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                DPDP Act Compliant
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout with Sticky Sidebar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        <AutoTranslate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left: Sticky Table of Contents (Desktop) */}
            <aside className="lg:col-span-4 sticky top-24 space-y-6">
              <div className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs">
                <h2 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3 px-2">
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
                            ? 'bg-[#0f2f63] dark:bg-[#2563EB] text-white shadow-xs'
                            : 'text-slate-600 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{sec.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Privacy Promise Callout */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Our Privacy Promise</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  We never monetize your personal profiles by selling data to third-party advertisers. Your information is used strictly for authenticated job matching, verified hiring, and secure platform collaboration.
                </p>
                <a
                  href="mailto:privacy@trusthyre.com"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-200 underline underline-offset-2"
                >
                  Inquire With Privacy Officer &rarr;
                </a>
              </div>
            </aside>

            {/* Right: Detailed Privacy Policy Sections */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Quick Core Commitments Card */}
              <div className="bg-white dark:bg-[#121215] rounded-2xl border-2 border-emerald-100 dark:border-emerald-800/40 p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>TrustHyre Privacy & Data Principles</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-slate-700 dark:text-zinc-300 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Zero Third-Party Data Selling:</strong> We never sell personal contact numbers or resumes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Secure Identity Verification:</strong> User credentials and profile documents are stored with strict industry-standard encryption.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>End-to-End Encryption:</strong> All transit communications use TLS 1.3 with AES-256 database encryption.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Right to Erasure:</strong> Request permanent profile removal anytime with 30-day compliance.</span>
                  </li>
                </ul>
              </div>

              {/* Section 1 */}
              <section id="collection" className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <Database className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">1. Information We Collect</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  TrustHyre collects specific data categories to facilitate verified blue-collar and skilled workforce matching:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li><strong>Identity Information:</strong> Full legal name, gender, date of birth, profile photograph, and skill verification status.</li>
                  <li><strong>Contact Data:</strong> Primary phone number, email address, physical location, and pincode for hyperlocal job matching.</li>
                  <li><strong>Professional Profile:</strong> Trade specializations (electrician, carpentry, cooking, logistics), years of verified experience, salary expectations, and uploaded portfolio images.</li>
                  <li><strong>Technical Telemetry:</strong> Device browser, IP address, login timestamps, and essential authentication cookies.</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section id="usage" className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">2. How We Use Your Data</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your personal and occupational information is processed strictly for:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li>Connecting qualified workers with employers with matching hiring requirements.</li>
                  <li>Conducting profile authenticity and skill verification checks via certified evaluation gateways.</li>
                  <li>Enabling verified GPS attendance tracking and shift milestone completion.</li>
                  <li>Preventing impersonation, duplicate applications, and fraudulent employer solicitations.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="legal-basis" className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">3. Legal Basis for Processing</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We process your personal data in accordance with the Digital Personal Data Protection Act, 2023 under the following lawful bases:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li><strong>Explicit Consent:</strong> Provided by you during registration, phone OTP verification, and document upload.</li>
                  <li><strong>Contractual Necessity:</strong> To fulfill job applications, verified job postings, and hiring connections.</li>
                  <li><strong>Legal Compliance:</strong> To satisfy statutory record retention, security auditing, and platform fraud prevention obligations.</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="sharing" className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <Server className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">4. Third-Party Data Sharing & Processors</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We only share minimal, necessary information with vetted platform sub-processors:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li><strong>Cloud Infrastructure:</strong> Cloudflare (Workers, CDN, and DDoS protection) and Neon PostgreSQL (database storage).</li>
                  <li><strong>Media & Document Storage:</strong> Cloudinary (secure encrypted CDN for portfolio and profile pictures).</li>
                  <li><strong>Communications & OTP:</strong> Brevo / Twilio (transactional SMS notifications and password resets).</li>
                  <li><strong>Verification Partners:</strong> Authorized evaluation gateways conducting secure profile and skill verification.</li>
                </ul>
              </section>

              {/* Section 5 */}
              <section id="security" className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">5. Security Safeguards & Encryption</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  TrustHyre maintains institutional-grade security controls:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li>Strict Transport Security (HSTS) with TLS 1.3 encryption across all network communications.</li>
                  <li>Role-Based Access Control (RBAC) ensuring workers, employers, and administrators access only authorized datasets.</li>
                  <li>Bcrypt cryptographic password hashing and automated JWT session expiration.</li>
                  <li>Daily encrypted database backups with point-in-time recovery capabilities.</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="retention" className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">6. Data Retention & Deletion Policy</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We retain your account information only for as long as your profile remains active. Upon requesting account deletion via Settings or legal contact:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li>Your public profile is immediately removed from search listings within 24 hours.</li>
                  <li>All media files, resumes, and identification images are purged from cloud storage within 30 days.</li>
                  <li>Account audit and verification logs are retained only as required by statutory record retention rules.</li>
                </ul>
              </section>

              {/* Section 7 */}
              <section id="rights" className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <Eye className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">7. Your Privacy Rights</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Under applicable Indian data privacy regulations, you possess the right to:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                  <li><strong>Access:</strong> Request a comprehensive export of all personal data held about you.</li>
                  <li><strong>Rectification:</strong> Correct outdated contact, skill, or trade certification details at any time.</li>
                  <li><strong>Erasure:</strong> Request the deletion of your profile, documents, and account credentials.</li>
                  <li><strong>Consent Withdrawal:</strong> Revoke consent for non-essential communications or marketing notifications.</li>
                </ul>
              </section>

              {/* Section 8 */}
              <section id="grievance" className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2f63]">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0A1931]">8. Grievance Officer & Contact Information</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  In compliance with the Information Technology Act and DPDP Rules, the details of our designated Grievance Officer are as follows:
                </p>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <p><strong>Grievance Redressal Officer:</strong> Compliance & Legal Team</p>
                  <p><strong>Entity:</strong> TrustHyre Technologies Private Limited</p>
                  <p><strong>Address:</strong> HSR Layout, Sector 4, Bengaluru, Karnataka 560102, India</p>
                  <p><strong>Email:</strong> <a href="mailto:grievance@trusthyre.com" className="text-[#0f2f63] font-bold hover:underline">grievance@trusthyre.com</a> / <a href="mailto:privacy@trusthyre.com" className="text-[#0f2f63] font-bold hover:underline">privacy@trusthyre.com</a></p>
                  <p><strong>Resolution Timeline:</strong> All formal privacy complaints are acknowledged within 24 hours and resolved within 15 business days.</p>
                </div>
              </section>

            </div>
          </div>
        </AutoTranslate>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white dark:bg-[#000000] border-t border-slate-200 dark:border-zinc-800 py-8 px-4 sm:px-6 lg:px-8 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-500">
          <p>&copy; {new Date().getFullYear()} TrustHyre Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6 font-semibold">
            <Link to="/terms" className="hover:text-[#0f2f63] dark:hover:text-[#38BDF8] transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="text-[#0f2f63] dark:text-[#38BDF8] font-bold">Privacy Policy</Link>
            <a href="mailto:support@trusthyre.com" className="hover:text-[#0f2f63] dark:hover:text-[#38BDF8] transition-colors">Help & Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPage;
