import { addMinutes, compareDates, minutesBetween, sortSegmentsByStart } from './time';
import type {
  ActionChain,
  ActionSegment,
  CalendarEvent,
  CommuteRule,
  CommuteVariant,
  DayPlan
} from './types';

type SegmentBlueprint = {
  kind: ActionSegment['kind'];
  title: string;
  minutes: number;
  locked: boolean;
};

function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

function cloneSegment(segment: ActionSegment): ActionSegment {
  return {
    ...segment,
    start: cloneDate(segment.start),
    end: cloneDate(segment.end)
  };
}

function cloneEvent(event: CalendarEvent): CalendarEvent {
  return {
    ...event,
    start: cloneDate(event.start),
    end: cloneDate(event.end)
  };
}

function safeMinutes(value: number): number {
  return Math.max(0, Math.round(value));
}

function durationMinutes(segment: ActionSegment): number {
  return safeMinutes(minutesBetween(segment.start, segment.end));
}

function buildSegment(
  eventId: string,
  index: number,
  blueprint: SegmentBlueprint,
  start: Date,
  end: Date
): ActionSegment {
  return {
    id: `${eventId}-${blueprint.kind}-${index}`,
    title: blueprint.title,
    start: cloneDate(start),
    end: cloneDate(end),
    kind: blueprint.kind,
    locked: blueprint.locked,
    status: 'pending'
  };
}

function buildBeforeSegments(
  eventId: string,
  anchor: Date,
  blueprints: SegmentBlueprint[]
): ActionSegment[] {
  let cursor = cloneDate(anchor);
  const segments: ActionSegment[] = [];

  for (let index = blueprints.length - 1; index >= 0; index -= 1) {
    const blueprint = blueprints[index];
    const start = addMinutes(cursor, -safeMinutes(blueprint.minutes));
    segments.unshift(buildSegment(eventId, index, blueprint, start, cursor));
    cursor = start;
  }

  return segments;
}

function buildAfterSegments(
  eventId: string,
  anchor: Date,
  blueprints: SegmentBlueprint[]
): ActionSegment[] {
  let cursor = cloneDate(anchor);

  return blueprints.map((blueprint, index) => {
    const end = addMinutes(cursor, safeMinutes(blueprint.minutes));
    const segment = buildSegment(eventId, index, blueprint, cursor, end);
    cursor = end;
    return segment;
  });
}

function beforeMainBufferIndex(segments: ActionSegment[], mainIndex: number): number {
  let bufferIndex = -1;

  for (let index = 0; index < mainIndex; index += 1) {
    if (segments[index].kind === 'buffer') {
      bufferIndex = index;
    }
  }

  return bufferIndex;
}

function normalizeChain(chain: ActionChain): ActionChain {
  return {
    ...chain,
    segments: chain.segments.map(cloneSegment)
  };
}

function resolveVariant(
  rule: CommuteRule,
  mode: CommuteVariant
): { multiplier: number; bufferMinutes: number } {
  const variant = rule.variants?.[mode];

  return {
    multiplier: variant?.multiplier ?? 1,
    bufferMinutes: variant?.bufferMinutes ?? rule.bufferMinutes
  };
}

export function generateActionChain(event: CalendarEvent): ActionChain {
  const mainSegment: ActionSegment = {
    id: `${event.id}-main`,
    title: event.title,
    start: cloneDate(event.start),
    end: cloneDate(event.end),
    kind: 'main',
    locked: true,
    status: 'pending'
  };

  let before: SegmentBlueprint[] = [];
  let after: SegmentBlueprint[] = [];

  if (event.category === 'class' || event.category === 'meeting') {
    before = [
      { kind: 'prep', title: 'Prep', minutes: 10, locked: false },
      { kind: 'buffer', title: 'Buffer', minutes: 5, locked: false }
    ];
    after = [{ kind: 'wrapup', title: 'Wrap-up', minutes: 5, locked: false }];
  } else if (event.category === 'gym') {
    before = [{ kind: 'prep', title: 'Prep', minutes: 10, locked: false }];
    after = [{ kind: 'wrapup', title: 'Wrap-up', minutes: 10, locked: false }];
  }

  const beforeSegments = buildBeforeSegments(event.id, mainSegment.start, before);
  const afterSegments = buildAfterSegments(event.id, mainSegment.end, after);

  return {
    id: `chain-${event.id}`,
    eventId: event.id,
    segments: [...beforeSegments, mainSegment, ...afterSegments]
  };
}

export function applyCommuteRule(
  chain: ActionChain,
  rule: CommuteRule | null | undefined,
  mode: CommuteVariant
): ActionChain {
  const normalized = normalizeChain(chain);

  if (!rule) {
    return normalized;
  }

  const withoutCommute = normalized.segments.filter((segment) => segment.kind !== 'commute');
  const mainIndex = withoutCommute.findIndex((segment) => segment.kind === 'main');

  if (mainIndex < 0) {
    return {
      ...normalized,
      segments: withoutCommute
    };
  }

  const { multiplier, bufferMinutes } = resolveVariant(rule, mode);
  const bufferIndex = beforeMainBufferIndex(withoutCommute, mainIndex);
  const insertIndex = bufferIndex >= 0 ? bufferIndex : mainIndex;
  const mainStart = cloneDate(withoutCommute[mainIndex].start);

  const commuteSegments: ActionSegment[] = rule.segments.map((part, index) => {
    const commuteMinutes = safeMinutes(part.minutes * multiplier);

    return {
      id: `${chain.eventId}-commute-${index}`,
      title: `Commute (${part.mode})`,
      start: cloneDate(mainStart),
      end: addMinutes(mainStart, commuteMinutes),
      kind: 'commute',
      locked: false,
      status: 'pending'
    };
  });

  const merged: ActionSegment[] = [
    ...withoutCommute.slice(0, insertIndex),
    ...commuteSegments,
    ...withoutCommute.slice(insertIndex)
  ];

  const mergedMainIndex = merged.findIndex((segment) => segment.kind === 'main');
  if (mergedMainIndex < 0) {
    return {
      ...normalized,
      segments: merged
    };
  }

  const beforeDurations = merged.slice(0, mergedMainIndex).map((segment) => {
    if (segment.kind === 'buffer') {
      return safeMinutes(bufferMinutes);
    }

    return durationMinutes(segment);
  });

  let cursor = cloneDate(merged[mergedMainIndex].start);
  for (let index = mergedMainIndex - 1; index >= 0; index -= 1) {
    const end = cloneDate(cursor);
    const start = addMinutes(end, -beforeDurations[index]);

    merged[index] = {
      ...merged[index],
      start,
      end
    };

    cursor = start;
  }

  return {
    ...normalized,
    segments: merged
  };
}

export function shiftRemainingSegments(
  dayPlan: DayPlan,
  fromTime: Date,
  deltaMinutes: number
): DayPlan {
  const events = dayPlan.events.map(cloneEvent);

  const chains = dayPlan.chains.map((chain) => ({
    ...chain,
    segments: chain.segments.map((segment) => {
      const cloned = cloneSegment(segment);

      if (cloned.locked || compareDates(cloned.start, fromTime) < 0) {
        return cloned;
      }

      return {
        ...cloned,
        start: addMinutes(cloned.start, deltaMinutes),
        end: addMinutes(cloned.end, deltaMinutes)
      };
    })
  }));

  return {
    ...dayPlan,
    events,
    chains
  };
}

function segmentOrder(a: ActionSegment, b: ActionSegment): number {
  const byStart = compareDates(a.start, b.start);
  if (byStart !== 0) {
    return byStart;
  }

  const byEnd = compareDates(a.end, b.end);
  if (byEnd !== 0) {
    return byEnd;
  }

  return a.id.localeCompare(b.id);
}

export function getNextAction(dayPlan: DayPlan, now: Date): ActionSegment | null {
  const pending = dayPlan.chains
    .flatMap((chain) => chain.segments)
    .filter((segment) => segment.status === 'pending');

  const inProgress = sortSegmentsByStart(
    pending.filter(
      (segment) => compareDates(segment.start, now) <= 0 && compareDates(now, segment.end) < 0
    )
  ).sort(segmentOrder);

  if (inProgress.length > 0) {
    return inProgress[0];
  }

  const future = sortSegmentsByStart(
    pending.filter((segment) => compareDates(segment.start, now) > 0)
  ).sort(segmentOrder);

  return future[0] ?? null;
}
