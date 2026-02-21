import { applyCommuteRule, generateActionChain } from '../domain/plan';
import type { CalendarEvent, CommuteRule, DayPlan } from '../domain/types';
import { db } from './db';
import { dayPlanFromDB, dayPlanToDB } from './mapper';

function cloneCommuteRule(rule: CommuteRule): CommuteRule {
  const variants = rule.variants
    ? {
        normal: { ...(rule.variants.normal ?? {}) },
        rush: { ...(rule.variants.rush ?? {}) },
        rain: { ...(rule.variants.rain ?? {}) }
      }
    : undefined;

  return {
    ...rule,
    segments: rule.segments.map((segment) => ({ ...segment })),
    variants
  };
}

function dateAtLocalTime(todayISO: string, hhmm: string): Date {
  return new Date(`${todayISO}T${hhmm}:00`);
}

function buildSeedRule(): CommuteRule {
  return {
    id: 'seed-home-ucsd',
    name: 'Home to UCSD',
    fromTag: 'home',
    toTag: 'ucsd',
    segments: [
      { mode: 'scooter', minutes: 3 },
      { mode: 'bus', minutes: 10 },
      { mode: 'walk', minutes: 5 }
    ],
    bufferMinutes: 5,
    variants: {
      normal: {},
      rush: {
        multiplier: 0.9,
        bufferMinutes: 3
      },
      rain: {
        multiplier: 1.15,
        bufferMinutes: 8
      }
    }
  };
}

function buildSeedDayPlan(todayISO: string, rule: CommuteRule): DayPlan {
  const events: CalendarEvent[] = [
    {
      id: `${todayISO}-class-1`,
      title: 'Class',
      start: dateAtLocalTime(todayISO, '10:00'),
      end: dateAtLocalTime(todayISO, '10:50'),
      location: 'ucsd',
      category: 'class'
    },
    {
      id: `${todayISO}-gym-1`,
      title: 'Gym',
      start: dateAtLocalTime(todayISO, '17:00'),
      end: dateAtLocalTime(todayISO, '18:00'),
      location: 'utc',
      category: 'gym'
    }
  ];

  const chains = events.map((event) => {
    const chain = generateActionChain(event);

    if (event.location === rule.toTag) {
      return applyCommuteRule(chain, rule, 'normal');
    }

    return chain;
  });

  return {
    dateISO: todayISO,
    events,
    chains
  };
}

export async function loadCommuteRules(): Promise<CommuteRule[]> {
  const rows = await db.commuteRules.toArray();
  return rows.map(cloneCommuteRule);
}

export async function upsertCommuteRule(rule: CommuteRule): Promise<void> {
  await db.commuteRules.put(cloneCommuteRule(rule));
}

export async function deleteCommuteRule(id: string): Promise<void> {
  await db.commuteRules.delete(id);
}

export async function loadDayPlan(dateISO: string): Promise<DayPlan | null> {
  const row = await db.dayPlans.get(dateISO);
  return row ? dayPlanFromDB(row) : null;
}

export async function saveDayPlan(plan: DayPlan): Promise<void> {
  await db.dayPlans.put(dayPlanToDB(plan));
}

export async function ensureSeeded(todayISO: string): Promise<void> {
  const [existingPlan, ruleCount] = await Promise.all([
    db.dayPlans.get(todayISO),
    db.commuteRules.count()
  ]);

  if (existingPlan && ruleCount > 0) {
    return;
  }

  const seedRule = buildSeedRule();
  await upsertCommuteRule(seedRule);

  const seedPlan = buildSeedDayPlan(todayISO, seedRule);
  await saveDayPlan(seedPlan);
}
