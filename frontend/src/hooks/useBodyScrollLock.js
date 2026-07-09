import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reset body styles - removes all scroll locks
 */
const resetBodyStyles = () => {
  document.body.style.overflow = '';
  document.body.style.pointerEvents = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.classList.remove('modal-open', 'overflow-hidden', 'no-scroll');
  document.documentElement.style.overflow = '';
  document.documentElement.style.pointerEvents = '';
};

/**
 * Hook to reset body scroll on route change
 * Use this in layout components to ensure clean state
 */
export const useBodyScrollReset = () => {
  const location = useLocation();

  useEffect(() => {
    // Reset body styles on every route change
    resetBodyStyles();
  }, [location.pathname]);
};

/**
 * Hook to lock body scroll (for modals)
 * @param {boolean} isLocked - Whether to lock scrolling
 */
export const useBodyScrollLock = (isLocked = false) => {
  useEffect(() => {
    if (isLocked) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.classList.add('modal-open');
    } else {
      const scrollY = document.body.style.top;
      resetBodyStyles();
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }

    return () => {
      resetBodyStyles();
    };
  }, [isLocked]);
};

export default useBodyScrollReset;