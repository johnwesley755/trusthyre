import { Link } from "react-router-dom";
import trustHyreLightLogo from "../../../assets/TrustHyre Logo with Skills Tagline.png";
import { useTranslation, SUPPORTED_LANGUAGES } from "../../../providers/TranslationContext";
import { Globe, Briefcase, Users } from "lucide-react";
import { Dropdown } from "../../../components/ui/dropdown";
import { ThemeToggle } from "../../../components/common/ThemeToggle";

export function LandingFooter() {
  const { language, setLanguage } = useTranslation();

  return (
    <footer className="bg-[#0f2f63] dark:bg-black text-white border-t border-transparent dark:border-zinc-800 rounded-t-[40px] mt-20 relative overflow-hidden font-['Onest',system-ui,sans-serif] transition-colors duration-200">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      
      {/* Top Main Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 px-6 sm:px-8 py-16 max-w-7xl mx-auto border-t border-white/10">
        <div className="space-y-4">
          <Link to="/" className="inline-block" aria-label="TrustHyre Home">
            <img 
              src={trustHyreLightLogo} 
              alt="TrustHyre" 
              className="h-12 sm:h-14 w-auto object-contain block select-none hover:opacity-90 transition-opacity drop-shadow-md" 
            />
          </Link>
          <p className="text-white/70 text-xs leading-relaxed max-w-xs">
            © 2026 TrustHyre.<br/>
            India's #1 verified workforce platform. Direct job connections, verified skilled passports, and zero brokerage.
          </p>
        </div>
        
        <div>
          <h5 className="font-bold text-white mb-4 uppercase tracking-widest text-xs font-label">For Workers</h5>
          <ul className="space-y-2.5 text-white/70 text-xs">
            <li><Link className="hover:text-white transition-colors" to="/search">Find Jobs Across India</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/jobs-in-chennai">Jobs in Chennai</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/jobs-in-coimbatore">Jobs in Coimbatore</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/jobs-in-madurai">Jobs in Madurai</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/sign-up?role=worker">Worker Sign Up (Free)</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/terms">Safety Rules & Terms</Link></li>
          </ul>
        </div>
        
        <div>
          <h5 className="font-bold text-white mb-4 uppercase tracking-widest text-xs font-label">For Employers</h5>
          <ul className="space-y-2.5 text-white/70 text-xs">
            <li><Link className="hover:text-white transition-colors" to="/find-workers">Browse Worker Directory</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/hire-electricians-in-chennai">Hire Electricians in Chennai</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/hire-drivers-in-chennai">Hire Drivers in Chennai</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/hire-cooks-in-chennai">Hire Cooks in Chennai</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/post-job">Post a Job (Zero Commission)</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/blog">Hiring Guides & Salaries</Link></li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <h5 className="font-bold text-white mb-4 uppercase tracking-widest text-xs font-label flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-200" />
            Regional Language / மொழி
          </h5>
          <div className="w-full max-w-[220px] space-y-3">
            <Dropdown
              variant="default"
              value={language}
              onChange={(val) => setLanguage(val as any)}
              options={SUPPORTED_LANGUAGES.map((lang) => ({
                value: lang.code,
                label: `${lang.native} (${lang.name})`,
              }))}
              className="w-full"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-white/70 font-semibold uppercase tracking-wider">Theme Mode:</span>
              <ThemeToggle variant="pill" showLabel={true} />
            </div>
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed">
            Switch UI to Tamil, Hindi, or Telugu for blue-collar staff & local contractors.
          </p>
        </div>
      </div>

      {/* Programmatic Internal Link Equity Matrix (Google SEO Boost) */}
      <div className="border-t border-white/10 px-6 sm:px-8 py-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h6 className="text-[11px] uppercase tracking-wider text-blue-200/90 font-bold mb-3 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            Popular Job Openings by City & Trade
          </h6>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/70">
            <Link to="/jobs-in-chennai/electrician" className="hover:text-white hover:underline">Electrician Jobs in Chennai</Link>
            <span>•</span>
            <Link to="/jobs-in-chennai/driver" className="hover:text-white hover:underline">Driver Jobs in Chennai</Link>
            <span>•</span>
            <Link to="/jobs-in-chennai/cook" className="hover:text-white hover:underline">Cook Jobs in Chennai</Link>
            <span>•</span>
            <Link to="/jobs-in-coimbatore/electrician" className="hover:text-white hover:underline">Electrician Jobs in Coimbatore</Link>
            <span>•</span>
            <Link to="/jobs-in-coimbatore/driver" className="hover:text-white hover:underline">Driver Jobs in Coimbatore</Link>
            <span>•</span>
            <Link to="/jobs-in-madurai/driver" className="hover:text-white hover:underline">Driver Jobs in Madurai</Link>
            <span>•</span>
            <Link to="/jobs-in-bengaluru/warehouse" className="hover:text-white hover:underline">Warehouse Jobs in Bengaluru</Link>
            <span>•</span>
            <Link to="/jobs-in-salem/electrician" className="hover:text-white hover:underline">Electrician Jobs in Salem</Link>
            <span>•</span>
            <Link to="/jobs-in-tiruppur/welder" className="hover:text-white hover:underline">Welder Jobs in Tiruppur</Link>
          </div>
        </div>

        <div>
          <h6 className="text-[11px] uppercase tracking-wider text-blue-200/90 font-bold mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Hire Verified Blue-Collar Talent Across India
          </h6>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/70">
            <Link to="/hire-electricians-in-chennai" className="hover:text-white hover:underline">Hire Electricians in Chennai</Link>
            <span>•</span>
            <Link to="/hire-drivers-in-chennai" className="hover:text-white hover:underline">Hire Drivers in Chennai</Link>
            <span>•</span>
            <Link to="/hire-cooks-in-chennai" className="hover:text-white hover:underline">Hire Cooks & Chefs in Chennai</Link>
            <span>•</span>
            <Link to="/hire-plumbers-in-chennai" className="hover:text-white hover:underline">Hire Plumbers in Chennai</Link>
            <span>•</span>
            <Link to="/hire-welders-in-coimbatore" className="hover:text-white hover:underline">Hire Industrial Welders in Coimbatore</Link>
            <span>•</span>
            <Link to="/hire-drivers-in-madurai" className="hover:text-white hover:underline">Hire Heavy Drivers in Madurai</Link>
            <span>•</span>
            <Link to="/hire-warehouse-in-bengaluru" className="hover:text-white hover:underline">Hire Logistics Crew in Bengaluru</Link>
            <span>•</span>
            <Link to="/hire-workers-in-chennai" className="hover:text-white hover:underline">Hire Workers in Chennai</Link>
          </div>
        </div>
      </div>
      
      <div className="border-t border-white/10 py-6 text-center px-8 text-white/50 text-xs font-medium">
        <p>Building Trust, One Job at a Time · Direct Connections & Zero Middle-Men</p>
      </div>
    </footer>
  );
}
