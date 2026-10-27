import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA, trackPageView, setAnalyticsUser } from '../../services/analytics';
import { useAuth } from '../../providers/AuthContext';

/**
 * Universal SPA Analytics Tracker Component.
 * Initializes GA4 on first render and automatically fires page_view events on route transitions.
 */
export const AnalyticsTracker: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Initialize GA on mount
  useEffect(() => {
    initGA();
  }, []);

  // Update user context for analytics when auth state changes
  useEffect(() => {
    if (user) {
      setAnalyticsUser(user.role, user.location);
    } else {
      setAnalyticsUser('GUEST');
    }
  }, [user]);

  // Track page view whenever pathname or search params change
  useEffect(() => {
    const fullPath = location.pathname + location.search;
    trackPageView(fullPath, document.title);
  }, [location.pathname, location.search]);

  return null;
};
