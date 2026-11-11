import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchService } from '../../../services/search.service';
import { JobSearchResultCard } from '../components/JobSearchResultCard';
import { SeoHead, buildBreadcrumbJsonLd } from '../../../components/common/SeoHead';
import { generateHierarchicalJobUrl, slugifyNeighborhood } from '../../../utils/seoSlug.utils';
import { getTaluksForCity } from '../../../constants/regionalTaluks';
import { AppLoader } from '../../../components/common/AppLoader';
import { 
  MapPin, 
  Briefcase, 
  ShieldCheck, 
  ChevronRight, 
  IndianRupee, 
  ArrowRight,
  Navigation,
  Compass,
  CheckCircle2,
  HelpCircle,
  Train
} from 'lucide-react';

export interface NeighborhoodJobHubPageProps {
  city?: string;
  neighborhood?: string;
  trade?: string;
}

export default function NeighborhoodJobHubPage({
  city: propCity,
  neighborhood: propNeighborhood,
  trade: propTrade,
}: NeighborhoodJobHubPageProps = {}) {
  const params = useParams<{
    city: string;
    neighborhood: string;
    trade?: string;
  }>();

  const city = propCity || params.city || 'chennai';
  const rawNeighborhood = propNeighborhood || params.neighborhood || '';
  const rawTrade = propTrade || params.trade || '';

  // Normalize neighborhood: remove trailing '-jobs' if present
  const neighborhoodSlug = rawNeighborhood.replace(/-jobs$/, '').toLowerCase().trim();
  const tradeSlug = (rawTrade || '').toLowerCase().trim();

  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  const cityTaluks = useMemo(() => getTaluksForCity(city), [city]);
  
  // Dynamically resolve area display name from taluks catalog or slug title-case
  const matchedTaluk = cityTaluks.find((t) => slugifyNeighborhood(t) === neighborhoodSlug);
  const areaName = matchedTaluk || neighborhoodSlug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

  // Fetch jobs for this micro-location
  const { data: rawJobs = [], isLoading } = useQuery({
    queryKey: ['neighborhoodJobs', city, neighborhoodSlug, tradeSlug],
    queryFn: () => searchService.searchJobs({
      city: cityName,
      q: tradeSlug ? `${tradeSlug} ${areaName}` : areaName,
    }),
    staleTime: 5 * 60 * 1000,
  });

  const jobs = useMemo(() => {
    const list = Array.isArray(rawJobs) ? rawJobs : [];
    return list.filter((j: any) => {
      // Must match area or neighborhood
      const loc = `${j.location || ''} ${j.address || ''} ${j.title || ''}`.toLowerCase();
      const matchesArea = loc.includes(neighborhoodSlug.replace(/-/g, ' ')) || loc.includes(areaName.toLowerCase());
      if (tradeSlug) {
        const matchesTrade = `${j.title || ''} ${j.industry || ''}`.toLowerCase().includes(tradeSlug);
        return matchesArea && matchesTrade;
      }
      return matchesArea || list.length < 5; // fallback to city jobs if small volume
    });
  }, [rawJobs, neighborhoodSlug, areaName, tradeSlug]);

  // Dynamic salary range computed from real jobs
  const salaryStats = useMemo(() => {
    const salaries = jobs
      .map((j: any) => Number(j.budget))
      .filter((b: number) => !isNaN(b) && b > 0);

    if (salaries.length > 0) {
      const min = Math.min(...salaries);
      const max = Math.max(...salaries);
      return {
        min: `₹${min.toLocaleString('en-IN')}`,
        max: `₹${max.toLocaleString('en-IN')}`,
        isLive: true
      };
    }
    return {
      min: '₹14,000',
      max: '₹32,000',
      isLive: false
    };
  }, [jobs]);

  const pageTitle = tradeSlug
    ? `${tradeSlug.charAt(0).toUpperCase() + tradeSlug.slice(1)} Jobs in ${areaName}, ${cityName} | Direct Employer Hiring`
    : `Verified Jobs in ${areaName}, ${cityName} | Walk-Ins & Direct Hiring | TrustHyre`;

  const pageDescription = `Find ${jobs.length > 0 ? `${jobs.length}+ ` : ''}verified job vacancies in ${areaName}, ${cityName}. Direct hiring with zero broker fee, confirmed worksite location, and on-time payouts. Apply directly or connect on WhatsApp.`;

  const canonicalPath = tradeSlug
    ? `/${city}/${neighborhoodSlug}-jobs/${tradeSlug}`
    : `/${city}/${neighborhoodSlug}-jobs`;

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: `Jobs in ${cityName}`, path: `/jobs-in-${city}` },
    { name: `${areaName} Jobs`, path: `/${city}/${neighborhoodSlug}-jobs` },
    ...(tradeSlug ? [{ name: `${tradeSlug.charAt(0).toUpperCase() + tradeSlug.slice(1)}`, path: canonicalPath }] : [])
  ];

  // FAQ Schema for AEO rich snippets
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What types of jobs are available in ${areaName}, ${cityName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `In ${areaName}, verified openings include skilled technicians, helpers, drivers, and service staff with confirmed worksite addresses.`
        }
      },
      {
        '@type': 'Question',
        name: `How do I apply for jobs in ${areaName} without paying broker fees?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `TrustHyre connects job seekers directly with verified employers in ${areaName}. Candidates can apply directly on the platform or connect with employers via WhatsApp with zero commission.`
        }
      },
      {
        '@type': 'Question',
        name: `What is the expected salary for jobs in ${areaName}, ${cityName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Current compensation in ${areaName} ranges between ${salaryStats.min} and ${salaryStats.max} depending on experience and trade skill certification.`
        }
      }
    ]
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${areaName} Verified Job Openings`,
    numberOfItems: jobs.length,
    itemListElement: jobs.map((job: any, index: number) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: job.title,
      url: `https://trusthyre.com${generateHierarchicalJobUrl(job)}`,
      description: job.description || `${job.title} job vacancy in ${areaName}, ${cityName}`
    }))
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] text-slate-900 dark:text-zinc-100 pb-16 transition-colors duration-200">
      <SeoHead
        title={pageTitle}
        description={pageDescription}
        canonicalPath={canonicalPath}
        jsonLd={[buildBreadcrumbJsonLd(breadcrumbs), itemListJsonLd, faqJsonLd]}
      />

      {/* Breadcrumb Navigation */}
      <div className="bg-white dark:bg-[#09090b] border-b border-slate-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 overflow-x-auto whitespace-nowrap">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.path}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-600 shrink-0" />}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-slate-900 dark:text-white">{crumb.name}</span>
                ) : (
                  <Link to={crumb.path} className="hover:text-[#0f2f63] dark:hover:text-[#38BDF8] hover:underline transition-colors">
                    {crumb.name}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>

      {/* Hyper-Local Hero Banner */}
      <div className="bg-gradient-to-br from-[#0a1e3b] via-[#0f2f63] to-[#1e40af] dark:from-[#050b14] dark:via-[#091528] dark:to-[#0f2f63] text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-transparent dark:border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Micro-Market Hub
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 dark:bg-white/5 text-slate-200 text-xs">
              <Compass className="w-3.5 h-3.5" />
              {cityName} Local Zone
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3 text-white">
            {tradeSlug ? `${tradeSlug.toUpperCase()} Jobs in ` : 'Verified Blue-Collar Jobs in '}
            <span className="text-amber-400">{areaName}</span>, {cityName}
          </h1>

          <p className="text-slate-200 text-sm sm:text-base max-w-2xl mb-6">
            Direct employer connections with confirmed worksite locations in {areaName}. Zero brokerage, daily & monthly payouts, with verified landmark access.
          </p>

          {/* Key Metrics / Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xs border border-white/15 dark:border-white/10 rounded-xl p-3">
              <div className="text-xs text-slate-300 font-medium">Active Openings</div>
              <div className="text-lg sm:text-xl font-black text-white flex items-center gap-1">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                {isLoading ? '...' : `${jobs.length} Available`}
              </div>
            </div>

            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xs border border-white/15 dark:border-white/10 rounded-xl p-3">
              <div className="text-xs text-slate-300 font-medium">
                {salaryStats.isLive ? 'Current Pay Range' : 'Estimated Pay Range'}
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-300 flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {salaryStats.min} - {salaryStats.max}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white/10 dark:bg-white/5 backdrop-blur-xs border border-white/15 dark:border-white/10 rounded-xl p-3">
              <div className="text-xs text-slate-300 font-medium">Broker Commission</div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                ₹0 (Free)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Transit & Local Taluks Bar */}
      {cityTaluks.length > 0 && (
        <div className="bg-white dark:bg-[#09090b] border-b border-slate-200 dark:border-zinc-800 py-3.5 px-4 sm:px-6 lg:px-8 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-none">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1 shrink-0">
              <Train className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
              {cityName} Local Areas:
            </span>
            {cityTaluks.slice(0, 10).map((taluk) => {
              const slug = slugifyNeighborhood(taluk);
              const isActive = slug === neighborhoodSlug;
              return (
                <Link
                  key={taluk}
                  to={`/${city}/${slug}-jobs`}
                  className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full font-medium transition-colors shrink-0 ${
                    isActive 
                      ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white shadow-2xs' 
                      : 'bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-transparent dark:border-zinc-800'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-red-500" />
                  {taluk}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Listings Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Verified Openings in {areaName}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-sky-950/60 border border-blue-200 dark:border-blue-900 text-[#0f2f63] dark:text-[#38BDF8] font-bold">
                  {jobs.length}
                </span>
              </h2>
              <Link
                to={`/search?city=${cityName}&q=${areaName}`}
                className="text-xs font-semibold text-[#0f2f63] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
              >
                View all in search <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <AppLoader />
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-white dark:bg-[#121215] rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 p-8 text-center space-y-3">
                <MapPin className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  No active openings currently listed in {areaName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                  New verified positions are posted daily. Explore all openings across {cityName} or set up a WhatsApp job alert.
                </p>
                <Link
                  to={`/jobs-in-${city}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#1a4487] dark:hover:bg-[#0052cc] text-white rounded-full text-xs font-bold transition-all shadow-xs"
                >
                  Browse all {cityName} Jobs
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job: any) => (
                  <JobSearchResultCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {/* Hyper-Local FAQ Section for Rich Results */}
            <div className="mt-12 bg-white dark:bg-[#121215] rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 space-y-4 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0f2f63] dark:text-[#38BDF8]" />
                Frequently Asked Questions about Working in {areaName}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-[#1C1C21] rounded-xl border border-transparent dark:border-zinc-800/80">
                  <h4 className="font-bold text-slate-800 dark:text-zinc-100 mb-1">
                    What types of jobs are most in demand in {areaName}?
                  </h4>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs leading-relaxed">
                    Popular sectors in {areaName} and across {cityName} include retail, facility maintenance, driving, technician, and warehousing roles.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-[#1C1C21] rounded-xl border border-transparent dark:border-zinc-800/80">
                  <h4 className="font-bold text-slate-800 dark:text-zinc-100 mb-1">
                    Is there any broker fee to apply for jobs here?
                  </h4>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs leading-relaxed">
                    No. TrustHyre is 100% free for workers. Employers post genuine openings with direct contact details and confirmed worksite locations.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-[#1C1C21] rounded-xl border border-transparent dark:border-zinc-800/80">
                  <h4 className="font-bold text-slate-800 dark:text-zinc-100 mb-1">
                    How do I receive job updates for {areaName} on WhatsApp?
                  </h4>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs leading-relaxed">
                    Click the WhatsApp share button on any opening to share it with your peers or join our local neighborhood candidate pool for immediate alerts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Dynamic Neighborhoods & Area Links for this City */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-[#0f2f63] dark:text-[#38BDF8]" />
                Explore Other {cityName} Localities
              </h3>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {cityTaluks
                  .filter((t) => slugifyNeighborhood(t) !== neighborhoodSlug)
                  .map((t) => {
                    const slug = slugifyNeighborhood(t);
                    return (
                      <Link
                        key={t}
                        to={`/${city}/${slug}-jobs`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900/60 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-[#0f2f63] dark:hover:text-[#38BDF8] transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                          {t}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">View Jobs</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

