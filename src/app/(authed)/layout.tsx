import Link from "next/link";

import { requireAuth } from "@/lib/auth";

import { logoutAction } from "./actions";

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-base font-semibold">ICU ISBAR Tracker</p>
            <p className="text-xs text-slate-500">De-identified • Local-only</p>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/patients"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Patients
            </Link>
            <Link
              href="/rounding-sheet"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Unit Rounding Sheet
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
