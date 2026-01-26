/* eslint-disable max-lines */
/** Distribution Mode Context - manages global state for Distribute and Hypothesize modes */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { StashItem } from '../types';
import type {
  NamedEvent,
  TimelineZoomState,
  EditingEventContext,
  TimelineScenarioState,
} from '../types/timeline';
import { createDefaultTimelineState } from '../types/timeline';

const STORAGE_KEY = 'eclosion-hypothesize-scenarios';

// ============================================================================
// Types
// ============================================================================

export type DistributionMode = 'distribute' | 'hypothesize';

export interface SavedScenario {
  id: string;
  name: string;
  /** @deprecated Use stashedAllocations instead. Kept for backwards compatibility with old saved scenarios. */
  allocations?: Record<string, number>;
  /** Stashed allocations - draws from Cash to Stash */
  stashedAllocations: Record<string, number>;
  /** Monthly allocations - draws from Left to Budget */
  monthlyAllocations: Record<string, number>;
  customAvailableFunds: number | null;
  customLeftToBudget: number | null;
  createdAt: string;
  updatedAt: string;
  /** Timeline state (hypothesize mode) */
  timeline?: TimelineScenarioState;
}

interface DistributionModeState {
  /** Current mode, or null if not in distribution mode */
  mode: DistributionMode | null;
  /** Per-item stashed allocations - draws from Cash to Stash (itemId -> amount) */
  stashedAllocations: Record<string, number>;
  /** Per-item monthly allocations - draws from Left to Budget (itemId -> amount) */
  monthlyAllocations: Record<string, number>;
  /** Whether any changes have been made since entering mode */
  hasChanges: boolean;
  /** Custom available funds override (Hypothesize only) */
  customAvailableFunds: number | null;
  /** Custom left to budget override (Hypothesize only) */
  customLeftToBudget: number | null;
  /** Whether the scenario sidebar is open */
  isScenarioSidebarOpen: boolean;
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
  /** Open/close the scenario sidebar */
  setScenarioSidebarOpen: (open: boolean) => void;
  /** Load saved scenarios from localStorage */
  getSavedScenarios: () => SavedScenario[];
  /** Check if a scenario with the given name already exists */
  scenarioNameExists: (name: string) => boolean;
  /** Save current state as a scenario */
  saveScenario: (name: string) => SavedScenario;
  /** Load a saved scenario */
  loadScenario: (id: string) => void;
  /** Delete a saved scenario */
  deleteScenario: (id: string) => void;
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
      hasChanges: false,
      customAvailableFunds: null,
      customLeftToBudget: null,
      isScenarioSidebarOpen: false,
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
    for (const item of items) {
      initialAllocations[item.id] = item.current_balance;
    }
    setState({
      mode: 'distribute',
      stashedAllocations: initialAllocations,
      monthlyAllocations: {},
      hasChanges: false,
      customAvailableFunds: null,
      customLeftToBudget: null,
      isScenarioSidebarOpen: false,
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
    for (const item of items) {
      initialAllocations[item.id] = item.current_balance;
    }
    setState({
      mode: 'hypothesize',
      stashedAllocations: initialAllocations,
      monthlyAllocations: {},
      hasChanges: false,
      customAvailableFunds: null,
      customLeftToBudget: null,
      isScenarioSidebarOpen: false,
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
      hasChanges: false,
      customAvailableFunds: null,
      customLeftToBudget: null,
      isScenarioSidebarOpen: false,
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

  // ---- Scenario persistence (localStorage) ----

  const getSavedScenarios = useCallback((): SavedScenario[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored) as SavedScenario[];
    } catch {
      return [];
    }
  }, []);

  const scenarioNameExists = useCallback(
    (name: string): boolean => {
      const scenarios = getSavedScenarios();
      return scenarios.some((s) => s.name.toLowerCase() === name.toLowerCase());
    },
    [getSavedScenarios]
  );

  const saveScenario = useCallback(
    (name: string): SavedScenario => {
      const scenarios = getSavedScenarios();
      const now = new Date().toISOString();

      // Check if scenario with this name already exists
      const existingScenario = scenarios.find((s) => s.name === name);
      const id = existingScenario?.id ?? crypto.randomUUID();

      const scenario: SavedScenario = {
        id,
        name,
        stashedAllocations: { ...state.stashedAllocations },
        monthlyAllocations: { ...state.monthlyAllocations },
        customAvailableFunds: state.customAvailableFunds,
        customLeftToBudget: state.customLeftToBudget,
        createdAt: existingScenario?.createdAt ?? now,
        updatedAt: now,
        // Include timeline state
        timeline: {
          events: [...state.timelineEvents],
          itemApys: { ...state.itemApys },
          cursorDate: state.cursorDate,
          zoom: { ...state.timelineZoom },
        },
      };

      if (existingScenario) {
        const existingIndex = scenarios.indexOf(existingScenario);
        scenarios[existingIndex] = scenario;
      } else {
        scenarios.unshift(scenario); // Add to beginning (most recent first)
      }

      // Limit to 10 scenarios
      const trimmed = scenarios.slice(0, 10);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        // localStorage may be unavailable
      }

      return scenario;
    },
    [
      state.stashedAllocations,
      state.monthlyAllocations,
      state.customAvailableFunds,
      state.customLeftToBudget,
      state.timelineEvents,
      state.itemApys,
      state.cursorDate,
      state.timelineZoom,
      getSavedScenarios,
    ]
  );

  const loadScenario = useCallback(
    (id: string) => {
      const scenarios = getSavedScenarios();
      const scenario = scenarios.find((s) => s.id === id);
      if (!scenario) return;

      // Handle backwards compatibility: old scenarios had `allocations` instead of separate pools
      // Treat old `allocations` as stashedAllocations since that was the primary use case
      const stashedAllocations = scenario.stashedAllocations ?? scenario.allocations ?? {};
      const monthlyAllocations = scenario.monthlyAllocations ?? {};

      // Load timeline state (with defaults for old scenarios)
      const defaultTimeline = createDefaultTimelineState();
      const timeline = scenario.timeline ?? defaultTimeline;

      setState((prev) => ({
        ...prev,
        stashedAllocations,
        monthlyAllocations,
        customAvailableFunds: scenario.customAvailableFunds,
        customLeftToBudget: scenario.customLeftToBudget,
        hasChanges: false, // Loading a scenario resets the "changes" flag
        // Restore timeline state
        timelineEvents: timeline.events ?? [],
        itemApys: timeline.itemApys ?? {},
        cursorDate: timeline.cursorDate ?? null,
        timelineZoom: timeline.zoom ?? defaultTimeline.zoom,
        editingEvent: null, // Don't restore editing state
      }));
    },
    [getSavedScenarios]
  );

  const deleteScenario = useCallback(
    (id: string) => {
      const scenarios = getSavedScenarios();
      const filtered = scenarios.filter((s) => s.id !== id);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch {
        // localStorage may be unavailable
      }
    },
    [getSavedScenarios]
  );

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
      setScenarioSidebarOpen,
      getSavedScenarios,
      scenarioNameExists,
      saveScenario,
      loadScenario,
      deleteScenario,
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
      getSavedScenarios,
      scenarioNameExists,
      saveScenario,
      loadScenario,
      deleteScenario,
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
  hasChanges: false,
  customAvailableFunds: null,
  customLeftToBudget: null,
  isScenarioSidebarOpen: false,
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
  getSavedScenarios: () => [],
  scenarioNameExists: () => false,
  saveScenario: () => ({
    id: '',
    name: '',
    stashedAllocations: {},
    monthlyAllocations: {},
    customAvailableFunds: null,
    customLeftToBudget: null,
    createdAt: '',
    updatedAt: '',
  }),
  loadScenario: () => {},
  deleteScenario: () => {},
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
