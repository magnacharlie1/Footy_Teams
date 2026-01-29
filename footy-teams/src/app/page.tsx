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
          Footy Teams • Weekly five-a-side toolkit
        </span>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Run fair weekly football, from WhatsApp poll to kick-off.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Paste your WhatsApp list, auto-match players, build balanced teams, record scores,
          and track the league across groups. Mobile-first and ready for Netlify.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            Sign in to get started
          </Link>
          <Link
            href="#roadmap"
            className="rounded-lg border border-border px-5 py-3 text-sm font-semibold transition hover:border-foreground/40 hover:text-foreground"
          >
            View roadmap
          </Link>
        </div>
      </div>

      <section className="grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Rapid session setup</h3>
          <p className="text-sm text-muted-foreground">
            Paste WhatsApp polls, auto-map player aliases, and publish two or four-team sessions in minutes.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Fair, data-informed teams</h3>
          <p className="text-sm text-muted-foreground">
            Balance teams using weighted points so newcomers and regulars get even matchups over time.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Scores and league tables</h3>
          <p className="text-sm text-muted-foreground">
            Track goals-for points, weighted performance, and MoTM votes across groups with historical stats intact.
          </p>
        </div>
      </section>

      <section
        id="roadmap"
        className="rounded-2xl border border-border bg-muted/40 p-6 shadow-sm"
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold">Roadmap</h2>
          <p className="text-sm text-muted-foreground">
            A quick look at what is coming next so you know what to expect.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Now</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Auth0 sign-in, WhatsApp import, team balancing, and session sharing.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Next</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Apple login in Auth0, finer role controls, and faster bulk edits.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Later</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Automated reminders, SMS updates, and league trend dashboards.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
