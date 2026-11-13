import { useCallback, useRef } from 'react';
import { recommendationService, type RecommendationTelemetryPayload } from '../services/recommendation.service';
import { useUser } from '../providers/AuthContext';

// Session view cache keyed by user ID to prevent cross-user state bleed
const userViewsCache = new Map<string, Set<string>>();

export const useRecommendationTelemetry = () => {
  const { user } = useUser();
  const userId = user?.id || 'anonymous';
  const pendingTimeouts = useRef<Record<string, any>>({});

  /**
   * Records a VIEW event deduplicated against previous views for this specific user.
   */
  const recordView = useCallback((itemType: 'JOB' | 'WORKER', itemId: string, matchScore?: number) => {
    if (!itemId) return;
    if (!userViewsCache.has(userId)) {
      userViewsCache.set(userId, new Set<string>());
    }
    const userCache = userViewsCache.get(userId)!;
    const cacheKey = `${itemType}_VIEW_${itemId}`;
    if (userCache.has(cacheKey)) {
      return; // Deduplicate
    }

    userCache.add(cacheKey);

    // Debounce slightly to prevent micro-flicker re-renders triggering views
    if (pendingTimeouts.current[cacheKey]) {
      clearTimeout(pendingTimeouts.current[cacheKey]);
    }

    pendingTimeouts.current[cacheKey] = setTimeout(() => {
      recommendationService.recordTelemetry({
        interactionType: 'VIEW',
        itemType,
        itemId,
        matchScore
      }).catch(() => {
        // Allow retry on failure
        userCache.delete(cacheKey);
      });
      delete pendingTimeouts.current[cacheKey];
    }, 150);
  }, [userId]);

  /**
   * Records an explicit user interaction (CLICK, SAVE, APPLY, INVITE, DISMISS).
   */
  const recordAction = useCallback(async (
    interactionType: 'CLICK' | 'SAVE' | 'APPLY' | 'INVITE' | 'DISMISS',
    itemType: 'JOB' | 'WORKER',
    itemId: string,
    matchScore?: number,
    metadata?: Record<string, any>
  ) => {
    if (!itemId) return;
    return await recommendationService.recordTelemetry({
      interactionType,
      itemType,
      itemId,
      matchScore,
      metadata
    });
  }, []);

  return {
    recordView,
    recordAction
  };
};

