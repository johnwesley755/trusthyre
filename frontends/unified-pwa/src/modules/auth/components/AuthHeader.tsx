import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../providers/ThemeContext';
import trustHyreLogoLight from '../../../assets/TrustHyre Skills and Opportunities Logo.png';
import trustHyreLogoDark from '../../../assets/TrustHyre Logo with Skills Tagline.png';

export const AuthHeader = () => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <header className="absolute top-0 left-0 w-full z-50 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center group py-1" aria-label="TrustHyre Home">
                    <img 
                      src={isDark ? trustHyreLogoDark : trustHyreLogoLight} 
                      alt="TrustHyre" 
                      className="h-11 sm:h-12 md:h-14 w-auto object-contain select-none group-hover:opacity-90 transition-opacity" 
                    />
                </Link>
                <div className="flex items-center gap-6">
                    <Link className="flex items-center gap-2 text-slate-600 dark:text-zinc-300 hover:text-brand-500 dark:hover:text-white transition-colors font-bold text-sm" to="/">
                        <span className="material-symbols-outlined text-[20px]">home</span>
                        Home
                    </Link>
                    <Link className="hidden md:flex items-center gap-2 text-slate-600 dark:text-zinc-300 font-bold text-sm cursor-pointer hover:text-brand-500 dark:hover:text-white transition-colors" to="/sign-in?role=worker">
                        <span className="material-symbols-outlined text-[20px]">badge</span>
                        Candidate Login
                    </Link>
                    <Link className="hidden md:flex items-center gap-2 text-slate-600 dark:text-zinc-300 font-bold text-sm cursor-pointer hover:text-brand-500 dark:hover:text-white transition-colors" to="/sign-in?role=employer">
                        <span className="material-symbols-outlined text-[20px]">business_center</span>
                        Employer Login
                    </Link>
                </div>
            </div>
        </header>
    );
};
