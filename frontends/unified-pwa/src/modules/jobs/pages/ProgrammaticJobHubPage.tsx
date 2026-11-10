import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchService } from '../../../services/search.service';
import { queryKeys } from '../../../lib/queryKeys';
import { JobSearchResultCard } from '../components/JobSearchResultCard';
import { SeoHead, buildBreadcrumbJsonLd } from '../../../components/common/SeoHead';
import { generateJobSeoSlug, generateHierarchicalJobUrl } from '../../../utils/seoSlug.utils';
import { AppLoader } from '../../../components/common/AppLoader';
import { 
  MapPin, 
  Briefcase, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight, 
  IndianRupee, 
  ArrowRight,
  TrendingUp,
  Building2,
  Users
} from 'lucide-react';

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
  sriperumbudur: {
    name: 'Sriperumbudur',
    state: 'Tamil Nadu',
    popularLocalities: ['SIPCOT Industrial Park', 'Sunguvarchatram', 'Vallam Vadagal', 'Mambakkam', 'Irungattukottai', 'Oragadam'],
    topTrades: ['Industrial Welder', 'CNC Operator', 'Machine Operator', 'Electrician', 'Warehouse Staff', 'Driver']
  },
  bengaluru: {
    name: 'Bengaluru',
    state: 'Karnataka',
    popularLocalities: ['Electronic City', 'Whitefield', 'Koramangala', 'Peenya Industrial Area'],
    topTrades: ['Warehouse Supervisor', 'Delivery Partner', 'Cook', 'Electrician']
  },
};

const TRADE_METADATA: Record<string, { title: string; category: string; description: string; avgSalary: string }> = {
  electrician: {
    title: 'Electrician',
    category: 'Electrical & Maintenance',
    description: 'Industrial and domestic electrical wiring, circuit breakers, power distribution, and equipment maintenance.',
    avgSalary: '₹22,000 - ₹35,000 / month'
  },
  driver: {
    title: 'Driver',
    category: 'Logistics & Transportation',
    description: 'Commercial 4-wheeler, private chauffeur, heavy transport, and delivery vehicle operations with verified licensing.',
    avgSalary: '₹20,000 - ₹32,000 / month'
  },
  cook: {
    title: 'Cook & Chef',
    category: 'Hospitality & Food Services',
    description: 'Restaurant kitchen chefs, commercial meal preparation, food safety compliance, and hotel catering staff.',
    avgSalary: '₹22,000 - ₹38,000 / month'
  },
  plumber: {
    title: 'Plumber',
    category: 'Plumbing & Sanitation',
    description: 'Water pipeline installation, industrial drainage, sanitary fixtures, and emergency leakage troubleshooting.',
    avgSalary: '₹18,000 - ₹30,000 / month'
  },
  welder: {
    title: 'Industrial Welder',
    category: 'Manufacturing & Fabrication',
    description: 'TIG/MIG welding, structural steel assembly, metal fabrication, and certified pressure equipment fabrication.',
    avgSalary: '₹24,000 - ₹40,000 / month'
  },
  security: {
    title: 'Security Guard',
    category: 'Facility & Security',
    description: 'Commercial facility surveillance, access gate control, visitor management, and perimeter physical safety.',
    avgSalary: '₹16,000 - ₹24,000 / month'
  },
  warehouse: {
    title: 'Warehouse & Logistics Staff',
    category: 'Logistics & Warehousing',
    description: 'Inventory handling, barcode sorting, dispatch packaging, loading, and distribution hub operations.',
    avgSalary: '₹18,000 - ₹28,000 / month'
  }
};

export interface ProgrammaticJobHubPageProps {
  city?: string;
  trade?: string;
}

export const ProgrammaticJobHubPage: React.FC<ProgrammaticJobHubPageProps> = ({
  city: propCity,
  trade: propTrade
}) => {
  const params = useParams<{ city?: string; trade?: string; cityOrSlug?: string }>();

  const rawCityParam = propCity || params.city || params.cityOrSlug || 'chennai';
  const rawTradeParam = propTrade || params.trade || '';

  // Parse and normalize city slug (e.g. 'sriperumbudur,-tamil-nadu' -> 'sriperumbudur', 'Tamil Nadu')
  const { citySlug, cityName, cityState } = useMemo(() => {
    const raw = (rawCityParam || 'chennai')
      .toLowerCase()
      .replace(/^jobs-in-/, '')
      .replace(/,/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim();

    const stateSuffixes: Record<string, string> = {
      'tamil-nadu': 'Tamil Nadu',
      'karnataka': 'Karnataka',
      'maharashtra': 'Maharashtra',
      'telangana': 'Telangana',
      'kerala': 'Kerala',
      'andhra-pradesh': 'Andhra Pradesh',
      'delhi': 'Delhi NCR',
    };

    let baseSlug = raw;
    let resolvedState = 'Tamil Nadu';

    for (const [suffix, stateName] of Object.entries(stateSuffixes)) {
      if (raw.endsWith(`-${suffix}`)) {
        baseSlug = raw.slice(0, -(suffix.length + 1));
        resolvedState = stateName;
        break;
      }
    }

    const formattedName = baseSlug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      citySlug: baseSlug || 'chennai',
      cityName: formattedName || 'Chennai',
      cityState: resolvedState,
    };
  }, [rawCityParam]);

  const tradeSlug = (rawTradeParam || '').toLowerCase().trim();

  const cityMeta = CITY_METADATA[citySlug] || {
    name: cityName,
    state: cityState,
    popularLocalities: ['Central', 'Industrial Estate', 'Suburban Zone'],
    topTrades: ['Electrician', 'Driver', 'Cook', 'Security Guard']
  };

  const tradeMeta = tradeSlug ? (TRADE_METADATA[tradeSlug] || {
    title: tradeSlug.charAt(0).toUpperCase() + tradeSlug.slice(1),
    category: 'Skilled Trade',
    description: `Verified job openings for ${tradeSlug} positions with transparent monthly compensation.`,
    avgSalary: '₹18,000 - ₹30,000 / month'
  }) : null;

  // Query jobs filtered by city and optional trade
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['programmaticJobHub', citySlug, tradeSlug],
    queryFn: () => searchService.searchJobs({
      city: cityMeta.name,
      q: tradeMeta ? tradeMeta.title : undefined,
    }),
    staleTime: 1000 * 60 * 5,
  });

  const pageTitle = tradeMeta 
    ? `${tradeMeta.title} Jobs in ${cityMeta.name} | Verified Openings - TrustHyre`
    : `Verified Skilled & Blue Collar Jobs in ${cityMeta.name} (${cityMeta.state}) - TrustHyre`;

  // Compute live average salary from active listings if available, otherwise display estimated range
  const salaryStats = useMemo(() => {
    const validSalaries = jobs
      .map((j: any) => Number(j.budget))
      .filter((s: number) => !isNaN(s) && s > 0);
    
    if (validSalaries.length > 0) {
      const avg = Math.round(validSalaries.reduce((a: number, b: number) => a + b, 0) / validSalaries.length);
      const min = Math.min(...validSalaries);
      const max = Math.max(...validSalaries);
      return {
        label: min === max ? `₹${min.toLocaleString('en-IN')}` : `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`,
        isLive: true,
      };
    }
    return {
      label: tradeMeta ? tradeMeta.avgSalary.split('/')[0].trim() : 'Market Rate',
      isLive: false,
    };
  }, [jobs, tradeMeta]);

  const metaDesc = tradeMeta
    ? `Apply to verified ${tradeMeta.title} vacancies in ${cityMeta.name}. ${salaryStats.isLive ? `Live pay range: ${salaryStats.label}.` : `Estimated pay: ${salaryStats.label}.`} Direct employer contact and verified worksite details on TrustHyre.`
    : `Browse verified trade, technician, and frontline job openings across ${cityMeta.name}, ${cityMeta.state}. Direct contact, verified pay rates, and instant application on TrustHyre.`;

  const canonicalPath = tradeMeta 
    ? `/jobs-in-${citySlug}/${tradeSlug}` 
    : `/jobs-in-${citySlug}`;

  // Structured Data (Schema.org ItemList for Rich Google Carousel)
  const itemListJsonLd = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: pageTitle,
      description: metaDesc,
      numberOfItems: jobs.length,
      itemListElement: jobs.map((job: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: job.title,
        url: `https://trusthyre.com${generateHierarchicalJobUrl(job)}`,
        item: {
          '@type': 'JobPosting',
          title: job.title,
          hiringOrganization: {
            '@type': 'Organization',
            name: job.employerName || job.employer_name || 'TrustHyre Verified Employer'
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: job.city || cityMeta.name,
              addressRegion: cityMeta.state,
              addressCountry: 'IN'
            }
          }
        }
      }))
    };
  }, [jobs, pageTitle, metaDesc, cityMeta]);

  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-20">
      <SeoHead
        title={pageTitle}
        description={metaDesc}
        canonicalPath={canonicalPath}
        jsonLd={[
          itemListJsonLd,
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Jobs', path: '/search' },
            { name: `Jobs in ${cityMeta.name}`, path: `/jobs-in-${citySlug}` },
            ...(tradeMeta ? [{ name: tradeMeta.title, path: `/jobs-in-${citySlug}/${tradeSlug}` }] : [])
          ])
        ]}
      />

      {/* Hero Content Section */}
      <div className="bg-[#0f2f63] text-white pt-10 pb-14 px-4 sm:px-6 lg:px-8 border-b border-[#1b3d7a]">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-blue-200">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/search" className="hover:text-white transition">Jobs</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to={`/jobs-in-${citySlug}`} className="hover:text-white transition">{cityMeta.name}</Link>
            {tradeMeta && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-white font-semibold">{tradeMeta.title}</span>
              </>
            )}
          </nav>

          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Worksite Directory
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {tradeMeta ? (
                <span>{tradeMeta.title} Jobs in <span className="text-[#38bdf8]">{cityMeta.name}</span></span>
              ) : (
                <span>Verified Skilled &amp; Frontline Jobs in <span className="text-[#38bdf8]">{cityMeta.name}</span></span>
              )}
            </h1>
            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
              {tradeMeta ? tradeMeta.description : `Discover vetted opportunities with direct employers across ${cityMeta.name}. Verified worksites, no agency middlemen, and transparent wage listings.`}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-blue-900/40 text-xs">
            <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
              <span className="text-blue-200 block">Verified Openings</span>
              <span className="text-lg font-bold text-white">{jobs.length} Active</span>
            </div>
            <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
              <span className="text-blue-200 block">{salaryStats.isLive ? 'Current Pay Range' : 'Estimated Pay Range'}</span>
              <span className="text-lg font-bold text-white">{salaryStats.label}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
              <span className="text-blue-200 block">Locality Hubs</span>
              <span className="text-lg font-bold text-white">{cityMeta.popularLocalities.length} Areas</span>
            </div>
            <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
              <span className="text-blue-200 block">Worksite Audit</span>
              <span className="text-lg font-bold text-emerald-400">Location Verified</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Job Listing Stream */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0a0a0a] flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#0f2f63]" />
              Active Verified Vacancies in {cityMeta.name} {tradeMeta ? `(${tradeMeta.title})` : ''}
            </h2>
            <span className="text-xs text-[#5a6270] font-medium">Showing {jobs.length} jobs</span>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center">
              <AppLoader message={`Loading active verified jobs in ${cityMeta.name}...`} />
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white border border-[#e2e4e9] rounded-2xl p-10 text-center space-y-4">
              <MapPin className="w-12 h-12 text-[#99a0ae] mx-auto" />
              <h3 className="text-base font-bold text-[#0a0a0a]">No direct vacancies right now</h3>
              <p className="text-sm text-[#5a6270] max-w-md mx-auto">
                We are currently auditing new employers in {cityMeta.name}. You can explore all open positions across the platform or set a free job alert.
              </p>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f2f63] text-white rounded-full text-xs font-bold hover:bg-[#0c254e] transition"
              >
                Browse All Openings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job: any) => (
                <JobSearchResultCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>

        {/* SEO Sidebar: Internal Linking Clusters & Localities */}
        <div className="space-y-6">
          {/* Popular Localities in City */}
          <div className="bg-white border border-[#e2e4e9] rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#0a0a0a] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0f2f63]" />
              Key Localities in {cityMeta.name}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {cityMeta.popularLocalities.map((loc) => (
                <Link
                  key={loc}
                  to={`/search?city=${encodeURIComponent(cityMeta.name)}&q=${encodeURIComponent(loc)}`}
                  className="px-2.5 py-1 bg-[#f4f5f7] hover:bg-[#e2e4e9] text-[#2e333d] rounded-full text-xs font-medium transition"
                >
                  {loc}
                </Link>
              ))}
            </div>
          </div>

          {/* Top Trade Categories in City */}
          <div className="bg-white border border-[#e2e4e9] rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#0a0a0a] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0f2f63]" />
              Explore Trades in {cityMeta.name}
            </h3>
            <div className="space-y-2">
              {Object.entries(TRADE_METADATA).map(([slug, meta]) => {
                const isActive = tradeSlug === slug;
                return (
                  <Link
                    key={slug}
                    to={`/jobs-in-${citySlug}/${slug}`}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium transition ${
                      isActive 
                        ? 'bg-[#0f2f63] text-white font-bold' 
                        : 'text-[#2e333d] hover:bg-[#f4f5f7]'
                    }`}
                  >
                    <span>{meta.title}</span>
                    <span className={isActive ? 'text-blue-200 text-[10px]' : 'text-[#868c98] text-[10px]'}>
                      {meta.avgSalary.split('/')[0]}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Other Metros */}
          <div className="bg-white border border-[#e2e4e9] rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#0a0a0a] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0f2f63]" />
              Other Major Hubs
            </h3>
            <div className="space-y-1.5">
              {Object.entries(CITY_METADATA)
                .filter(([c]) => c !== citySlug)
                .slice(0, 5)
                .map(([c, meta]) => (
                  <Link
                    key={c}
                    to={`/jobs-in-${c}`}
                    className="block text-xs text-[#5a6270] hover:text-[#0f2f63] hover:underline py-1"
                  >
                    Jobs in {meta.name}, {meta.state}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgrammaticJobHubPage;
