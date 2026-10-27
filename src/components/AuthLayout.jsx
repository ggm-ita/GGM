import React from "react";
import { Check } from "lucide-react";

import { APP_NAME } from "@/lib/brand";
import GgmLogo from "@/components/GgmLogo";
import ItalyNetwork from "@/components/ItalyNetwork";

/* Shared shell for every signed-out page (login, forgot password, reset password).
   On desktop the form sits beside a brand panel; on phones and tablets it
   collapses to one centred column. */
export default function AuthLayout({
  icon: Icon,
  title,
  subtitle,
  footer,
  highlights = [],
  children,
}) {
  return (
    <div className="relative min-h-dvh bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* ---------------------------------------------------------------- *
       * Brand panel — desktop only. Decorative layers are inline styles so
       * the gradients never end up in the Tailwind arbitrary-value soup.
       * ---------------------------------------------------------------- */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-[#070604] lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-16">
        {/* The network: Italy drawn from real coordinates, with a retailer
            point in every province and the links between them. */}
        <ItalyNetwork className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
        {/* Readability wash — dark where the copy sits, clear over the map. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(100deg, rgba(6,6,5,0.92) 0%, rgba(6,6,5,0.72) 32%, rgba(6,6,5,0.18) 68%, rgba(6,6,5,0.55) 100%)",
          }}
        />
        {/* Thin gold rule: gives the edge a lit, finished look. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent"
        />

        <div className="relative">
          <GgmLogo className="h-24 w-auto" />
          <h2 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            A centralized platform to manage GGM’s retailer network across Italy — keeping
            every retailer, territory, and follow-up organized in one place.
          </p>

          {highlights.length > 0 && (
            <ul className="mt-9 space-y-3.5">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground/90">
                  <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </aside>

      {/* ---------------------------------------------------------------- *
       * Form column
       * ---------------------------------------------------------------- */}
      <main className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8 lg:min-h-0 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px] lg:hidden"
        />

        <div className="relative w-full max-w-md">
          {/* Logo for phones and tablets, where the brand panel is hidden. */}
          <div className="mb-8 text-center lg:hidden">
            <GgmLogo className="mx-auto h-20 w-auto" />
            <p className="mt-3 text-sm font-medium tracking-wide text-muted-foreground">
              {APP_NAME}
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)] duration-500 sm:p-8">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            />

            <header className="mb-6">
              {Icon && (
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
            </header>

            {children}
          </div>

          {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
