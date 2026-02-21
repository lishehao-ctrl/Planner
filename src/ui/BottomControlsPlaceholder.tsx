const controls = ['Done', 'Skip', 'Shift', 'Lock'];

export function BottomControlsPlaceholder() {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Controls</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {controls.map((control) => (
          <button
            key={control}
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            {control}
          </button>
        ))}
      </div>
    </section>
  );
}
