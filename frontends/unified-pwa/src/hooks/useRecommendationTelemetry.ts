import { useCallback, useRef } from 'react';
import { recommendationService, type RecommendationTelemetryPayload } from '../services/recommendation.service';

// In-memory set to ensure VIEW interactions are recorded only once per session per item
const recordedViewsCache = new Set<string>();

export const useRecommendationTelemetry = () => {
  const pendingTimeouts = useRef<Record<string, any>>({});

  /**
   * Records a VIEW event deduplicated against previous views in the current user session.
   */
  const recordView = useCallback((itemType: 'JOB' | 'WORKER', itemId: string, matchScore?: number) => {
    if (!itemId) return;
    const cacheKey = `${itemType}_VIEW_${itemId}`;
    if (recordedViewsCache.has(cacheKey)) {
      return; // Deduplicate
    }

    recordedViewsCache.add(cacheKey);

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
      });
      delete pendingTimeouts.current[cacheKey];
    }, 150);
  }, []);

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

