/**
 * Google Analytics 4 (GA4) Client-Side Tracking Service
 * Manages script injection, SPA page_view event dispatching, and custom interaction telemetry.
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

let isInitialized = false;

/**
 * Initialize Google tag (gtag.js) for GA4 measurement
 */
export const initGA = (customMeasurementId?: string): void => {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;

  const measurementId =
    customMeasurementId ||
    import.meta.env.VITE_GA_MEASUREMENT_ID ||
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    'G-NH3HTZ6XBB';

  if (!measurementId || measurementId === 'undefined') {
    return;
  }

  // Ensure dataLayer exists
  window.dataLayer = window.dataLayer || [];

  if (!window.gtag) {
    window.gtag = function (...args: any[]) {
      window.dataLayer.push(args);
    };
  }

  // Check if gtag script is already added
  const existingScript = document.querySelector(
    `script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`
  );

  if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false, // Explicitly tracked via React Router transitions
    transport_type: 'beacon',
    anonymize_ip: true,
  });

  isInitialized = true;
};

/**
 * Track an SPA page_view navigation event
 */
export const trackPageView = (path: string, title?: string): void => {
  if (typeof window === 'undefined' || !window.gtag) return;

  // Mark internal admin traffic so it doesn't pollute public visitor reports
  const isAdminRoute = path.startsWith('/admin');
  if (isAdminRoute) {
    window.gtag('set', 'user_properties', { is_staff: 'true' });
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
};

/**
 * Track standard & custom user conversion events
 */
export const trackEvent = (eventName: string, params: Record<string, any> = {}): void => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', eventName, {
    ...params,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Associate authenticated user category without transmitting PII
 */
export const setAnalyticsUser = (role?: string, city?: string): void => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('set', 'user_properties', {
    user_role: role || 'GUEST',
    target_city: city || 'Unknown',
  });
};
