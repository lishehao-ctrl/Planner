import { describe, expect, it } from 'vitest';
import {
  applyCommuteRule,
  generateActionChain,
  getNextAction,
  shiftRemainingSegments
} from './plan';
import { minutesBetween } from './time';
import type { ActionSegment, CalendarEvent, CommuteRule, DayPlan } from './types';

const at = (value: string): Date => new Date(value);

function mustFindByKind(
  segments: ActionSegment[],
  kind: ActionSegment['kind']
): ActionSegment {
  const segment = segments.find((item) => item.kind === kind);
  if (!segment) {
    throw new Error(`Expected to find segment kind "${kind}"`);
  }

  return segment;
}

describe('generateActionChain', () => {
  it('creates expected class segments and keeps main locked', () => {
    const event: CalendarEvent = {
      id: 'event-class-1',
      title: 'Math 101',
      start: at('2026-02-20T09:00:00-08:00'),
      end: at('2026-02-20T10:00:00-08:00'),
      category: 'class',
      location: 'Room A'
    };

    const chain = generateActionChain(event);

    expect(chain.id).toBe('chain-event-class-1');
    expect(chain.eventId).toBe(event.id);
    expect(chain.segments.map((segment) => segment.kind)).toEqual([
      'prep',
      'buffer',
      'main',
      'wrapup'
    ]);

    const [prep, buffer, main, wrapup] = chain.segments;

    expect(main.locked).toBe(true);
    expect(main.status).toBe('pending');

    expect(prep.start.getTime()).toBe(at('2026-02-20T08:45:00-08:00').getTime());
    expect(prep.end.getTime()).toBe(at('2026-02-20T08:55:00-08:00').getTime());

    expect(buffer.start.getTime()).toBe(at('2026-02-20T08:55:00-08:00').getTime());
    expect(buffer.end.getTime()).toBe(at('2026-02-20T09:00:00-08:00').getTime());

    expect(main.start.getTime()).toBe(at('2026-02-20T09:00:00-08:00').getTime());
    expect(main.end.getTime()).toBe(at('2026-02-20T10:00:00-08:00').getTime());

    expect(wrapup.start.getTime()).toBe(at('2026-02-20T10:00:00-08:00').getTime());
    expect(wrapup.end.getTime()).toBe(at('2026-02-20T10:05:00-08:00').getTime());
  });
});

describe('applyCommuteRule', () => {
  it('inserts commute before buffer and recomputes before-main timestamps', () => {
    const event: CalendarEvent = {
      id: 'event-class-2',
      title: 'Team Sync',
      start: at('2026-02-20T09:00:00-08:00'),
      end: at('2026-02-20T10:00:00-08:00'),
      category: 'meeting'
    };

    const originalChain = generateActionChain(event);

    const rule: CommuteRule = {
      id: 'rule-campus',
      name: 'Home to Campus',
      fromTag: 'home',
      toTag: 'campus',
      segments: [
        { mode: 'walk', minutes: 8 },
        { mode: 'bus', minutes: 12 }
      ],
      bufferMinutes: 7,
      variants: {
        normal: {},
        rush: {
          multiplier: 1.5,
          bufferMinutes: 9
        },
        rain: {
          multiplier: 1.2
        }
      }
    };

    const updated = applyCommuteRule(originalChain, rule, 'rush');

    expect(updated.segments.map((segment) => segment.kind)).toEqual([
      'prep',
      'commute',
      'commute',
      'buffer',
      'main',
      'wrapup'
    ]);

    const [prep, commuteWalk, commuteBus, buffer, main, wrapup] = updated.segments;

    expect(commuteWalk.title).toBe('Commute (walk)');
    expect(commuteBus.title).toBe('Commute (bus)');

    expect(prep.start.getTime()).toBe(at('2026-02-20T08:11:00-08:00').getTime());
    expect(prep.end.getTime()).toBe(at('2026-02-20T08:21:00-08:00').getTime());

    expect(commuteWalk.start.getTime()).toBe(at('2026-02-20T08:21:00-08:00').getTime());
    expect(commuteWalk.end.getTime()).toBe(at('2026-02-20T08:33:00-08:00').getTime());

    expect(commuteBus.start.getTime()).toBe(at('2026-02-20T08:33:00-08:00').getTime());
    expect(commuteBus.end.getTime()).toBe(at('2026-02-20T08:51:00-08:00').getTime());

    expect(buffer.start.getTime()).toBe(at('2026-02-20T08:51:00-08:00').getTime());
    expect(buffer.end.getTime()).toBe(at('2026-02-20T09:00:00-08:00').getTime());
    expect(minutesBetween(buffer.start, buffer.end)).toBe(9);

    expect(main.start.getTime()).toBe(at('2026-02-20T09:00:00-08:00').getTime());
    expect(main.end.getTime()).toBe(at('2026-02-20T10:00:00-08:00').getTime());

    expect(wrapup.start.getTime()).toBe(at('2026-02-20T10:00:00-08:00').getTime());
    expect(wrapup.end.getTime()).toBe(at('2026-02-20T10:05:00-08:00').getTime());

    expect(originalChain.segments.map((segment) => segment.kind)).toEqual([
      'prep',
      'buffer',
      'main',
      'wrapup'
    ]);
    expect(minutesBetween(
      mustFindByKind(originalChain.segments, 'buffer').start,
      mustFindByKind(originalChain.segments, 'buffer').end
    )).toBe(5);
  });
});

describe('shiftRemainingSegments', () => {
  it('shifts unlocked remaining segments and keeps locked segments fixed', () => {
    const event: CalendarEvent = {
      id: 'event-class-3',
      title: 'Physics',
      start: at('2026-02-20T09:00:00-08:00'),
      end: at('2026-02-20T10:00:00-08:00'),
      category: 'class'
    };

    const chain = generateActionChain(event);

    const dayPlan: DayPlan = {
      dateISO: '2026-02-20',
      events: [event],
      chains: [chain]
    };

    const shifted = shiftRemainingSegments(
      dayPlan,
      at('2026-02-20T08:50:00-08:00'),
      15
    );

    const [prep, buffer, main, wrapup] = shifted.chains[0].segments;

    expect(prep.start.getTime()).toBe(at('2026-02-20T08:45:00-08:00').getTime());
    expect(prep.end.getTime()).toBe(at('2026-02-20T08:55:00-08:00').getTime());

    expect(buffer.start.getTime()).toBe(at('2026-02-20T09:10:00-08:00').getTime());
    expect(buffer.end.getTime()).toBe(at('2026-02-20T09:15:00-08:00').getTime());

    expect(main.start.getTime()).toBe(at('2026-02-20T09:00:00-08:00').getTime());
    expect(main.end.getTime()).toBe(at('2026-02-20T10:00:00-08:00').getTime());

    expect(wrapup.start.getTime()).toBe(at('2026-02-20T10:15:00-08:00').getTime());
    expect(wrapup.end.getTime()).toBe(at('2026-02-20T10:20:00-08:00').getTime());

    expect(minutesBetween(buffer.start, buffer.end)).toBe(5);
    expect(minutesBetween(wrapup.start, wrapup.end)).toBe(5);
  });
});

describe('getNextAction', () => {
  it('picks in-progress pending first, then future pending, else null', () => {
    const pendingInProgress: ActionSegment = {
      id: 'seg-in-progress',
      title: 'Current Action',
      start: at('2026-02-20T09:00:00-08:00'),
      end: at('2026-02-20T09:10:00-08:00'),
      kind: 'prep',
      locked: false,
      status: 'pending'
    };

    const pendingFuture: ActionSegment = {
      id: 'seg-next',
      title: 'Next Action',
      start: at('2026-02-20T09:15:00-08:00'),
      end: at('2026-02-20T09:30:00-08:00'),
      kind: 'main',
      locked: true,
      status: 'pending'
    };

    const doneInProgress: ActionSegment = {
      id: 'seg-done',
      title: 'Already Done',
      start: at('2026-02-20T09:00:00-08:00'),
      end: at('2026-02-20T09:20:00-08:00'),
      kind: 'buffer',
      locked: false,
      status: 'done'
    };

    const skippedFuture: ActionSegment = {
      id: 'seg-skipped',
      title: 'Skipped Action',
      start: at('2026-02-20T09:40:00-08:00'),
      end: at('2026-02-20T09:50:00-08:00'),
      kind: 'wrapup',
      locked: false,
      status: 'skipped'
    };

    const dayPlan: DayPlan = {
      dateISO: '2026-02-20',
      events: [],
      chains: [
        {
          id: 'chain-1',
          eventId: 'event-1',
          segments: [doneInProgress, pendingFuture, pendingInProgress, skippedFuture]
        }
      ]
    };

    const now = at('2026-02-20T09:05:00-08:00');
    expect(getNextAction(dayPlan, now)?.id).toBe('seg-in-progress');

    const noInProgressPlan: DayPlan = {
      ...dayPlan,
      chains: [
        {
          ...dayPlan.chains[0],
          segments: [
            { ...pendingInProgress, status: 'done' },
            pendingFuture,
            doneInProgress,
            skippedFuture
          ]
        }
      ]
    };

    expect(getNextAction(noInProgressPlan, now)?.id).toBe('seg-next');

    const noPendingPlan: DayPlan = {
      ...noInProgressPlan,
      chains: [
        {
          ...noInProgressPlan.chains[0],
          segments: [
            { ...pendingFuture, status: 'done' },
            { ...pendingInProgress, status: 'skipped' },
            doneInProgress,
            skippedFuture
          ]
        }
      ]
    };

    expect(getNextAction(noPendingPlan, now)).toBeNull();
  });
});
