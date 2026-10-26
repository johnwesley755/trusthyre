import { Link } from "react-router-dom";
import trustHyreLightLogo from "../../../assets/TrustHyre Logo with Skills Tagline.png";

export function LandingFooter() {
  return (
    <footer className="bg-[#0f2f63] text-white rounded-t-[40px] mt-20 relative overflow-hidden font-['Onest',system-ui,sans-serif]">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 px-8 py-16 max-w-7xl mx-auto border-t border-white/10">
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
            Safe, transparent hiring for verified workers and businesses across India.
          </p>
        </div>
        
        <div>
          <h5 className="font-bold text-white mb-4 uppercase tracking-widest text-xs font-label">For Workers</h5>
          <ul className="space-y-2.5 text-white/70 text-xs">
            <li><Link className="hover:text-white transition-colors" to="/search">Find Jobs</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/sign-up?role=worker">Worker Sign Up</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/terms">Terms & Safety Rules</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/privacy">Privacy Policy</Link></li>
          </ul>
        </div>
        
        <div>
          <h5 className="font-bold text-white mb-4 uppercase tracking-widest text-xs font-label">For Employers</h5>
          <ul className="space-y-2.5 text-white/70 text-xs">
            <li><Link className="hover:text-white transition-colors" to="/find-workers">Find Workers</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/post-job">Post a Job</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/blog">Blog & Hiring Guides</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/sign-in?role=employer">Employer Login</Link></li>
            <li><Link className="hover:text-white transition-colors" to="/admin/login">Admin Gateway</Link></li>
          </ul>
        </div>
        
        <div>
          <h5 className="font-bold text-white mb-4 uppercase tracking-widest text-xs font-label">Regional Language</h5>
          <div className="bg-white/10 rounded-xl p-3 inline-block shadow-xs border border-white/15">
            <select className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 cursor-pointer">
              <option className="bg-[#0f2f63] text-white">English</option>
              <option className="bg-[#0f2f63] text-white">हिन्दी (Hindi)</option>
              <option className="bg-[#0f2f63] text-white">ಕನ್ನಡ (Kannada)</option>
              <option className="bg-[#0f2f63] text-white">తెలుగు (Telugu)</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="border-t border-white/10 py-6 text-center px-8 text-white/50 text-xs font-medium">
        <p>Building Trust, One Job at a Time · Direct Connections & Zero Middle-Men</p>
      </div>
    </footer>
  );
}
