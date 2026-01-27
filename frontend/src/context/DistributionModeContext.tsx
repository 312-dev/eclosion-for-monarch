/* eslint-disable max-lines */
/** Distribution Mode Context - manages global state for Distribute and Hypothesize modes */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { StashItem } from '../types';
import type { NamedEvent, TimelineZoomState, EditingEventContext } from '../types/timeline';
import { createDefaultTimelineState } from '../types/timeline';

// ============================================================================
// Types
// ============================================================================

export type DistributionMode = 'distribute' | 'hypothesize';

/** Data needed to load a scenario into the context */
export interface ScenarioLoadData {
  id: string;
  name: string;
  stashedAllocations: Record<string, number>;
  monthlyAllocations: Record<string, number>;
  customAvailableFunds: number | null;
  customLeftToBudget: number | null;
  /** Timeline events to load */
  timelineEvents?: NamedEvent[];
  /** Per-item APY settings */
  itemApys?: Record<string, number>;
}

interface DistributionModeState {
  /** Current mode, or null if not in distribution mode */
  mode: DistributionMode | null;
  /** Per-item stashed allocations - draws from Cash to Stash (itemId -> amount) */
  stashedAllocations: Record<string, number>;
  /** Per-item monthly allocations - draws from Left to Budget (itemId -> amount) */
  monthlyAllocations: Record<string, number>;
  /** Starting stash total when entering mode (to avoid double-counting) */
  startingStashTotal: number;
  /** Whether any changes have been made since entering mode */
  hasChanges: boolean;
  /** Custom available funds override (Hypothesize only) */
  customAvailableFunds: number | null;
  /** Custom left to budget override (Hypothesize only) */
  customLeftToBudget: number | null;
  /** Whether the scenario sidebar is open */
  isScenarioSidebarOpen: boolean;
  /** ID of the currently loaded scenario (null if unsaved/new) */
  loadedScenarioId: string | null;
  /** Name of the currently loaded scenario (null if unsaved/new) */
  loadedScenarioName: string | null;
  /** Counter to signal submit request (increments on each request) */
  submitRequestId: number;
  // ---- Timeline state (Hypothesize only) ----
  /** Named events on the timeline */
  timelineEvents: NamedEvent[];
  /** Per-item APY settings (itemId -> APY decimal) */
  itemApys: Record<string, number>;
  /** Currently selected date on timeline (ISO string) */
  cursorDate: string | null;
  /** Timeline zoom state */
  timelineZoom: TimelineZoomState;
  /** Event currently being edited */
  editingEvent: EditingEventContext | null;
  /** Whether the timeline panel is expanded */
  isTimelineExpanded: boolean;
}

interface DistributionModeContextValue extends DistributionModeState {
  /** Enter distribute mode */
  enterDistributeMode: (items: StashItem[]) => void;
  /** Enter hypothesize mode */
  enterHypothesizeMode: (items: StashItem[]) => void;
  /** Exit current mode, optionally discarding changes */
  exitMode: (discardChanges?: boolean) => void;
  /** Set stashed allocation for a single item (draws from Cash to Stash) */
  setStashedAllocation: (itemId: string, amount: number) => void;
  /** Set monthly allocation for a single item (draws from Left to Budget) */
  setMonthlyAllocation: (itemId: string, amount: number) => void;
  /** Set all stashed allocations at once */
  setStashedAllocations: (allocations: Record<string, number>) => void;
  /** Set all monthly allocations at once */
  setMonthlyAllocations: (allocations: Record<string, number>) => void;
  /** Set custom available funds (Hypothesize only) */
  setCustomAvailableFunds: (amount: number | null) => void;
  /** Set custom left to budget (Hypothesize only) */
  setCustomLeftToBudget: (amount: number | null) => void;
  /** Total stashed allocation amount (draws from Cash to Stash) */
  totalStashedAllocated: number;
  /** Total monthly allocation amount (draws from Left to Budget) */
  totalMonthlyAllocated: number;
  /** Starting stash total when entering mode (to calculate delta for remaining funds) */
  startingStashTotal: number;
  /** Open/close the scenario sidebar */
  setScenarioSidebarOpen: (open: boolean) => void;
  /** Load scenario data into the context state */
  loadScenarioState: (data: ScenarioLoadData) => void;
  /** ID of the currently loaded scenario (null if unsaved/new) */
  loadedScenarioId: string | null;
  /** Name of the currently loaded scenario (null if unsaved/new) */
  loadedScenarioName: string | null;
  /** Counter to signal submit request (increments on each request) */
  submitRequestId: number;
  /** Request a submit action (Apply for distribute, Save for hypothesize) */
  requestSubmit: () => void;
  // ---- Timeline methods (Hypothesize only) ----
  /** Add a named event to the timeline */
  addTimelineEvent: (event: Omit<NamedEvent, 'id' | 'createdAt'>) => NamedEvent;
  /** Update an existing timeline event */
  updateTimelineEvent: (id: string, updates: Partial<Omit<NamedEvent, 'id' | 'createdAt'>>) => void;
  /** Delete a timeline event */
  deleteTimelineEvent: (id: string) => void;
  /** Set APY for a specific item */
  setItemApy: (itemId: string, apy: number) => void;
  /** Set the cursor date on the timeline */
  setCursorDate: (date: string | null) => void;
  /** Set the timeline zoom state */
  setTimelineZoom: (zoom: TimelineZoomState) => void;
  /** Set the event being edited */
  setEditingEvent: (context: EditingEventContext | null) => void;
  /** Toggle timeline panel expansion */
  setTimelineExpanded: (expanded: boolean) => void;
}

// ============================================================================
// Context
// ============================================================================

const DistributionModeContext = createContext<DistributionModeContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function DistributionModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<DistributionModeState>(() => {
    const defaultTimeline = createDefaultTimelineState();
    return {
      mode: null,
      stashedAllocations: {},
      monthlyAllocations: {},
      startingStashTotal: 0,
      hasChanges: false,
      customAvailableFunds: null,
      customLeftToBudget: null,
      isScenarioSidebarOpen: false,
      loadedScenarioId: null,
      loadedScenarioName: null,
      submitRequestId: 0,
      // Timeline state
      timelineEvents: [],
      itemApys: {},
      cursorDate: null,
      timelineZoom: defaultTimeline.zoom,
      editingEvent: null,
      isTimelineExpanded: false,
    };
  });

  const enterDistributeMode = useCallback((items: StashItem[]) => {
    const defaultTimeline = createDefaultTimelineState();
    // Initialize stashed allocations with each item's current balance
    const initialAllocations: Record<string, number> = {};
    let startingTotal = 0;
    for (const item of items) {
      initialAllocations[item.id] = item.current_balance;
      startingTotal += item.current_balance;
    }
    setState({
      mode: 'distribute',
      stashedAllocations: initialAllocations,
      monthlyAllocations: {},
      startingStashTotal: startingTotal,
      hasChanges: false,
      customAvailableFunds: null,
      customLeftToBudget: null,
      isScenarioSidebarOpen: false,
      loadedScenarioId: null,
      loadedScenarioName: null,
      submitRequestId: 0,
      // Timeline state (not used in distribute mode, but reset for cleanliness)
      timelineEvents: [],
      itemApys: {},
      cursorDate: null,
      timelineZoom: defaultTimeline.zoom,
      editingEvent: null,
      isTimelineExpanded: false,
    });
  }, []);

  const enterHypothesizeMode = useCallback((items: StashItem[]) => {
    const defaultTimeline = createDefaultTimelineState();
    // Initialize stashed allocations with each item's current balance
    const initialAllocations: Record<string, number> = {};
    let startingTotal = 0;
    for (const item of items) {
      initialAllocations[item.id] = item.current_balance;
      startingTotal += item.current_balance;
    }
    setState({
      mode: 'hypothesize',
      stashedAllocations: initialAllocations,
      monthlyAllocations: {},
      startingStashTotal: startingTotal,
      hasChanges: false,
      customAvailableFunds: null,
      customLeftToBudget: null,
      isScenarioSidebarOpen: false,
      loadedScenarioId: null,
      loadedScenarioName: null,
      submitRequestId: 0,
      // Initialize timeline state with fresh dates
      timelineEvents: [],
      itemApys: {},
      cursorDate: null,
      timelineZoom: defaultTimeline.zoom,
      editingEvent: null,
      isTimelineExpanded: false,
    });
  }, []);

  const exitMode = useCallback((_discardChanges?: boolean) => {
    const defaultTimeline = createDefaultTimelineState();
    // Reset all state when exiting
    setState({
      mode: null,
      stashedAllocations: {},
      monthlyAllocations: {},
      startingStashTotal: 0,
      hasChanges: false,
      customAvailableFunds: null,
      customLeftToBudget: null,
      isScenarioSidebarOpen: false,
      loadedScenarioId: null,
      loadedScenarioName: null,
      submitRequestId: 0,
      // Reset timeline state
      timelineEvents: [],
      itemApys: {},
      cursorDate: null,
      timelineZoom: defaultTimeline.zoom,
      editingEvent: null,
      isTimelineExpanded: false,
    });
  }, []);

  const setStashedAllocation = useCallback((itemId: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      stashedAllocations: {
        ...prev.stashedAllocations,
        [itemId]: Math.max(0, Math.round(amount)),
      },
      hasChanges: true,
    }));
  }, []);

  const setMonthlyAllocation = useCallback((itemId: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      monthlyAllocations: {
        ...prev.monthlyAllocations,
        [itemId]: Math.max(0, Math.round(amount)),
      },
      hasChanges: true,
    }));
  }, []);

  const setStashedAllocations = useCallback((allocations: Record<string, number>) => {
    setState((prev) => ({
      ...prev,
      stashedAllocations: allocations,
      hasChanges: true,
    }));
  }, []);

  const setMonthlyAllocations = useCallback((allocations: Record<string, number>) => {
    setState((prev) => ({
      ...prev,
      monthlyAllocations: allocations,
      hasChanges: true,
    }));
  }, []);

  const setCustomAvailableFunds = useCallback((amount: number | null) => {
    setState((prev) => {
      if (prev.mode !== 'hypothesize') return prev;
      return {
        ...prev,
        customAvailableFunds: amount === null ? null : Math.max(0, Math.round(amount)),
        hasChanges: true,
      };
    });
  }, []);

  const setCustomLeftToBudget = useCallback((amount: number | null) => {
    setState((prev) => {
      if (prev.mode !== 'hypothesize') return prev;
      return {
        ...prev,
        customLeftToBudget: amount === null ? null : Math.round(amount),
        hasChanges: true,
      };
    });
  }, []);

  const setScenarioSidebarOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      isScenarioSidebarOpen: open,
    }));
  }, []);

  const requestSubmit = useCallback(() => {
    setState((prev) => ({
      ...prev,
      submitRequestId: prev.submitRequestId + 1,
    }));
  }, []);

  // ---- Timeline callbacks ----

  const addTimelineEvent = useCallback(
    (eventData: Omit<NamedEvent, 'id' | 'createdAt'>): NamedEvent => {
      const event: NamedEvent = {
        ...eventData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setState((prev) => {
        if (prev.mode !== 'hypothesize') return prev;
        return {
          ...prev,
          timelineEvents: [...prev.timelineEvents, event],
          hasChanges: true,
        };
      });
      return event;
    },
    []
  );

  const updateTimelineEvent = useCallback(
    (id: string, updates: Partial<Omit<NamedEvent, 'id' | 'createdAt'>>) => {
      setState((prev) => {
        if (prev.mode !== 'hypothesize') return prev;
        const eventIndex = prev.timelineEvents.findIndex((e) => e.id === id);
        if (eventIndex === -1) return prev;
        const existingEvent = prev.timelineEvents[eventIndex];
        if (!existingEvent) return prev;
        const updatedEvents = [...prev.timelineEvents];
        updatedEvents[eventIndex] = {
          id: existingEvent.id,
          createdAt: existingEvent.createdAt,
          name: updates.name ?? existingEvent.name,
          type: updates.type ?? existingEvent.type,
          date: updates.date ?? existingEvent.date,
          itemId: updates.itemId ?? existingEvent.itemId,
          amount: updates.amount ?? existingEvent.amount,
        };
        return {
          ...prev,
          timelineEvents: updatedEvents,
          hasChanges: true,
        };
      });
    },
    []
  );

  const deleteTimelineEvent = useCallback((id: string) => {
    setState((prev) => {
      if (prev.mode !== 'hypothesize') return prev;
      return {
        ...prev,
        timelineEvents: prev.timelineEvents.filter((e) => e.id !== id),
        editingEvent: prev.editingEvent?.event.id === id ? null : prev.editingEvent,
        hasChanges: true,
      };
    });
  }, []);

  const setItemApy = useCallback((itemId: string, apy: number) => {
    setState((prev) => {
      if (prev.mode !== 'hypothesize') return prev;
      return {
        ...prev,
        itemApys: {
          ...prev.itemApys,
          [itemId]: Math.max(0, Math.min(1, apy)), // Clamp to 0-1
        },
        hasChanges: true,
      };
    });
  }, []);

  const setCursorDate = useCallback((date: string | null) => {
    setState((prev) => ({
      ...prev,
      cursorDate: date,
    }));
  }, []);

  const setTimelineZoom = useCallback((zoom: TimelineZoomState) => {
    setState((prev) => ({
      ...prev,
      timelineZoom: zoom,
    }));
  }, []);

  const setEditingEvent = useCallback((context: EditingEventContext | null) => {
    setState((prev) => ({
      ...prev,
      editingEvent: context,
      // When entering edit mode, set cursor to event date
      cursorDate: context ? context.event.date : prev.cursorDate,
    }));
  }, []);

  const setTimelineExpanded = useCallback((expanded: boolean) => {
    setState((prev) => ({
      ...prev,
      isTimelineExpanded: expanded,
    }));
  }, []);

  // Calculate total stashed allocated (draws from Cash to Stash)
  const totalStashedAllocated = useMemo(() => {
    return Object.values(state.stashedAllocations).reduce((sum, amount) => sum + amount, 0);
  }, [state.stashedAllocations]);

  // Calculate total monthly allocated (draws from Left to Budget)
  const totalMonthlyAllocated = useMemo(() => {
    return Object.values(state.monthlyAllocations).reduce((sum, amount) => sum + amount, 0);
  }, [state.monthlyAllocations]);

  // ---- Scenario state loading ----

  const loadScenarioState = useCallback((data: ScenarioLoadData) => {
    const defaultTimeline = createDefaultTimelineState();

    setState((prev) => ({
      ...prev,
      stashedAllocations: data.stashedAllocations,
      monthlyAllocations: data.monthlyAllocations,
      customAvailableFunds: data.customAvailableFunds,
      customLeftToBudget: data.customLeftToBudget,
      hasChanges: false, // Loading a scenario resets the "changes" flag
      loadedScenarioId: data.id,
      loadedScenarioName: data.name,
      // Restore timeline state
      timelineEvents: data.timelineEvents ?? [],
      itemApys: data.itemApys ?? {},
      cursorDate: null, // Don't restore cursor (ephemeral UI state)
      timelineZoom: defaultTimeline.zoom, // Don't restore zoom (ephemeral UI state)
      editingEvent: null, // Don't restore editing state
    }));
  }, []);

  const value: DistributionModeContextValue = useMemo(
    () => ({
      ...state,
      enterDistributeMode,
      enterHypothesizeMode,
      exitMode,
      setStashedAllocation,
      setMonthlyAllocation,
      setStashedAllocations,
      setMonthlyAllocations,
      setCustomAvailableFunds,
      setCustomLeftToBudget,
      totalStashedAllocated,
      totalMonthlyAllocated,
      startingStashTotal: state.startingStashTotal,
      setScenarioSidebarOpen,
      loadScenarioState,
      loadedScenarioId: state.loadedScenarioId,
      loadedScenarioName: state.loadedScenarioName,
      submitRequestId: state.submitRequestId,
      requestSubmit,
      // Timeline methods
      addTimelineEvent,
      updateTimelineEvent,
      deleteTimelineEvent,
      setItemApy,
      setCursorDate,
      setTimelineZoom,
      setEditingEvent,
      setTimelineExpanded,
    }),
    [
      state,
      enterDistributeMode,
      enterHypothesizeMode,
      exitMode,
      setStashedAllocation,
      setMonthlyAllocation,
      setStashedAllocations,
      setMonthlyAllocations,
      setCustomAvailableFunds,
      setCustomLeftToBudget,
      totalStashedAllocated,
      totalMonthlyAllocated,
      setScenarioSidebarOpen,
      loadScenarioState,
      requestSubmit,
      addTimelineEvent,
      updateTimelineEvent,
      deleteTimelineEvent,
      setItemApy,
      setCursorDate,
      setTimelineZoom,
      setEditingEvent,
      setTimelineExpanded,
    ]
  );

  return (
    <DistributionModeContext.Provider value={value}>{children}</DistributionModeContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/** Default no-op context for use outside provider */
const defaultContext: DistributionModeContextValue = {
  mode: null,
  stashedAllocations: {},
  monthlyAllocations: {},
  startingStashTotal: 0,
  hasChanges: false,
  customAvailableFunds: null,
  customLeftToBudget: null,
  isScenarioSidebarOpen: false,
  loadedScenarioId: null,
  loadedScenarioName: null,
  submitRequestId: 0,
  // Timeline state defaults (placeholder - will be overwritten when entering mode)
  timelineEvents: [],
  itemApys: {},
  cursorDate: null,
  timelineZoom: { resolution: 'monthly', startDate: '', endDate: '' },
  editingEvent: null,
  isTimelineExpanded: false,
  // Computed values
  totalStashedAllocated: 0,
  totalMonthlyAllocated: 0,
  // Methods
  enterDistributeMode: () => {},
  enterHypothesizeMode: () => {},
  exitMode: () => {},
  setStashedAllocation: () => {},
  setMonthlyAllocation: () => {},
  setStashedAllocations: () => {},
  setMonthlyAllocations: () => {},
  setCustomAvailableFunds: () => {},
  setCustomLeftToBudget: () => {},
  setScenarioSidebarOpen: () => {},
  loadScenarioState: () => {},
  requestSubmit: () => {},
  // Timeline methods
  addTimelineEvent: () => ({
    id: '',
    name: '',
    type: 'deposit',
    date: '',
    itemId: '',
    amount: 0,
    createdAt: '',
  }),
  updateTimelineEvent: () => {},
  deleteTimelineEvent: () => {},
  setItemApy: () => {},
  setCursorDate: () => {},
  setTimelineZoom: () => {},
  setEditingEvent: () => {},
  setTimelineExpanded: () => {},
};

/**
 * Access the full distribution mode context.
 * Safe to use outside provider - returns no-op defaults.
 */
export function useDistributionMode() {
  const context = useContext(DistributionModeContext);
  return context ?? defaultContext;
}

/**
 * Check if currently in any distribution mode.
 * Safe to use outside provider (returns false).
 */
export function useIsInDistributionMode(): boolean {
  const context = useContext(DistributionModeContext);
  return context?.mode !== null && context?.mode !== undefined;
}

/**
 * Get the current distribution mode.
 * Safe to use outside provider (returns null).
 */
export function useDistributionModeType(): DistributionMode | null {
  const context = useContext(DistributionModeContext);
  return context?.mode ?? null;
}
