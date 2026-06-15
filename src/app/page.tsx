import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
      <header className="mb-16 flex items-center justify-between">
        <div className="text-xl font-semibold tracking-tight">AStocks</div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Sign up
          </Link>
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-8">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-accent">
            Portfolio tracker
          </p>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">
            Track US & Korean stocks in one place
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            Save your holdings, average cost, and share count. See total profit
            percentage updated with live market prices whenever you open your
            dashboard.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Dual currency",
              body: "Holdings in USD and KRW with combined portfolio totals.",
            },
            {
              title: "Live quotes",
              body: "Prices refresh on login and every minute while you browse.",
            },
            {
              title: "Private account",
              body: "Your portfolio is saved securely to your own account.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-card-border bg-card/70 p-5 backdrop-blur"
            >
              <h2 className="font-medium">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/register"
          className="inline-flex w-fit rounded-xl bg-accent px-6 py-3 font-medium text-white transition hover:bg-blue-500"
        >
          Get started
        </Link>
      </section>
    </main>
  );
}
