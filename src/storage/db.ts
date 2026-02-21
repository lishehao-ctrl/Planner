import Dexie, { type Table } from 'dexie';
import type { CommuteRuleDB, DayPlanDB } from './types';

export class PlannerDatabase extends Dexie {
  commuteRules!: Table<CommuteRuleDB, string>;
  dayPlans!: Table<DayPlanDB, string>;

  constructor() {
    super('one-screen-day-db');

    this.version(1).stores({
      commuteRules: 'id,fromTag,toTag,name',
      dayPlans: 'dateISO'
    });
  }
}

export const db = new PlannerDatabase();
