import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminService, type VisitorAnalyticsData } from '../../../services/admin.service';
import { AppLoader } from '../../../components/common/AppLoader';
import { 
  ArrowLeft, 
  RefreshCw, 
  ExternalLink, 
  Users, 
  Eye, 
  Clock, 
  MapPin, 
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
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

export const AdminAnalyticsPage: React.FC = () => {
  const [metricTab, setMetricTab] = useState<'users' | 'pageViews'>('users');
  const [copiedId, setCopiedId] = useState(false);

  const { data: analytics, isLoading, isFetching, refetch } = useQuery<VisitorAnalyticsData>({
    queryKey: ['adminVisitorAnalytics'],
    queryFn: () => adminService.getVisitorAnalytics(false),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 30 * 1000, // Background refresh every 30 seconds for live pulse
  });

  const handleManualRefresh = async () => {
    toast.info('Refreshing live visitor analytics...');
    await adminService.getVisitorAnalytics(true);
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
  const devices = analytics?.deviceBreakdown || { mobile: 0, desktop: 0, tablet: 0 };
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] shadow-xs min-w-0">
        <div className="space-y-1.5 min-w-0 w-full lg:w-auto">
          <div className="flex items-center gap-2 text-xs text-[#717784]">
            <Link to="/admin/dashboard" className="hover:text-[#0a0a0a] flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Command Center</span>
            </Link>
            <span>/</span>
            <span className="text-[#0a0a0a] font-semibold truncate">Web Traffic & Analytics</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] tracking-tight">
              Visitor Intelligence & GA4
            </h1>

            {/* Live Realtime Pulsing Status Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-2xs shrink-0">
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
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#e6e8ec] hover:bg-[#f4f4f4] text-xs font-semibold text-[#0a0a0a] shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            title="Refresh latest visitor counts"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0f2f63] ${isFetching ? 'animate-spin' : ''}`} />
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4 min-w-0">
        {/* Realtime Active */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 uppercase tracking-wider truncate">Live Right Now</span>
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-700 tracking-tight truncate">
            {realtimeUsers}
          </div>
          <p className="text-[10px] text-emerald-600 mt-1 font-medium truncate">
            Active in last 30m
          </p>
        </div>

        {/* Today's Visitors */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-[#e6e8ec] shadow-xs min-w-0">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#717784] uppercase tracking-wider truncate">Today's Visitors</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0f2f63] shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0a0a0a] tracking-tight truncate">
            {metrics.todayUsers.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#717784] mt-1 font-medium truncate">
            Unique visitors
          </p>
        </div>

        {/* 7-Day Active Users */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-[#e6e8ec] shadow-xs min-w-0">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#717784] uppercase tracking-wider truncate">7-Day Audience</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0a0a0a] tracking-tight truncate">
            {metrics.weeklyActiveUsers.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#717784] mt-1 font-medium truncate">
            Active workforce
          </p>
        </div>

        {/* 30-Day Total Pageviews */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-[#e6e8ec] shadow-xs min-w-0">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#717784] uppercase tracking-wider truncate">Monthly Views</span>
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0a0a0a] tracking-tight truncate">
            {metrics.totalPageViews.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#717784] mt-1 font-medium truncate">
            {metrics.monthlyActiveUsers.toLocaleString('en-IN')} visitors
          </p>
        </div>

        {/* Average Engagement Time */}
        <div className="col-span-2 lg:col-span-1 bg-white p-3 sm:p-5 rounded-2xl border border-[#e6e8ec] shadow-xs min-w-0">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#717784] uppercase tracking-wider truncate">Avg. Session</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0a0a0a] tracking-tight truncate">
            {formatDuration(metrics.averageSessionDurationSeconds)}
          </div>
          <p className="text-[10px] text-[#717784] mt-1 font-medium truncate">
            Engagement time
          </p>
        </div>
      </div>

      {/* Main Interactive Visual Curve: Daily Visitor & Pageview Trends */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#0a0a0a] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#0f2f63] shrink-0" />
              <span className="truncate">Platform Traffic & Visitor Trends</span>
            </h2>
            <p className="text-xs text-[#717784] mt-0.5">
              Day-by-day visitor volume and screen pageview distribution across TrustHyre.
            </p>
          </div>

          {/* Toggle between Visitors and Pageviews */}
          <div className="flex items-center bg-[#f4f4f4] p-1 rounded-xl w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setMetricTab('users')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                metricTab === 'users'
                  ? 'bg-white text-[#0f2f63] shadow-xs'
                  : 'text-[#717784] hover:text-[#0a0a0a]'
              }`}
            >
              Unique Visitors
            </button>
            <button
              type="button"
              onClick={() => setMetricTab('pageViews')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                metricTab === 'pageViews'
                  ? 'bg-white text-[#0f2f63] shadow-xs'
                  : 'text-[#717784] hover:text-[#0a0a0a]'
              }`}
            >
              Total Pageviews
            </button>
          </div>
        </div>

        {/* Responsive SVG Chart Container */}
        {points.length === 0 ? (
          <div className="py-16 text-center bg-[#fafbfc] rounded-xl border border-dashed border-[#e6e8ec]">
            <BarChart2 className="w-8 h-8 text-[#717784]/40 mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#0a0a0a]">No Historical Traffic Data Available</p>
            <p className="text-[11px] text-[#717784] mt-1 max-w-sm mx-auto">
              Real visitor trends will appear here once visitors browse the application and Google Analytics logs daily metrics.
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
                        stroke="#e6e8ec"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[10px] fill-[#717784] font-mono"
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
                    stroke="#0f2f63"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Point Nodes */}
                {points.map((pt, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill="#ffffff"
                      stroke="#0f2f63"
                      strokeWidth="2"
                      className="transition-transform group-hover:scale-125"
                    />
                    {/* Point Value Tooltip on Node */}
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-[#0a0a0a] opacity-80 group-hover:opacity-100"
                    >
                      {pt.val}
                    </text>
                    {/* Bottom Date Label */}
                    <text
                      x={pt.x}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className="text-[10px] font-medium fill-[#717784]"
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Two-Column Deep-Dive Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Top Pages & Geographic Indian Cities */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6 min-w-0">
          
          {/* Top Pages Table */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#0a0a0a] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0f2f63] shrink-0" />
                  <span className="truncate">Top Visited Pages & Articles</span>
                </h3>
                <p className="text-xs text-[#717784] mt-0.5">Most viewed destinations across the TrustHyre web application.</p>
              </div>
            </div>

            {topPages.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#717784] bg-[#fafbfc] rounded-xl border border-dashed border-[#e6e8ec] px-4">
                No pageview records reported by Google Analytics yet.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full text-left text-xs min-w-[300px]">
                  <thead>
                    <tr className="border-b border-[#e6e8ec] text-[#717784] font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-2.5">Page Path & Content</th>
                      <th className="pb-2.5 text-right">Views</th>
                      <th className="pb-2.5 text-right">Unique Visitors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6e8ec]/60">
                    {topPages.map((page, idx) => (
                      <tr key={idx} className="hover:bg-[#fafbfc] transition-colors">
                        <td className="py-3 pr-2 min-w-0">
                          <div className="font-semibold text-[#0a0a0a] truncate max-w-[150px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
                            {page.title}
                          </div>
                          <div className="font-mono text-[10px] text-[#2563c9] mt-0.5 truncate max-w-[150px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
                            {page.path}
                          </div>
                        </td>
                        <td className="py-3 text-right font-bold text-[#0a0a0a] whitespace-nowrap">
                          {page.views.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-right font-medium text-[#717784] whitespace-nowrap">
                          {page.users.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Indian Cities Breakdown */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#0a0a0a] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0f2f63] shrink-0" />
                  <span className="truncate">Geographic Distribution (Cities)</span>
                </h3>
                <p className="text-xs text-[#717784] mt-0.5">Visitor concentration across major industrial & hiring hubs.</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-emerald-200 shrink-0 whitespace-nowrap">
                All-India Network
              </span>
            </div>

            {topCities.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#717784] bg-[#fafbfc] rounded-xl border border-dashed border-[#e6e8ec] px-4">
                No geographic visitor locations recorded yet in Google Analytics.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {topCities.map((city, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="font-semibold text-[#0a0a0a] flex items-center gap-1.5 truncate min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] shrink-0" />
                        <span className="truncate">{city.city}</span>
                      </span>
                      <span className="font-medium text-[#717784] shrink-0 whitespace-nowrap">
                        {city.users} visitors • <strong className="text-[#0a0a0a]">{city.percentage}%</strong>
                      </span>
                    </div>
                    <div className="w-full bg-[#f4f4f4] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0f2f63] h-full rounded-full transition-all duration-500"
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
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-4 min-w-0">
            <h3 className="text-sm font-bold text-[#0a0a0a] flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#0f2f63] shrink-0" />
              <span>Device Category Distribution</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="p-2 sm:p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col items-center min-w-0">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-[#0f2f63] mb-1 sm:mb-1.5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-semibold text-[#717784] uppercase truncate w-full">Mobile</span>
                <span className="text-base sm:text-lg font-extrabold text-[#0a0a0a] mt-0.5">{devices.mobile}%</span>
              </div>

              <div className="p-2 sm:p-3.5 rounded-xl bg-slate-50 border border-[#e6e8ec] flex flex-col items-center min-w-0">
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-[#0f2f63] mb-1 sm:mb-1.5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-semibold text-[#717784] uppercase truncate w-full">Desktop</span>
                <span className="text-base sm:text-lg font-extrabold text-[#0a0a0a] mt-0.5">{devices.desktop}%</span>
              </div>

              <div className="p-2 sm:p-3.5 rounded-xl bg-slate-50 border border-[#e6e8ec] flex flex-col items-center min-w-0">
                <Tablet className="w-4 h-4 sm:w-5 sm:h-5 text-[#0f2f63] mb-1 sm:mb-1.5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-semibold text-[#717784] uppercase truncate w-full">Tablet</span>
                <span className="text-base sm:text-lg font-extrabold text-[#0a0a0a] mt-0.5">{devices.tablet}%</span>
              </div>
            </div>

            <p className="text-[11px] text-[#717784] leading-relaxed">
              Mobile traffic accounts for the vast majority of blue-collar skilled candidate traffic, powered by TrustHyre's offline-capable Progressive Web App (PWA).
            </p>
          </div>

          {/* Traffic Acquisition Channels */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-4 min-w-0">
            <h3 className="text-sm font-bold text-[#0a0a0a] flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#0f2f63] shrink-0" />
              <span>Traffic Acquisition Channels</span>
            </h3>

            {channels.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#717784] bg-[#fafbfc] rounded-xl border border-dashed border-[#e6e8ec] px-4">
                No channel traffic recorded yet in Google Analytics.
              </div>
            ) : (
              <div className="space-y-2.5">
                {channels.map((chan, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#fafbfc] border border-[#e6e8ec] gap-2">
                    <span className="font-semibold text-[#0a0a0a] truncate min-w-0">{chan.channel}</span>
                    <div className="text-right shrink-0 whitespace-nowrap">
                      <span className="font-bold text-[#0f2f63]">{chan.percentage}%</span>
                      <span className="text-[10px] text-[#717784] ml-1 sm:ml-1.5">({chan.sessions} sessions)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GA4 Connection & Measurement ID Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#0a0a0a] flex items-center gap-2 truncate min-w-0">
                <Globe2 className="w-4 h-4 text-[#0f2f63] shrink-0" />
                <span className="truncate">Google Tag (GA4) Status</span>
              </h3>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${
                analytics?.status === 'connected'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : analytics?.status === 'error'
                  ? 'text-rose-700 bg-rose-50 border-rose-200'
                  : 'text-blue-700 bg-blue-50 border-blue-200'
              }`}>
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{analytics?.status === 'connected' ? 'GA4 Data API Live' : 'Tracking Active'}</span>
              </span>
            </div>

            <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e6e8ec] space-y-1.5 min-w-0">
              <span className="text-[10px] font-semibold text-[#717784] uppercase tracking-wider block truncate">
                Active GA4 Measurement ID
              </span>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <code className="text-xs font-mono font-bold text-[#0f2f63] break-all">
                  {analytics?.measurementId || 'G-NH3HTZ6XBB'}
                </code>
                <button
                  type="button"
                  onClick={handleCopyMeasurementId}
                  className="p-1.5 rounded-lg hover:bg-white text-[#717784] hover:text-[#0a0a0a] transition-colors border border-transparent hover:border-[#e6e8ec] cursor-pointer shrink-0"
                  title="Copy Measurement ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-[#717784] leading-relaxed">
              <p>
                • <strong>Client Tracking:</strong> Initialized via <code>gtag.js</code> in the TrustHyre PWA. Pageviews fire dynamically on every client-side route change with 0 artificial data.
              </p>
              <p>
                • <strong>Admin Privacy:</strong> Visits inside <code>/admin/*</code> routes are flagged as internal staff to prevent skewing visitor metrics.
              </p>
              {analytics?.status === 'not_configured' && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] space-y-1 mt-2">
                  <span className="font-bold block">Optional Server-to-Server Sync:</span>
                  <p>
                    Client tracking is actively recording to GA4. To pull live GA4 numbers directly into this page, add your GA4 Property ID as <code>GA_PROPERTY_ID</code> in <code>node-backend/.env</code> and give Viewer access to your Service Account in GA4 Property Access Management.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
