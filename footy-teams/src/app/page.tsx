import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/groups");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Footy Teams - Weekly five-a-side toolkit
        </span>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Run fair weekly football without the admin chaos.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Organise sessions, balance teams, and keep league tables in one place.
          Built for fast setup and reliable match-night flow.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            Sign in to get started
          </Link>
        </div>
      </div>

      <section className="grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Fast session setup</h3>
          <p className="text-sm text-muted-foreground">
            Create sessions in minutes with member selection and quick add guests.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Fair, balanced teams</h3>
          <p className="text-sm text-muted-foreground">
            Build squads with weighted points so every match feels competitive.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Scores and league tables</h3>
          <p className="text-sm text-muted-foreground">
            Record results, track standings, and keep season history tidy.
          </p>
        </div>
      </section>
    </main>
  );
}
