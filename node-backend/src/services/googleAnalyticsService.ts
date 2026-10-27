import jwt from 'jsonwebtoken';

export interface VisitorAnalyticsOverview {
  status: 'connected' | 'not_configured' | 'error';
  errorMessage?: string;
  measurementId: string;
  propertyId?: string;
  realtime: {
    activeUsers: number;
    lastUpdated: string;
  };
  metrics: {
    todayUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    totalPageViews: number;
    averageSessionDurationSeconds: number;
  };
  trend: Array<{
    date: string;
    label: string;
    users: number;
    pageViews: number;
  }>;
  topPages: Array<{
    path: string;
    title: string;
    views: number;
    users: number;
  }>;
  topCities: Array<{
    city: string;
    state?: string;
    users: number;
    percentage: number;
  }>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  trafficChannels: Array<{
    channel: string;
    sessions: number;
    percentage: number;
  }>;
  setupInstructions?: {
    isConfigured: boolean;
    serviceAccountEmail?: string;
    missingEnvVars: string[];
    helpUrl: string;
  };
}

interface CacheEntry {
  data: VisitorAnalyticsOverview;
  cachedAt: number;
}

// 2-minute cache to respect Google API quotas while keeping metrics fresh
const CACHE_TTL_MS = 2 * 60 * 1000;
let memoryCache: CacheEntry | null = null;

/**
 * Obtain Google OAuth2 Access Token for Google Analytics Data API using Service Account
 */
const getGoogleAccessToken = async (clientEmail: string, privateKey: string): Promise<string | null> => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // Format private key if escaped newlines exist
    const formattedKey = privateKey.replace(/\\n/g, '\n');
    const signedJwt = jwt.sign(tokenPayload, formattedKey, { algorithm: 'RS256' });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedJwt,
      }),
    });

    if (!response.ok) {
      console.warn('Google OAuth token request failed:', await response.text());
      return null;
    }

    const data: any = await response.json();
    return data.access_token || null;
  } catch (err: any) {
    console.warn('getGoogleAccessToken error:', err.message);
    return null;
  }
};

/**
 * Generic query helper for GA4 Data API runReport
 */
const queryGA4Report = async (propertyId: string, accessToken: string, body: Record<string, any>) => {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`GA4 runReport failed (${response.status}):`, errText);
    return null;
  }
  return response.json();
};

/**
 * Query GA4 Realtime Active Users
 */
const queryGA4Realtime = async (propertyId: string, accessToken: string) => {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      metrics: [{ name: 'activeUsers' }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`GA4 runRealtimeReport failed (${response.status}):`, errText);
    return null;
  }
  return response.json();
};

export const GoogleAnalyticsService = {
  /**
   * Fetch genuine real visitor metrics from Google Analytics 4 Data API.
   * If credentials are not yet supplied, returns real empty zero data without any mock values.
   */
  async getOverview(): Promise<VisitorAnalyticsOverview> {
    if (memoryCache && Date.now() - memoryCache.cachedAt < CACHE_TTL_MS) {
      return memoryCache.data;
    }

    const propertyId = process.env.GA_PROPERTY_ID;
    const clientEmail = process.env.GA_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.GA_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    const measurementId = process.env.GA_MEASUREMENT_ID || 'G-NH3HTZ6XBB';

    const missingVars: string[] = [];
    if (!propertyId) missingVars.push('GA_PROPERTY_ID');
    if (!clientEmail) missingVars.push('GA_CLIENT_EMAIL');
    if (!privateKey) missingVars.push('GA_PRIVATE_KEY');

    // If credentials are missing, return real empty zero dataset
    if (missingVars.length > 0 || !propertyId || !clientEmail || !privateKey) {
      const unconfiguredState: VisitorAnalyticsOverview = {
        status: 'not_configured',
        measurementId,
        propertyId: propertyId || '',
        realtime: {
          activeUsers: 0,
          lastUpdated: new Date().toISOString(),
        },
        metrics: {
          todayUsers: 0,
          weeklyActiveUsers: 0,
          monthlyActiveUsers: 0,
          totalPageViews: 0,
          averageSessionDurationSeconds: 0,
        },
        trend: [],
        topPages: [],
        topCities: [],
        deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
        trafficChannels: [],
        setupInstructions: {
          isConfigured: false,
          serviceAccountEmail: clientEmail,
          missingEnvVars: missingVars,
          helpUrl: 'https://analytics.google.com/',
        },
      };
      return unconfiguredState;
    }

    // Authenticate with Google OAuth2
    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
    if (!accessToken) {
      return {
        status: 'error',
        errorMessage: 'Unable to authenticate with Google OAuth2 using the provided Service Account credentials.',
        measurementId,
        propertyId,
        realtime: { activeUsers: 0, lastUpdated: new Date().toISOString() },
        metrics: { todayUsers: 0, weeklyActiveUsers: 0, monthlyActiveUsers: 0, totalPageViews: 0, averageSessionDurationSeconds: 0 },
        trend: [],
        topPages: [],
        topCities: [],
        deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
        trafficChannels: [],
        setupInstructions: {
          isConfigured: false,
          serviceAccountEmail: clientEmail,
          missingEnvVars: [],
          helpUrl: 'https://analytics.google.com/',
        },
      };
    }

    try {
      // Query genuine GA4 reports in parallel
      const [realtimeData, trendData, pagesData, citiesData, deviceData, channelsData] = await Promise.all([
        queryGA4Realtime(propertyId, accessToken),
        queryGA4Report(propertyId, accessToken, {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
          ],
          dimensions: [{ name: 'date' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        }),
        queryGA4Report(propertyId, accessToken, {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
          dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        }),
        queryGA4Report(propertyId, accessToken, {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [{ name: 'activeUsers' }],
          dimensions: [{ name: 'city' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 8,
        }),
        queryGA4Report(propertyId, accessToken, {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [{ name: 'activeUsers' }],
          dimensions: [{ name: 'deviceCategory' }],
        }),
        queryGA4Report(propertyId, accessToken, {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [{ name: 'sessions' }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        }),
      ]);

      // 1. Realtime Active Users
      const realtimeUsers = parseInt(realtimeData?.rows?.[0]?.metricValues?.[0]?.value || '0', 10);

      // 2. Trend (30 Days)
      const trend = (trendData?.rows || []).map((row: any) => {
        const rawDate = row.dimensionValues?.[0]?.value || ''; // YYYYMMDD
        const formattedDate = rawDate.length === 8
          ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
          : rawDate;
        const parsedD = new Date(formattedDate);
        return {
          date: formattedDate,
          label: parsedD.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
          users: parseInt(row.metricValues?.[0]?.value || '0', 10),
          pageViews: parseInt(row.metricValues?.[1]?.value || '0', 10),
        };
      });

      const totalMonthlyUsers = trend.reduce((sum: number, t: any) => sum + t.users, 0);
      const totalMonthlyPageviews = trend.reduce((sum: number, t: any) => sum + t.pageViews, 0);
      const todayUsers = trend.length > 0 ? trend[trend.length - 1].users : 0;
      const weeklyActiveUsers = trend.slice(-7).reduce((sum: number, t: any) => sum + t.users, 0);

      // Average session duration across the period
      const avgDuration = trendData?.rows?.length
        ? Math.round(
            trendData.rows.reduce(
              (acc: number, r: any) => acc + parseFloat(r.metricValues?.[2]?.value || '0'),
              0
            ) / trendData.rows.length
          )
        : 0;

      // 3. Top Pages
      const topPages = (pagesData?.rows || []).map((row: any) => ({
        path: row.dimensionValues?.[0]?.value || '/',
        title: row.dimensionValues?.[1]?.value || row.dimensionValues?.[0]?.value || '/',
        views: parseInt(row.metricValues?.[0]?.value || '0', 10),
        users: parseInt(row.metricValues?.[1]?.value || '0', 10),
      }));

      // 4. Top Cities
      const totalCityUsers = (citiesData?.rows || []).reduce(
        (sum: number, r: any) => sum + parseInt(r.metricValues?.[0]?.value || '0', 10),
        0
      ) || 1;
      const topCities = (citiesData?.rows || []).map((row: any) => {
        const users = parseInt(row.metricValues?.[0]?.value || '0', 10);
        return {
          city: row.dimensionValues?.[0]?.value || 'Unknown',
          users,
          percentage: Math.round((users / totalCityUsers) * 100),
        };
      });

      // 5. Device Category
      let mobileUsers = 0;
      let desktopUsers = 0;
      let tabletUsers = 0;
      for (const row of deviceData?.rows || []) {
        const cat = (row.dimensionValues?.[0]?.value || '').toLowerCase();
        const users = parseInt(row.metricValues?.[0]?.value || '0', 10);
        if (cat.includes('mobile')) mobileUsers += users;
        else if (cat.includes('desktop')) desktopUsers += users;
        else if (cat.includes('tablet')) tabletUsers += users;
      }
      const totalDevUsers = mobileUsers + desktopUsers + tabletUsers || 1;
      const deviceBreakdown = {
        mobile: Math.round((mobileUsers / totalDevUsers) * 100),
        desktop: Math.round((desktopUsers / totalDevUsers) * 100),
        tablet: Math.round((tabletUsers / totalDevUsers) * 100),
      };

      // 6. Traffic Channels
      const totalChannelSessions = (channelsData?.rows || []).reduce(
        (sum: number, r: any) => sum + parseInt(r.metricValues?.[0]?.value || '0', 10),
        0
      ) || 1;
      const trafficChannels = (channelsData?.rows || []).map((row: any) => {
        const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
        return {
          channel: row.dimensionValues?.[0]?.value || 'Direct',
          sessions,
          percentage: Math.round((sessions / totalChannelSessions) * 100),
        };
      });

      const liveResult: VisitorAnalyticsOverview = {
        status: 'connected',
        measurementId,
        propertyId,
        realtime: {
          activeUsers: realtimeUsers,
          lastUpdated: new Date().toISOString(),
        },
        metrics: {
          todayUsers,
          weeklyActiveUsers,
          monthlyActiveUsers: totalMonthlyUsers,
          totalPageViews: totalMonthlyPageviews,
          averageSessionDurationSeconds: avgDuration,
        },
        trend,
        topPages,
        topCities,
        deviceBreakdown,
        trafficChannels,
      };

      memoryCache = { data: liveResult, cachedAt: Date.now() };
      return liveResult;
    } catch (err: any) {
      console.error('Failed to parse GA4 response:', err);
      return {
        status: 'error',
        errorMessage: err.message,
        measurementId,
        propertyId,
        realtime: { activeUsers: 0, lastUpdated: new Date().toISOString() },
        metrics: { todayUsers: 0, weeklyActiveUsers: 0, monthlyActiveUsers: 0, totalPageViews: 0, averageSessionDurationSeconds: 0 },
        trend: [],
        topPages: [],
        topCities: [],
        deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
        trafficChannels: [],
      };
    }
  },

  /**
   * Clear cache manually (e.g. on forced refresh)
   */
  clearCache(): void {
    memoryCache = null;
  },
};
