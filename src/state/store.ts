import { create } from 'zustand';
import { applyCommuteRule, generateActionChain, shiftRemainingSegments } from '../domain/plan';
import type { ActionSegment, CommuteRule, CommuteVariant, DayPlan } from '../domain/types';
import { ensureSeeded, loadCommuteRules, loadDayPlan, saveDayPlan } from '../storage/repo';
import { getLocalDateISO } from './localDate';

interface PlannerStoreState {
  mode: CommuteVariant;
  todayISO: string;
  isLoading: boolean;
  error: string | null;
  commuteRules: CommuteRule[];
  activeRuleId: string | null;
  dayPlan: DayPlan | null;
  init: (todayISOOverride?: string) => Promise<void>;
  setMode: (mode: CommuteVariant) => void;
  setActiveRule: (id: string | null) => void;
  markDone: (segmentId: string) => void;
  markSkipped: (segmentId: string) => void;
  toggleLock: (segmentId: string) => void;
  shift: (deltaMinutes: number, fromTime?: Date) => void;
  regenerateToday: () => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

function cloneDayPlanEvents(dayPlan: DayPlan): DayPlan['events'] {
  return dayPlan.events.map((event) => ({
    ...event,
    start: cloneDate(event.start),
    end: cloneDate(event.end)
  }));
}

function rebuildChains(
  dayPlan: DayPlan,
  mode: CommuteVariant,
  activeRule: CommuteRule | null
): DayPlan {
  const events = cloneDayPlanEvents(dayPlan);

  const chains = events.map((event) => {
    const baseChain = generateActionChain(event);

    if (activeRule && event.location === activeRule.toTag) {
      return applyCommuteRule(baseChain, activeRule, mode);
    }

    return baseChain;
  });

  return {
    ...dayPlan,
    events,
    chains
  };
}

function updateSegment(
  dayPlan: DayPlan,
  segmentId: string,
  updater: (segment: ActionSegment) => ActionSegment
): DayPlan | null {
  let changed = false;

  const chains = dayPlan.chains.map((chain) => {
    let chainChanged = false;

    const segments = chain.segments.map((segment) => {
      if (segment.id !== segmentId) {
        return segment;
      }

      chainChanged = true;
      changed = true;
      return updater(segment);
    });

    if (!chainChanged) {
      return chain;
    }

    return {
      ...chain,
      segments
    };
  });

  if (!changed) {
    return null;
  }

  return {
    ...dayPlan,
    chains
  };
}

function resolveActiveRule(rules: CommuteRule[], activeRuleId: string | null): CommuteRule | null {
  if (!activeRuleId) {
    return null;
  }

  return rules.find((rule) => rule.id === activeRuleId) ?? null;
}

export const useAppStore = create<PlannerStoreState>((set, get) => ({
  mode: 'normal',
  todayISO: '',
  isLoading: false,
  error: null,
  commuteRules: [],
  activeRuleId: null,
  dayPlan: null,

  init: async (todayISOOverride) => {
    const todayISO = todayISOOverride ?? getLocalDateISO();
    set({
      isLoading: true,
      error: null,
      todayISO
    });

    try {
      await ensureSeeded(todayISO);

      const [commuteRules, dayPlan] = await Promise.all([
        loadCommuteRules(),
        loadDayPlan(todayISO)
      ]);

      const currentActiveRuleId = get().activeRuleId;
      const hasCurrentActiveRule =
        currentActiveRuleId !== null &&
        commuteRules.some((rule) => rule.id === currentActiveRuleId);

      const nextActiveRuleId = hasCurrentActiveRule
        ? currentActiveRuleId
        : (commuteRules[0]?.id ?? null);

      set({
        isLoading: false,
        error: null,
        commuteRules,
        activeRuleId: nextActiveRuleId,
        dayPlan
      });
    } catch (error) {
      set({
        isLoading: false,
        error: toErrorMessage(error)
      });
    }
  },

  setMode: (mode) => {
    set({ mode });
    void get().regenerateToday();
  },

  setActiveRule: (id) => {
    set({ activeRuleId: id });
    void get().regenerateToday();
  },

  markDone: (segmentId) => {
    const dayPlan = get().dayPlan;
    if (!dayPlan) {
      return;
    }

    const updatedPlan = updateSegment(dayPlan, segmentId, (segment) => ({
      ...segment,
      status: 'done'
    }));

    if (!updatedPlan) {
      return;
    }

    set({
      dayPlan: updatedPlan,
      error: null
    });

    void saveDayPlan(updatedPlan).catch((error) => {
      set({ error: toErrorMessage(error) });
    });
  },

  markSkipped: (segmentId) => {
    const dayPlan = get().dayPlan;
    if (!dayPlan) {
      return;
    }

    const updatedPlan = updateSegment(dayPlan, segmentId, (segment) => ({
      ...segment,
      status: 'skipped'
    }));

    if (!updatedPlan) {
      return;
    }

    set({
      dayPlan: updatedPlan,
      error: null
    });

    void saveDayPlan(updatedPlan).catch((error) => {
      set({ error: toErrorMessage(error) });
    });
  },

  toggleLock: (segmentId) => {
    const dayPlan = get().dayPlan;
    if (!dayPlan) {
      return;
    }

    const updatedPlan = updateSegment(dayPlan, segmentId, (segment) => ({
      ...segment,
      locked: !segment.locked
    }));

    if (!updatedPlan) {
      return;
    }

    set({
      dayPlan: updatedPlan,
      error: null
    });

    void saveDayPlan(updatedPlan).catch((error) => {
      set({ error: toErrorMessage(error) });
    });
  },

  shift: (deltaMinutes, fromTime = new Date()) => {
    const dayPlan = get().dayPlan;
    if (!dayPlan) {
      return;
    }

    const updatedPlan = shiftRemainingSegments(dayPlan, fromTime, deltaMinutes);

    set({
      dayPlan: updatedPlan,
      error: null
    });

    void saveDayPlan(updatedPlan).catch((error) => {
      set({ error: toErrorMessage(error) });
    });
  },

  regenerateToday: async () => {
    const state = get();
    const dayPlan = state.dayPlan;
    if (!dayPlan) {
      return;
    }

    const activeRule = resolveActiveRule(state.commuteRules, state.activeRuleId);
    const rebuiltPlan = rebuildChains(dayPlan, state.mode, activeRule);

    set({
      dayPlan: rebuiltPlan,
      error: null
    });

    try {
      await saveDayPlan(rebuiltPlan);
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  }
}));
