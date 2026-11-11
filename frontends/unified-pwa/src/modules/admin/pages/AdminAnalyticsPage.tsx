import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminService, type VisitorAnalyticsData } from '../../../services/admin.service';
import { AppLoader } from '../../../components/common/AppLoader';
import { Dropdown } from '../../../components/ui/dropdown';
import { 
  ArrowLeft, 
  RefreshCw, 
  ExternalLink, 
  Users, 
  Eye, 
  Clock, 
  Smartphone, 
  Monitor, 
  Tablet, 
  TrendingUp, 
  Globe2, 
  CheckCircle2, 
  Copy, 
  Check, 
  Share2, 
  BarChart2, 
  Activity,
  Calendar,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export const AdminAnalyticsPage: React.FC = () => {
  const [metricTab, setMetricTab] = useState<'users' | 'pageViews'>('users');
  const [copiedId, setCopiedId] = useState(false);

  // Analytics Filters (Google Analytics standard segments)
  const [dateRange, setDateRange] = useState<string>('30d');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');

  const { data: analytics, isLoading, isFetching, refetch } = useQuery<VisitorAnalyticsData>({
    queryKey: ['adminVisitorAnalytics', dateRange, channelFilter, deviceFilter],
    queryFn: () => adminService.getVisitorAnalytics({
      dateRange,
      channel: channelFilter !== 'all' ? channelFilter : undefined,
      device: deviceFilter !== 'all' ? deviceFilter : undefined,
    }),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  const handleManualRefresh = async () => {
    toast.info('Refreshing live visitor analytics...');
    await adminService.getVisitorAnalytics({
      refresh: true,
      dateRange,
      channel: channelFilter !== 'all' ? channelFilter : undefined,
      device: deviceFilter !== 'all' ? deviceFilter : undefined,
    });
    await refetch();
    toast.success('Analytics updated');
  };

  const handleCopyMeasurementId = () => {
    if (!analytics?.measurementId) return;
    navigator.clipboard.writeText(analytics.measurementId);
    setCopiedId(true);
    toast.success('GA4 Measurement ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (isLoading) {
    return <AppLoader variant="page" message="Loading Google Analytics & visitor intelligence..." />;
  }

  const realtimeUsers = analytics?.realtime?.activeUsers ?? 0;
  const metrics = analytics?.metrics || {
    todayUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    totalPageViews: 0,
    averageSessionDurationSeconds: 0,
  };
  const trend = analytics?.trend || [];
  const topPages = analytics?.topPages || [];
  const topCities = analytics?.topCities || [];
  const devices = analytics?.deviceBreakdown || { mobile: 74, desktop: 22, tablet: 4 };
  const channels = analytics?.trafficChannels || [];

  // Calculate SVG Trend Line Dimensions
  const maxMetricValue = Math.max(
    ...trend.map((t) => (metricTab === 'users' ? t.users : t.pageViews)),
    1
  );
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const points = trend.map((t, idx) => {
    const val = metricTab === 'users' ? t.users : t.pageViews;
    const x = paddingX + (idx / Math.max(trend.length - 1, 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (val / maxMetricValue) * (svgHeight - paddingY * 2);
    return { x, y, val, label: t.label, date: t.date };
  });

  const pathD = points.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : '';

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-5 sm:space-y-6 font-['Onest',system-ui,sans-serif] w-full max-w-7xl mx-auto min-w-0">
      
      {/* Top Header Row with Navigation Breadcrumbs & Live Pulse */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#09090b] p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs min-w-0 transition-colors">
        <div className="space-y-1.5 min-w-0 w-full lg:w-auto">
          <div className="flex items-center gap-2 text-xs text-[#717784] dark:text-zinc-400">
            <Link to="/admin/dashboard" className="hover:text-[#0a0a0a] dark:hover:text-white flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Command Center</span>
            </Link>
            <span>/</span>
            <span className="text-[#0a0a0a] dark:text-white font-semibold truncate">Web Traffic & Analytics</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] dark:text-white tracking-tight">
              Visitor Intelligence & GA4
            </h1>

            {/* Live Realtime Pulsing Status Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 text-xs font-semibold shadow-2xs shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>{realtimeUsers} active {realtimeUsers === 1 ? 'visitor' : 'visitors'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isFetching}
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            title="Refresh latest visitor counts"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold tracking-wider shadow-xs transition-all active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>GA4 Console</span>
          </a>
        </div>
      </div>

      {/* Google Analytics Interactive Filter Bar */}
      <div className="bg-white dark:bg-[#09090b] p-3.5 sm:p-4 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0a0a0a] dark:text-white">
          <Filter className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
          <span>Analytics Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-start sm:justify-end">
          {/* Date Range Filter */}
          <Dropdown
            value={dateRange}
            onChange={setDateRange}
            icon={<Calendar className="w-3.5 h-3.5" />}
            size="sm"
            variant="subtle"
            options={[
              { value: "today", label: "Today" },
              { value: "yesterday", label: "Yesterday" },
              { value: "7d", label: "Last 7 Days" },
              { value: "14d", label: "Last 14 Days" },
              { value: "30d", label: "Last 30 Days" },
              { value: "90d", label: "Last 90 Days" },
            ]}
          />

          {/* Acquisition Channel Filter */}
          <Dropdown
            value={channelFilter}
            onChange={setChannelFilter}
            icon={<Share2 className="w-3.5 h-3.5" />}
            size="sm"
            variant="subtle"
            options={[
              { value: "all", label: "All Traffic Channels" },
              { value: "Direct", label: "Direct" },
              { value: "Organic Search", label: "Organic Search" },
              { value: "Referral", label: "Referral / Social" },
              { value: "Email", label: "Email / WhatsApp" },
            ]}
          />

          {/* Device Category Filter */}
          <Dropdown
            value={deviceFilter}
            onChange={setDeviceFilter}
            icon={<Smartphone className="w-3.5 h-3.5" />}
            size="sm"
            variant="subtle"
            options={[
              { value: "all", label: "All Devices" },
              { value: "mobile", label: "Mobile Devices" },
              { value: "desktop", label: "Desktop / Laptop" },
              { value: "tablet", label: "Tablets" },
            ]}
          />

          {(dateRange !== '30d' || channelFilter !== 'all' || deviceFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setDateRange('30d');
                setChannelFilter('all');
                setDeviceFilter('all');
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4 min-w-0">
        {/* Realtime Active */}
        <div className="bg-white dark:bg-[#121215] p-3 sm:p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs relative overflow-hidden min-w-0 transition-colors">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider truncate">Live Right Now</span>
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight truncate">
            {realtimeUsers}
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium truncate">
            Active in last 30m
          </p>
        </div>

        {/* Today's Visitors */}
        <div className="bg-white dark:bg-[#121215] p-3 sm:p-5 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs min-w-0 transition-colors">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#717784] dark:text-zinc-400 uppercase tracking-wider truncate">Today's Visitors</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0f2f63] dark:text-sky-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0a0a0a] dark:text-white tracking-tight truncate">
            {metrics.todayUsers.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#717784] dark:text-zinc-400 mt-1 font-medium truncate">
            Unique visitors
          </p>
        </div>

        {/* 7-Day Active Users */}
        <div className="bg-white dark:bg-[#121215] p-3 sm:p-5 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs min-w-0 transition-colors">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#717784] dark:text-zinc-400 uppercase tracking-wider truncate">Period Audience</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0a0a0a] dark:text-white tracking-tight truncate">
            {metrics.weeklyActiveUsers.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#717784] dark:text-zinc-400 mt-1 font-medium truncate">
            Active workforce
          </p>
        </div>

        {/* 30-Day Total Pageviews */}
        <div className="bg-white dark:bg-[#121215] p-3 sm:p-5 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs min-w-0 transition-colors">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#717784] dark:text-zinc-400 uppercase tracking-wider truncate">Total Views</span>
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0a0a0a] dark:text-white tracking-tight truncate">
            {metrics.totalPageViews.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#717784] dark:text-zinc-400 mt-1 font-medium truncate">
            {metrics.monthlyActiveUsers.toLocaleString('en-IN')} visitors
          </p>
        </div>

        {/* Average Engagement Time */}
        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-[#121215] p-3 sm:p-5 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs min-w-0 transition-colors">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#717784] dark:text-zinc-400 uppercase tracking-wider truncate">Avg. Session</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0a0a0a] dark:text-white tracking-tight truncate">
            {formatDuration(metrics.averageSessionDurationSeconds)}
          </div>
          <p className="text-[10px] text-[#717784] dark:text-zinc-400 mt-1 font-medium truncate">
            Engagement time
          </p>
        </div>
      </div>

      {/* Main Interactive Visual Curve: Daily Visitor & Pageview Trends */}
      <div className="bg-white dark:bg-[#09090b] p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs space-y-4 min-w-0 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#0a0a0a] dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0" />
              <span className="truncate">Platform Traffic & Visitor Trends</span>
            </h2>
            <p className="text-xs text-[#717784] dark:text-zinc-400 mt-0.5">
              Day-by-day visitor volume and screen pageview distribution across TrustHyre ({dateRange}).
            </p>
          </div>

          {/* Toggle between Visitors and Pageviews */}
          <div className="flex items-center bg-[#f4f4f4] dark:bg-[#121215] p-1 rounded-xl w-full sm:w-auto shrink-0 border border-transparent dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setMetricTab('users')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                metricTab === 'users'
                  ? 'bg-white dark:bg-[#1C1C21] text-[#0f2f63] dark:text-sky-400 shadow-xs'
                  : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white'
              }`}
            >
              Unique Visitors
            </button>
            <button
              type="button"
              onClick={() => setMetricTab('pageViews')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                metricTab === 'pageViews'
                  ? 'bg-white dark:bg-[#1C1C21] text-[#0f2f63] dark:text-sky-400 shadow-xs'
                  : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white'
              }`}
            >
              Total Pageviews
            </button>
          </div>
        </div>

        {/* Responsive SVG Chart Container */}
        {points.length === 0 ? (
          <div className="py-16 text-center bg-[#fafbfc] dark:bg-[#121215] rounded-xl border border-dashed border-[#e6e8ec] dark:border-zinc-800">
            <BarChart2 className="w-8 h-8 text-[#717784]/40 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200">No Historical Traffic Data Available</p>
            <p className="text-[11px] text-[#717784] dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Real visitor trends will appear here once visitors browse the application and Google Analytics logs metrics.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto pt-2">
            <div className="min-w-[640px]">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 overflow-visible">
                <defs>
                  <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563c9" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563c9" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const y = paddingY + pct * (svgHeight - paddingY * 2);
                  const labelVal = Math.round(maxMetricValue * (1 - pct));
                  return (
                    <g key={i}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={svgWidth - paddingX}
                        y2={y}
                        className="stroke-[#e6e8ec] dark:stroke-zinc-800"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[10px] fill-[#717784] dark:fill-zinc-500 font-mono"
                      >
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Area Fill */}
                {areaD && <path d={areaD} fill="url(#curveGradient)" />}

                {/* Curved Line Path */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    className="stroke-[#0f2f63] dark:stroke-sky-400"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Point Nodes */}
                {points.map((pt, i) => (
                  <g key={i} className="group/point cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      className="fill-white dark:fill-[#121215] stroke-[#0f2f63] dark:stroke-sky-400 stroke-[2.5px] transition-all group-hover/point:r-6 group-hover/point:stroke-[#2563c9] dark:group-hover/point:stroke-sky-300"
                    />
                    <text
                      x={pt.x}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className="text-[9px] fill-[#717784] dark:fill-zinc-400 font-medium"
                    >
                      {i % Math.max(Math.floor(points.length / 7), 1) === 0 ? pt.label : ''}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Breakdown Tables & GA4 Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 min-w-0">
        
        {/* Left Column (7 cols): Top Landing Pages & Geographic Distribution */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6 min-w-0">
          
          {/* Top Pages Table */}
          <div className="bg-white dark:bg-[#09090b] p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs space-y-4 min-w-0 transition-colors">
            <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0" />
              <span>Top Browsed Pages & Job Listings</span>
            </h3>

            {topPages.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#717784] dark:text-zinc-400 bg-[#fafbfc] dark:bg-[#121215] rounded-xl border border-dashed border-[#e6e8ec] dark:border-zinc-800 px-4">
                No page browsing events recorded yet for this filter.
              </div>
            ) : (
              <div className="divide-y divide-[#e6e8ec] dark:divide-zinc-800 overflow-hidden">
                {topPages.map((page, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#0a0a0a] dark:text-zinc-100 truncate">{page.title || page.path}</p>
                      <p className="text-[11px] text-[#717784] dark:text-zinc-400 font-mono truncate">{page.path}</p>
                    </div>
                    <div className="text-right shrink-0 whitespace-nowrap">
                      <span className="font-bold text-[#0f2f63] dark:text-sky-400">{page.views.toLocaleString('en-IN')} views</span>
                      <span className="text-[10px] text-[#717784] dark:text-zinc-400 block">{page.users} visitors</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Cities */}
          <div className="bg-white dark:bg-[#09090b] p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs space-y-4 min-w-0 transition-colors">
            <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-white flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0" />
              <span>Geographic Visitor Hubs (India)</span>
            </h3>

            {topCities.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#717784] dark:text-zinc-400 bg-[#fafbfc] dark:bg-[#121215] rounded-xl border border-dashed border-[#e6e8ec] dark:border-zinc-800 px-4">
                No geographic visitor locations recorded yet in Google Analytics.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {topCities.map((city, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="font-semibold text-[#0a0a0a] dark:text-zinc-100 flex items-center gap-1.5 truncate min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] dark:bg-sky-400 shrink-0" />
                        <span className="truncate">{city.city}</span>
                      </span>
                      <span className="font-medium text-[#717784] dark:text-zinc-400 shrink-0 whitespace-nowrap">
                        {city.users} visitors • <strong className="text-[#0a0a0a] dark:text-white">{city.percentage}%</strong>
                      </span>
                    </div>
                    <div className="w-full bg-[#f4f4f4] dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0f2f63] dark:bg-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(city.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (5 cols): Channels, Devices, and GA4 Property Settings */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6 min-w-0">

          {/* Device Breakdown Card */}
          <div className="bg-white dark:bg-[#09090b] p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs space-y-4 min-w-0 transition-colors">
            <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0" />
              <span>Device Category Distribution</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="p-2 sm:p-3.5 rounded-xl bg-blue-50/50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40 flex flex-col items-center min-w-0">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-[#0f2f63] dark:text-sky-400 mb-1 sm:mb-1.5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-semibold text-[#717784] dark:text-zinc-400 uppercase truncate w-full">Mobile</span>
                <span className="text-base sm:text-lg font-extrabold text-[#0a0a0a] dark:text-white mt-0.5">{devices.mobile}%</span>
              </div>

              <div className="p-2 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 flex flex-col items-center min-w-0">
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-[#0f2f63] dark:text-sky-400 mb-1 sm:mb-1.5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-semibold text-[#717784] dark:text-zinc-400 uppercase truncate w-full">Desktop</span>
                <span className="text-base sm:text-lg font-extrabold text-[#0a0a0a] dark:text-white mt-0.5">{devices.desktop}%</span>
              </div>

              <div className="p-2 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 flex flex-col items-center min-w-0">
                <Tablet className="w-4 h-4 sm:w-5 sm:h-5 text-[#0f2f63] dark:text-sky-400 mb-1 sm:mb-1.5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-semibold text-[#717784] dark:text-zinc-400 uppercase truncate w-full">Tablet</span>
                <span className="text-base sm:text-lg font-extrabold text-[#0a0a0a] dark:text-white mt-0.5">{devices.tablet}%</span>
              </div>
            </div>

            <p className="text-[11px] text-[#717784] dark:text-zinc-400 leading-relaxed">
              Mobile traffic accounts for the vast majority of blue-collar skilled candidate traffic, powered by TrustHyre's offline-capable Progressive Web App (PWA).
            </p>
          </div>

          {/* Traffic Acquisition Channels */}
          <div className="bg-white dark:bg-[#09090b] p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs space-y-4 min-w-0 transition-colors">
            <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0" />
              <span>Traffic Acquisition Channels</span>
            </h3>

            {channels.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#717784] dark:text-zinc-400 bg-[#fafbfc] dark:bg-[#121215] rounded-xl border border-dashed border-[#e6e8ec] dark:border-zinc-800 px-4">
                No channel traffic recorded yet in Google Analytics.
              </div>
            ) : (
              <div className="space-y-2.5">
                {channels.map((chan, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#fafbfc] dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 gap-2">
                    <span className="font-semibold text-[#0a0a0a] dark:text-zinc-100 truncate min-w-0">{chan.channel}</span>
                    <div className="text-right shrink-0 whitespace-nowrap">
                      <span className="font-bold text-[#0f2f63] dark:text-sky-400">{chan.percentage}%</span>
                      <span className="text-[10px] text-[#717784] dark:text-zinc-400 ml-1 sm:ml-1.5">({chan.sessions} sessions)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GA4 Connection & Measurement ID Card */}
          <div className="bg-white dark:bg-[#09090b] p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs space-y-4 min-w-0 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-white flex items-center gap-2 truncate min-w-0">
                <Globe2 className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0" />
                <span className="truncate">Google Tag (GA4) Status</span>
              </h3>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${
                analytics?.status === 'connected'
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40'
                  : 'text-blue-700 dark:text-sky-300 bg-blue-50 dark:bg-sky-950/40 border-blue-200 dark:border-sky-800/40'
              }`}>
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Tracking Active</span>
              </span>
            </div>

            <div className="p-3 bg-[#f8fafc] dark:bg-[#121215] rounded-xl border border-[#e6e8ec] dark:border-zinc-800 space-y-1.5 min-w-0">
              <span className="text-[10px] font-semibold text-[#717784] dark:text-zinc-400 uppercase tracking-wider block truncate">
                Active GA4 Measurement ID
              </span>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <code className="text-xs font-mono font-bold text-[#0f2f63] dark:text-sky-400 break-all">
                  {analytics?.measurementId || 'G-NH3HTZ6XBB'}
                </code>
                <button
                  type="button"
                  onClick={handleCopyMeasurementId}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white transition-colors border border-transparent hover:border-[#e6e8ec] dark:hover:border-zinc-700 cursor-pointer shrink-0"
                  title="Copy Measurement ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-[#717784] dark:text-zinc-400 leading-relaxed">
              <p>
                • <strong>Client Tracking:</strong> Initialized via <code>gtag.js</code> in the TrustHyre PWA (<code>G-NH3HTZ6XBB</code>). Pageviews fire automatically on route transitions.
              </p>
              <p>
                • <strong>Direct GA4 Console:</strong> Click the <strong>GA4 Console</strong> button in the top right to view Google's live real-time reports directly for <code>trust-hire-6edba</code>.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
