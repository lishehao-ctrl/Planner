import { beforeEach, describe, expect, it } from 'vitest';
import type { ActionSegment, DayPlan } from '../domain/types';
import { db } from '../storage/db';
import { loadDayPlan } from '../storage/repo';
import { useAppStore } from './store';

function flattenSegments(plan: DayPlan): ActionSegment[] {
  return plan.chains.flatMap((chain) => chain.segments);
}

function findSegmentById(plan: DayPlan, segmentId: string): ActionSegment | undefined {
  return flattenSegments(plan).find((segment) => segment.id === segmentId);
}

async function waitForPersistedStatus(
  dateISO: string,
  segmentId: string,
  status: ActionSegment['status']
): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const persisted = await loadDayPlan(dateISO);
    const persistedSegment = persisted ? findSegmentById(persisted, segmentId) : undefined;

    if (persistedSegment?.status === status) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Timed out waiting for segment ${segmentId} status ${status}`);
}

async function waitForPersistedTimes(
  dateISO: string,
  segmentId: string,
  startMs: number,
  endMs: number
): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const persisted = await loadDayPlan(dateISO);
    const persistedSegment = persisted ? findSegmentById(persisted, segmentId) : undefined;

    if (
      persistedSegment &&
      persistedSegment.start.getTime() === startMs &&
      persistedSegment.end.getTime() === endMs
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Timed out waiting for segment ${segmentId} times to persist`);
}

describe('planner store', () => {
  const todayISO = '2026-02-20';

  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();

    useAppStore.setState({
      mode: 'normal',
      todayISO: '',
      isLoading: false,
      error: null,
      commuteRules: [],
      activeRuleId: null,
      dayPlan: null
    });
  });

  it('init loads commute rules and day plan', async () => {
    await useAppStore.getState().init(todayISO);

    const state = useAppStore.getState();

    expect(state.error).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.todayISO).toBe(todayISO);
    expect(state.commuteRules.length).toBeGreaterThanOrEqual(1);
    expect(state.activeRuleId).not.toBeNull();
    expect(state.dayPlan).not.toBeNull();
    expect(state.dayPlan?.chains.length).toBeGreaterThan(0);
  });

  it('markDone updates state and persists to IndexedDB', async () => {
    await useAppStore.getState().init(todayISO);

    const initialPlan = useAppStore.getState().dayPlan;
    expect(initialPlan).not.toBeNull();

    const target = flattenSegments(initialPlan!).find((segment) => segment.status === 'pending');
    expect(target).toBeDefined();

    useAppStore.getState().markDone(target!.id);

    const updatedStatePlan = useAppStore.getState().dayPlan;
    const updatedStateSegment = updatedStatePlan ? findSegmentById(updatedStatePlan, target!.id) : undefined;
    expect(updatedStateSegment?.status).toBe('done');

    await waitForPersistedStatus(todayISO, target!.id, 'done');

    const persistedPlan = await loadDayPlan(todayISO);
    expect(persistedPlan).not.toBeNull();
    const persistedSegment = persistedPlan ? findSegmentById(persistedPlan, target!.id) : undefined;
    expect(persistedSegment?.status).toBe('done');
  });

  it('shift does not move locked segments', async () => {
    await useAppStore.getState().init(todayISO);

    const beforePlan = useAppStore.getState().dayPlan;
    expect(beforePlan).not.toBeNull();

    const lockedSegment = flattenSegments(beforePlan!).find((segment) => segment.locked);
    expect(lockedSegment).toBeDefined();

    const beforeStart = lockedSegment!.start.getTime();
    const beforeEnd = lockedSegment!.end.getTime();

    useAppStore.getState().shift(30, new Date(`${todayISO}T00:00:00`));

    const afterStatePlan = useAppStore.getState().dayPlan;
    expect(afterStatePlan).not.toBeNull();

    const afterStateLocked = afterStatePlan ? findSegmentById(afterStatePlan, lockedSegment!.id) : undefined;
    expect(afterStateLocked).toBeDefined();
    expect(afterStateLocked?.start.getTime()).toBe(beforeStart);
    expect(afterStateLocked?.end.getTime()).toBe(beforeEnd);

    await waitForPersistedTimes(todayISO, lockedSegment!.id, beforeStart, beforeEnd);

    const persistedPlan = await loadDayPlan(todayISO);
    expect(persistedPlan).not.toBeNull();

    const persistedLocked = persistedPlan ? findSegmentById(persistedPlan, lockedSegment!.id) : undefined;
    expect(persistedLocked).toBeDefined();
    expect(persistedLocked?.start.getTime()).toBe(beforeStart);
    expect(persistedLocked?.end.getTime()).toBe(beforeEnd);
  });
});
