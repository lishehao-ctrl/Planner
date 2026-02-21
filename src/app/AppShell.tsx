import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-4">
        <nav className="mb-4 flex gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300'
              }`
            }
          >
            Today
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300'
              }`
            }
          >
            Settings
          </NavLink>
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
