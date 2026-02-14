import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/auth";

import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await isAuthenticated()) {
    redirect("/patients");
  }

  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">ICU ISBAR Tracker</h1>
        <p className="mt-2 text-sm text-slate-600">
          Local-only access. Enter the shared password from <code>.env</code>.
        </p>

        {errorCode ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorCode === "missing" ? "Password is required." : "Invalid password."}
          </p>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoFocus required className="w-full" />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
