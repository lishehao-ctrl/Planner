const stages = ['prep', 'commute', 'buffer', 'main', 'wrapup'];

export function TimelinePlaceholder() {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline</h2>
      <ol className="mt-3 space-y-2">
        {stages.map((stage) => (
          <li key={stage} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
            {stage}
          </li>
        ))}
      </ol>
    </section>
  );
}
