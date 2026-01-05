/**
 * TourComponents - Components and styles for @reactour/tour integration
 */

import { useEffect } from 'react';
import { useTour } from '@reactour/tour';
import { UI } from '../../constants';

interface TourControllerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

/**
 * TourController - Syncs external state with @reactour/tour
 *
 * Use this component inside a TourProvider to control the tour from parent state.
 *
 * @example
 * <TourProvider steps={steps} styles={wizardTourStyles}>
 *   <TourController isOpen={showTour} onClose={() => setShowTour(false)} />
 *   {children}
 * </TourProvider>
 */
export function TourController({ isOpen, onClose }: TourControllerProps) {
  const { setIsOpen, isOpen: tourIsOpen } = useTour();

  // Sync external state → tour state
  useEffect(() => {
    setIsOpen(isOpen);
  }, [isOpen, setIsOpen]);

  // Notify parent when tour closes internally
  useEffect(() => {
    if (!isOpen) return;

    const checkClosed = () => {
      if (!tourIsOpen) {
        onClose();
      }
    };

    // Small delay to let tour state settle
    const timer = setTimeout(checkClosed, UI.INTERVAL.TOUR_CLOSE_CHECK);
    return () => clearTimeout(timer);
  }, [isOpen, tourIsOpen, onClose]);

  return null;
}

export const wizardTourStyles = {
  popover: (base: object) => ({
    ...base,
    backgroundColor: 'var(--monarch-bg-card)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--monarch-border)',
    padding: '16px',
    maxWidth: '300px',
  }),
  maskArea: (base: object) => ({
    ...base,
    rx: 8,
  }),
  badge: (base: object) => ({
    ...base,
    display: 'none',
  }),
  controls: (base: object) => ({
    ...base,
    marginTop: '12px',
  }),
  close: (base: object) => ({
    ...base,
    color: 'var(--monarch-text-muted)',
    width: '12px',
    height: '12px',
    top: '12px',
    right: '12px',
  }),
};
