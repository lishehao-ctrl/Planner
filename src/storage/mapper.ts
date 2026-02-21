import type { ActionChain, ActionSegment, CalendarEvent, DayPlan } from '../domain/types';
import type { ActionChainDB, ActionSegmentDB, CalendarEventDB, DayPlanDB } from './types';

function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

function toISO(date: Date): string {
  return cloneDate(date).toISOString();
}

function fromISO(value: string): Date {
  return new Date(value);
}

export function eventToDB(event: CalendarEvent): CalendarEventDB {
  return {
    id: event.id,
    title: event.title,
    startISO: toISO(event.start),
    endISO: toISO(event.end),
    location: event.location,
    category: event.category
  };
}

export function eventFromDB(event: CalendarEventDB): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    start: fromISO(event.startISO),
    end: fromISO(event.endISO),
    location: event.location,
    category: event.category
  };
}

export function segmentToDB(segment: ActionSegment): ActionSegmentDB {
  return {
    id: segment.id,
    title: segment.title,
    startISO: toISO(segment.start),
    endISO: toISO(segment.end),
    kind: segment.kind,
    locked: segment.locked,
    status: segment.status
  };
}

export function segmentFromDB(segment: ActionSegmentDB): ActionSegment {
  return {
    id: segment.id,
    title: segment.title,
    start: fromISO(segment.startISO),
    end: fromISO(segment.endISO),
    kind: segment.kind,
    locked: segment.locked,
    status: segment.status
  };
}

export function chainToDB(chain: ActionChain): ActionChainDB {
  return {
    id: chain.id,
    eventId: chain.eventId,
    segments: chain.segments.map(segmentToDB)
  };
}

export function chainFromDB(chain: ActionChainDB): ActionChain {
  return {
    id: chain.id,
    eventId: chain.eventId,
    segments: chain.segments.map(segmentFromDB)
  };
}

export function dayPlanToDB(plan: DayPlan): DayPlanDB {
  return {
    dateISO: plan.dateISO,
    events: plan.events.map(eventToDB),
    chains: plan.chains.map(chainToDB)
  };
}

export function dayPlanFromDB(plan: DayPlanDB): DayPlan {
  return {
    dateISO: plan.dateISO,
    events: plan.events.map(eventFromDB),
    chains: plan.chains.map(chainFromDB)
  };
}
