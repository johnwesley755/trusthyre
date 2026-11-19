import { useEffect } from 'react';

/**
 * useBodyScrollLock
 * Prevents background document scrolling when a modal, drawer, or dropdown is open.
 * Sets overflow: hidden and touch-action: none on both body and documentElement
 * to guarantee no scroll chaining on iOS Safari, Android Chrome, and Desktop.
 */
export const useBodyScrollLock = (isLocked: boolean): void => {
  useEffect(() => {
    if (!isLocked) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevDocOverflow = document.documentElement.style.overflow;
    const prevBodyTouchAction = document.body.style.touchAction;
    const prevDocTouchAction = document.documentElement.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevDocOverflow;
      document.body.style.touchAction = prevBodyTouchAction;
      document.documentElement.style.touchAction = prevDocTouchAction;
    };
  }, [isLocked]);
};
