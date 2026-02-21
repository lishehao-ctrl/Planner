import { BottomControlsPlaceholder } from '../ui/BottomControlsPlaceholder';
import { NextActionCard } from '../ui/NextActionCard';
import { TimelinePlaceholder } from '../ui/TimelinePlaceholder';

export function TodayPage() {
  return (
    <section className="space-y-4">
      <header className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="mt-1 text-sm text-slate-600">
          One-Screen Day scaffold: prep, commute, buffer, main, wrapup.
        </p>
      </header>

      <NextActionCard />
      <TimelinePlaceholder />
      <BottomControlsPlaceholder />
    </section>
  );
}
