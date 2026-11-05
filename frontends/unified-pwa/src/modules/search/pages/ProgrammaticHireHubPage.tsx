import React, { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchService } from '../../../services/search.service';
import { SeoHead, buildBreadcrumbJsonLd } from '../../../components/common/SeoHead';
import { 
  Building2, 
  MapPin, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  Star, 
  Briefcase, 
  ArrowRight, 
  Sparkles, 
  Users, 
  PhoneCall, 
  Award,
  Clock,
  ChevronRight
} from 'lucide-react';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { AppLoader } from '../../../components/common/AppLoader';

const CITY_METADATA: Record<string, { name: string; state: string; popularLocalities: string[]; topTrades: string[] }> = {
  chennai: {
    name: 'Chennai',
    state: 'Tamil Nadu',
    popularLocalities: ['Guindy', 'Ambattur', 'Sholinganallur', 'Perungudi', 'T. Nagar', 'Thirumazhisai', 'Sriperumbudur'],
    topTrades: ['Electrician', 'Driver', 'Cook & Chef', 'Security Guard', 'Plumber', 'Warehouse Staff', 'Welder']
  },
  coimbatore: {
    name: 'Coimbatore',
    state: 'Tamil Nadu',
    popularLocalities: ['Gandhipuram', 'Peelamedu', 'Saravanampatti', 'Kurichi', 'Singanallur'],
    topTrades: ['CNC Operator', 'Lathe Machinist', 'Electrician', 'Industrial Welder', 'Driver']
  },
  madurai: {
    name: 'Madurai',
    state: 'Tamil Nadu',
    popularLocalities: ['KK Nagar', 'Anna Nagar', 'Koodal Nagar', 'Mattuthavani'],
    topTrades: ['Automobile Mechanic', 'Heavy Vehicle Driver', 'Mason', 'Electrician']
  },
  tiruchirappalli: {
    name: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    popularLocalities: ['Thillai Nagar', 'Cantonment', 'KK Nagar', 'Srirangam'],
    topTrades: ['Boiler Fabricator', 'Fitter', 'Electrician', 'Delivery Driver']
  },
  salem: {
    name: 'Salem',
    state: 'Tamil Nadu',
    popularLocalities: ['Fairlands', 'Suramangalam', 'Shevapet', 'Ammapet'],
    topTrades: ['Textile Operator', 'Driver', 'Electrician', 'Steel Worker']
  },
  tiruppur: {
    name: 'Tiruppur',
    state: 'Tamil Nadu',
    popularLocalities: ['Avinashi Road', 'Kangeyam Road', 'Palladam', 'Uthukuli'],
    topTrades: ['Tailoring & Garments', 'Quality Checker', 'Machine Operator', 'Driver']
  },
  bengaluru: {
    name: 'Bengaluru',
    state: 'Karnataka',
    popularLocalities: ['Electronic City', 'Whitefield', 'Peenya', 'Koramangala', 'Bommasandra'],
    topTrades: ['Warehouse Logistics', 'Electrician', 'Commercial Chef', 'Delivery Executive', 'Plumber']
  }
};

const TRADE_METADATA: Record<string, { title: string; category: string; description: string; avgSalary: string; keywords: string[] }> = {
  electricians: {
    title: 'Electricians',
    category: 'Electrical & Maintenance',
    description: 'Certified domestic and industrial electricians for commercial facilities, residential maintenance, single-phase/three-phase wiring, and circuit installations.',
    avgSalary: '₹22,000 - ₹35,000 / month',
    keywords: ['electrician', 'wiring', 'electrical technician', 'maintenance']
  },
  electrician: {
    title: 'Electricians',
    category: 'Electrical & Maintenance',
    description: 'Certified domestic and industrial electricians for commercial facilities, residential maintenance, single-phase/three-phase wiring, and circuit installations.',
    avgSalary: '₹22,000 - ₹35,000 / month',
    keywords: ['electrician', 'wiring', 'electrical technician']
  },
  drivers: {
    title: 'Commercial Drivers',
    category: 'Logistics & Transportation',
    description: 'Verified commercial vehicle operators, heavy lorry drivers, private corporate chauffeurs, and intracity logistics couriers with verified commercial driver licenses.',
    avgSalary: '₹20,000 - ₹32,000 / month',
    keywords: ['driver', 'chauffeur', 'transport', 'delivery']
  },
  driver: {
    title: 'Commercial Drivers',
    category: 'Logistics & Transportation',
    description: 'Verified commercial vehicle operators, heavy lorry drivers, private corporate chauffeurs, and intracity logistics couriers with verified commercial driver licenses.',
    avgSalary: '₹20,000 - ₹32,000 / month',
    keywords: ['driver', 'chauffeur', 'transport']
  },
  cooks: {
    title: 'Chefs & Commercial Cooks',
    category: 'Hospitality & Culinary',
    description: 'Verified commercial restaurant chefs, cloud kitchen cooks, catering crews, and canteen kitchen stewards skilled in regional South Indian, North Indian, and continental cuisines.',
    avgSalary: '₹22,000 - ₹38,000 / month',
    keywords: ['cook', 'chef', 'kitchen', 'catering']
  },
  cook: {
    title: 'Chefs & Commercial Cooks',
    category: 'Hospitality & Culinary',
    description: 'Verified commercial restaurant chefs, cloud kitchen cooks, catering crews, and canteen kitchen stewards skilled in regional South Indian, North Indian, and continental cuisines.',
    avgSalary: '₹22,000 - ₹38,000 / month',
    keywords: ['cook', 'chef', 'kitchen']
  },
  plumbers: {
    title: 'Plumbers',
    category: 'Sanitary & Drainage',
    description: 'Skilled plumbers for commercial pipe laying, water tank piping, sanitary fittings, high-pressure booster systems, and emergency leakage repair.',
    avgSalary: '₹18,000 - ₹30,000 / month',
    keywords: ['plumber', 'drainage', 'sanitary', 'pipe']
  },
  plumber: {
    title: 'Plumbers',
    category: 'Sanitary & Drainage',
    description: 'Skilled plumbers for commercial pipe laying, water tank piping, sanitary fittings, high-pressure booster systems, and emergency leakage repair.',
    avgSalary: '₹18,000 - ₹30,000 / month',
    keywords: ['plumber', 'drainage', 'sanitary']
  },
  welders: {
    title: 'Industrial Welders',
    category: 'Fabrication & Engineering',
    description: 'Certified TIG, MIG, and ARC structural welders for sheet metal fabrication, pre-engineered buildings, automotive assemblies, and boiler pressure pipes.',
    avgSalary: '₹24,000 - ₹40,000 / month',
    keywords: ['welder', 'fabrication', 'tig', 'mig']
  },
  welder: {
    title: 'Industrial Welders',
    category: 'Fabrication & Engineering',
    description: 'Certified TIG, MIG, and ARC structural welders for sheet metal fabrication, pre-engineered buildings, automotive assemblies, and boiler pressure pipes.',
    avgSalary: '₹24,000 - ₹40,000 / month',
    keywords: ['welder', 'fabrication']
  },
  warehouse: {
    title: 'Warehouse & Logistics Staff',
    category: 'Supply Chain & Fulfillment',
    description: 'Trained warehouse helpers, inventory pick-and-pack operators, dispatch handlers, and forklift drivers for fast-paced logistics fulfillment centers.',
    avgSalary: '₹17,000 - ₹26,000 / month',
    keywords: ['warehouse', 'logistics', 'packer', 'inventory']
  },
  workers: {
    title: 'Skilled Trades & Blue Collar Workforce',
    category: 'Frontline Workforce',
    description: 'Pre-screened, verified blue-collar workers and skilled technicians across multiple trades for direct commercial and industrial employment.',
    avgSalary: '₹18,000 - ₹35,000 / month',
    keywords: ['worker', 'technician', 'helper', 'specialist']
  }
};

export const ProgrammaticHireHubPage: React.FC = () => {
  const { city: rawCity, trade: rawTrade } = useParams<{ city?: string; trade?: string }>();
  const navigate = useNavigate();

  const citySlug = (rawCity || 'chennai').toLowerCase().trim();
  const tradeSlug = (rawTrade || 'workers').toLowerCase().trim();

  const cityMeta = CITY_METADATA[citySlug] || {
    name: citySlug.charAt(0).toUpperCase() + citySlug.slice(1),
    state: 'India',
    popularLocalities: ['Central Zone', 'Industrial Estate', 'Suburban Cluster'],
    topTrades: ['Electricians', 'Drivers', 'Cooks', 'Plumbers']
  };

  const tradeMeta = TRADE_METADATA[tradeSlug] || {
    title: tradeSlug.charAt(0).toUpperCase() + tradeSlug.slice(1),
    category: 'Skilled Trade',
    description: `Verified ${tradeSlug} candidates ready for direct commercial and industrial hiring in ${cityMeta.name}.`,
    avgSalary: '₹18,000 - ₹32,000 / month',
    keywords: [tradeSlug]
  };

  // Query verified worker candidates for this city & trade
  const { data: searchResult, isLoading } = useQuery({
    queryKey: ['programmaticHireHub', citySlug, tradeSlug],
    queryFn: () => searchService.searchWorkers({
      city: cityMeta.name,
      query: tradeSlug === 'workers' ? undefined : tradeMeta.keywords[0]
    }),
    staleTime: 1000 * 60 * 5
  });

  const workers = Array.isArray(searchResult) 
    ? searchResult 
    : (searchResult as any)?.workers || [];

  const pageTitle = `Hire Verified ${tradeMeta.title} in ${cityMeta.name} | Direct & Zero Brokerage - TrustHyre`;
  const metaDesc = `Looking to hire verified ${tradeMeta.title.toLowerCase()} in ${cityMeta.name}, ${cityMeta.state}? Browse skill-tested candidate profiles with transparent wage benchmarks (${tradeMeta.avgSalary}) and direct employer connection.`;
  const canonicalPath = tradeSlug === 'workers' 
    ? `/hire-workers-in-${citySlug}` 
    : `/hire-${tradeSlug}-in-${citySlug}`;

  // Structured Data (Schema.org AggregateRating + ItemList)
  const structuredData = useMemo(() => {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: `Hire ${tradeMeta.title} in ${cityMeta.name}`,
        serviceType: tradeMeta.category,
        provider: {
          '@type': 'Organization',
          name: 'TrustHyre',
          url: 'https://trusthyre.com'
        },
        areaServed: {
          '@type': 'City',
          name: cityMeta.name
        },
        description: metaDesc,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'INR',
          price: tradeMeta.avgSalary
        }
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${tradeMeta.title} in ${cityMeta.name}`,
        description: metaDesc,
        numberOfItems: workers.length,
        itemListElement: workers.slice(0, 10).map((w: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: w.name || `${tradeMeta.title.slice(0, -1)} Candidate`,
          url: `https://trusthyre.com/worker/${w.userId || w.id}`
        }))
      },
      buildBreadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Find Workers', path: '/find-workers' },
        { name: `${tradeMeta.title} in ${cityMeta.name}`, path: canonicalPath }
      ])
    ];
  }, [pageTitle, metaDesc, workers, tradeMeta, cityMeta, canonicalPath]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <SeoHead
        title={pageTitle}
        description={metaDesc}
        canonicalPath={canonicalPath}
        jsonLd={structuredData}
      />

      {/* Hero Header */}
      <div className="bg-[#0f2f63] text-white pt-10 pb-16 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-4">
          {/* Breadcrumb pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-blue-200/80 font-medium">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/find-workers" className="hover:text-white transition">Hire Talent</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-semibold">{cityMeta.name}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-blue-100 font-bold">{tradeMeta.title}</span>
          </div>

          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-md border border-white/15">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Employer Gateway · Zero Broker Commission
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Hire Verified <span className="text-blue-300">{tradeMeta.title}</span> in {cityMeta.name}
            </h1>

            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal">
              {tradeMeta.description} Connect directly with pre-screened talent across {cityMeta.popularLocalities.slice(0, 4).join(', ')}, and surrounding zones.
            </p>
          </div>

          {/* Quick Metrics & Employer Actions Banner */}
          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/post-job')}
              className="px-6 py-3 rounded-full bg-white hover:bg-slate-100 text-[#0f2f63] font-bold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4 text-[#0f2f63]" />
              Post Job to Hire in {cityMeta.name}
            </button>

            <Link
              to={`/jobs-in-${citySlug}/${tradeSlug === 'workers' ? '' : tradeSlug}`}
              className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs uppercase tracking-wider border border-white/20 transition-all flex items-center gap-1.5"
            >
              <span>View Open Vacancies</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <div className="ml-auto hidden md:flex items-center gap-6 text-xs text-blue-200/90">
              <div>
                <span className="block font-bold text-white text-sm">{tradeMeta.avgSalary}</span>
                <span>Benchmark Monthly Pay</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div>
                <span className="block font-bold text-white text-sm">Zero Fee</span>
                <span>Direct Contact</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Candidates Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e8ec]">
              <div>
                <h2 className="text-xl font-bold text-[#0a0a0a] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#0f2f63]" />
                  Available {tradeMeta.title} Candidates ({workers.length})
                </h2>
                <p className="text-xs text-[#717784] mt-0.5">
                  Verified profiles actively available for direct hire in {cityMeta.name}
                </p>
              </div>

              <Link
                to="/find-workers"
                className="text-xs font-semibold text-[#0f2f63] hover:underline flex items-center gap-1"
              >
                <span>Filter All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <AppLoader variant="inline" size="lg" message="Loading verified candidates in your area..." />
              </div>
            ) : workers.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-[#e6e8ec] text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-[#0f2f63] flex items-center justify-center mx-auto">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#0a0a0a]">
                  Candidate Pipeline Updating for {cityMeta.name}
                </h3>
                <p className="text-xs text-[#717784] max-w-md mx-auto leading-relaxed">
                  We are constantly verifying candidate trade evaluations in {cityMeta.name}. Post your requirements to automatically notify registered {tradeMeta.title.toLowerCase()} in your locality.
                </p>
                <button
                  onClick={() => navigate('/post-job')}
                  className="px-6 py-2.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold uppercase transition"
                >
                  Post Job & Request Candidates
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {workers.map((worker: any) => {
                  const workerId = worker.userId || worker.id;
                  const skillsList = worker.skills ? worker.skills.split(',').map((s: string) => s.trim()) : [];
                  const experience = worker.experienceYears ? `${worker.experienceYears} Years Exp` : 'Skill Certified';

                  return (
                    <div 
                      key={workerId}
                      className="bg-white rounded-2xl p-5 border border-[#e6e8ec] hover:border-[#0f2f63]/40 transition shadow-2xs space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <UserAvatar
                            name={worker.name || 'Verified Worker'}
                            src={worker.avatarUrl || worker.profilePhoto}
                            size="lg"
                            className="rounded-xl text-sm font-bold bg-[#0f2f63] text-white"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-[#0a0a0a]">
                                {worker.name || 'Trade Specialist'}
                              </h3>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                Verified
                              </span>
                            </div>

                            <p className="text-xs text-[#717784] flex items-center gap-2 mt-1">
                              <span className="font-medium text-[#0a0a0a]">{worker.trade || tradeMeta.title.slice(0, -1)}</span>
                              <span>•</span>
                              <span>{experience}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {worker.rating || '4.8'}
                              </span>
                            </p>
                          </div>
                        </div>

                        <Link
                          to={`/worker/${workerId}`}
                          className="px-4 py-2 rounded-full bg-slate-100 hover:bg-[#0f2f63] hover:text-white text-[#0f2f63] text-xs font-bold transition uppercase tracking-wider shrink-0"
                        >
                          View Profile
                        </Link>
                      </div>

                      {worker.bio && (
                        <p className="text-xs text-[#525866] leading-relaxed line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          "{worker.bio}"
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {skillsList.slice(0, 4).map((skill: string) => (
                            <span 
                              key={skill}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-[#474d5b] text-[10px] font-semibold"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        <span className="text-[11px] text-[#717784] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#0f2f63]" />
                          {worker.city || cityMeta.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Employer FAQ & Hiring Guide Accordion */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e6e8ec] space-y-6 mt-8">
              <div>
                <h3 className="text-lg font-bold text-[#0a0a0a]">
                  Frequently Asked Questions About Hiring {tradeMeta.title} in {cityMeta.name}
                </h3>
                <p className="text-xs text-[#717784] mt-1">
                  Compliance, verification standards, and hiring protocols
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <h4 className="text-xs font-bold text-[#0a0a0a]">
                    1. How does TrustHyre verify {tradeMeta.title.toLowerCase()} in {cityMeta.name}?
                  </h4>
                  <p className="text-xs text-[#525866] leading-relaxed">
                    Every candidate on TrustHyre completes government ID authentication, trade skill questionnaires, and hands-on work history records. When workers arrive on-site, attendance is recorded directly for complete accountability.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <h4 className="text-xs font-bold text-[#0a0a0a]">
                    2. Are there any recruiter or middle-men fees?
                  </h4>
                  <p className="text-xs text-[#525866] leading-relaxed">
                    No. TrustHyre operates on a direct connection model. Employers negotiate wages directly with candidates with zero commission deductions.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <h4 className="text-xs font-bold text-[#0a0a0a]">
                    3. What is the typical wage benchmark for {tradeMeta.title.toLowerCase()} in {cityMeta.name}?
                  </h4>
                  <p className="text-xs text-[#525866] leading-relaxed">
                    Standard monthly compensation in {cityMeta.name} averages between {tradeMeta.avgSalary}, depending on shift hours, commercial tooling requirements, and practical years of experience.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Column (1 Col) */}
          <div className="space-y-6">
            
            {/* Direct Employer CTA Box */}
            <div className="bg-[#0f2f63] text-white rounded-3xl p-6 shadow-md space-y-4 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Need Staff Immediately?
                </h3>
                <p className="text-xs text-blue-100/80 leading-relaxed mt-1">
                  Post your requirements in 2 minutes. We alert active verified workers across {cityMeta.name} instantly.
                </p>
              </div>

              <button
                onClick={() => navigate('/post-job')}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-[#0f2f63] text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm"
              >
                Post Job Opening Now
              </button>

              <div className="text-[11px] text-blue-200/70 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Zero Agency Commission
              </div>
            </div>

            {/* Popular Trades in City */}
            <div className="bg-white border border-[#e6e8ec] rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#717784]">
                Popular Trades in {cityMeta.name}
              </h3>
              <div className="space-y-1.5">
                {Object.entries(TRADE_METADATA)
                  .filter(([key]) => key !== 'workers' && !key.endsWith('s'))
                  .map(([slug, meta]) => {
                    const active = tradeSlug === slug || tradeSlug === `${slug}s`;
                    return (
                      <Link
                        key={slug}
                        to={`/hire-${slug}s-in-${citySlug}`}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium transition ${
                          active 
                            ? 'bg-[#0f2f63] text-white font-bold' 
                            : 'text-[#2e333d] hover:bg-slate-50'
                        }`}
                      >
                        <span>{meta.title}</span>
                        <span className={active ? 'text-blue-200 text-[10px]' : 'text-[#868c98] text-[10px]'}>
                          {meta.avgSalary.split('/')[0]}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            </div>

            {/* Other Cities Links */}
            <div className="bg-white border border-[#e6e8ec] rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#717784]">
                Hire in Other Tamil Nadu & Karnataka Hubs
              </h3>
              <div className="space-y-1.5">
                {Object.entries(CITY_METADATA)
                  .filter(([c]) => c !== citySlug)
                  .map(([c, meta]) => (
                    <Link
                      key={c}
                      to={`/hire-${tradeSlug === 'workers' ? 'workers' : tradeSlug}-in-${c}`}
                      className="block text-xs text-[#5a6270] hover:text-[#0f2f63] hover:underline py-1"
                    >
                      Hire in {meta.name}, {meta.state}
                    </Link>
                  ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default ProgrammaticHireHubPage;

