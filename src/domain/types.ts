export type PlannerMode = 'normal';

export type CalendarEventCategory = 'class' | 'meeting' | 'gym' | 'errand' | 'other';

export type ActionSegmentKind = 'prep' | 'commute' | 'buffer' | 'main' | 'wrapup';

export type ActionSegmentStatus = 'pending' | 'done' | 'skipped';

export type CommuteMode = 'walk' | 'scooter' | 'bus' | 'car';

export type CommuteVariant = 'normal' | 'rush' | 'rain';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  category: CalendarEventCategory;
}

export interface ActionSegment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind: ActionSegmentKind;
  locked: boolean;
  status: ActionSegmentStatus;
}

export interface ActionChain {
  id: string;
  eventId: string;
  segments: ActionSegment[];
}

export interface CommuteRule {
  id: string;
  name: string;
  fromTag: string;
  toTag: string;
  segments: {
    mode: CommuteMode;
    minutes: number;
  }[];
  bufferMinutes: number;
  variants?: Record<
    CommuteVariant,
    {
      multiplier?: number;
      bufferMinutes?: number;
    }
  >;
}

export interface DayPlan {
  dateISO: string;
  events: CalendarEvent[];
  chains: ActionChain[];
}
