import { useEffect } from 'react';

/**
 * useBodyScrollLock
 * Prevents background document scrolling when a modal, drawer, or dropdown is open.
 * Safely locks document.body scroll without touching documentElement to preserve
 * CSS sticky positioning and avoid viewport displacement on mobile browsers.
 */
export const useBodyScrollLock = (isLocked: boolean): void => {
  useEffect(() => {
    if (!isLocked) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevBodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.body.style.touchAction = prevBodyTouchAction;
    };
  }, [isLocked]);
};
