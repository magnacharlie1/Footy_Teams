export default function Home() {
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
          <button className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
            Sign in to get started
          </button>
          <button className="rounded-lg border border-border px-5 py-3 text-sm font-semibold transition hover:border-foreground/40 hover:text-foreground">
            View roadmap
          </button>
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
    </main>
  );
}
