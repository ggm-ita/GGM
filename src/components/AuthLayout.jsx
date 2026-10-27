import React from "react";

import { APP_NAME } from "@/lib/brand";
import GgmLogo from "@/components/GgmLogo";

/* Shared shell for every signed-out page (login, forgot password, reset password).
   On desktop the form sits beside a brand panel; on phones and tablets it
   collapses to one centred column. */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-dvh bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* ---------------------------------------------------------------- *
       * Brand panel — desktop only. Decorative layers are inline styles so
       * the gradients never end up in the Tailwind arbitrary-value soup.
       * ---------------------------------------------------------------- */}
      <aside className="relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-16">
        {/* Warm diagonal wash instead of a flat panel. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(115% 85% at 8% 4%, rgba(212,175,55,0.20) 0%, rgba(212,175,55,0) 58%), radial-gradient(85% 75% at 96% 104%, rgba(241,211,107,0.13) 0%, rgba(241,211,107,0) 62%), linear-gradient(158deg, #171307 0%, #0d0b06 46%, #060605 100%)",
          }}
        />
        {/* Fine gold grid over the wash. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(212,175,55,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(212,175,55,0.05) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Thin gold rule: gives the edge a lit, finished look. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent"
        />
        {/* Oversized watermark mark, bleeding off the corner. */}
        <GgmLogo className="pointer-events-none absolute -bottom-6 -right-12 h-64 w-auto opacity-[0.06]" />

        <div className="relative">
          <div className="inline-flex items-center rounded-2xl border border-primary/25 bg-black/30 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-sm">
            <GgmLogo className="h-16 w-auto" />
          </div>
          <h2 className="mt-8 text-2xl font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </h2>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Retailer follow-up, all in one place.
          </p>
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
            <GgmLogo className="mx-auto h-14 w-auto" />
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
