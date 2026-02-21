import { beforeEach, describe, expect, it } from 'vitest';
import { dayPlanToDB } from './mapper';
import { db } from './db';
import { ensureSeeded, loadCommuteRules, loadDayPlan } from './repo';

describe('storage repository', () => {
  const todayISO = '2026-02-20';

  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });

  it('ensureSeeded is idempotent when called twice for same day', async () => {
    await ensureSeeded(todayISO);

    const rulesAfterFirst = await loadCommuteRules();
    const planAfterFirst = await loadDayPlan(todayISO);

    await ensureSeeded(todayISO);

    const rulesAfterSecond = await loadCommuteRules();
    const planAfterSecond = await loadDayPlan(todayISO);

    expect(rulesAfterFirst.length).toBeGreaterThanOrEqual(1);
    expect(rulesAfterSecond.length).toBe(rulesAfterFirst.length);

    expect(planAfterFirst).not.toBeNull();
    expect(planAfterSecond).not.toBeNull();

    expect(dayPlanToDB(planAfterSecond!)).toEqual(dayPlanToDB(planAfterFirst!));
  });

  it('ensureSeeded creates commute rules and a day plan with chains', async () => {
    await ensureSeeded(todayISO);

    const rules = await loadCommuteRules();
    const plan = await loadDayPlan(todayISO);

    expect(rules.length).toBeGreaterThanOrEqual(1);
    expect(plan).not.toBeNull();
    expect(plan?.events.length).toBe(2);
    expect(plan?.chains.length).toBe(2);

    const totalCommuteSegments = plan!.chains
      .flatMap((chain) => chain.segments)
      .filter((segment) => segment.kind === 'commute').length;

    expect(totalCommuteSegments).toBeGreaterThan(0);
  });
});
