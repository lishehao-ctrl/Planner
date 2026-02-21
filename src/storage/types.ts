import type {
  ActionSegmentKind,
  ActionSegmentStatus,
  CalendarEventCategory,
  CommuteMode,
  CommuteVariant
} from '../domain/types';

export interface CalendarEventDB {
  id: string;
  title: string;
  startISO: string;
  endISO: string;
  location?: string;
  category: CalendarEventCategory;
}

export interface ActionSegmentDB {
  id: string;
  title: string;
  startISO: string;
  endISO: string;
  kind: ActionSegmentKind;
  locked: boolean;
  status: ActionSegmentStatus;
}

export interface ActionChainDB {
  id: string;
  eventId: string;
  segments: ActionSegmentDB[];
}

export interface DayPlanDB {
  dateISO: string;
  events: CalendarEventDB[];
  chains: ActionChainDB[];
}

export interface CommuteRuleDB {
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
