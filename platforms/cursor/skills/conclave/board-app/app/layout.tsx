import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";

import { readBoardTheme } from "@/lib/theme";
import "./globals.css";

// See app/page.tsx — keeps board.md's branding live under `next start`, too.
export const dynamic = "force-dynamic";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export function generateMetadata(): Metadata {
  const theme = readBoardTheme();
  const title = theme.companyName ? `${theme.companyName} Board` : "Conclave Board";
  return { title, description: "Kanban board of the current conclave/ sprint state." };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const theme = readBoardTheme();

  return (
    <html lang="en" className={poppins.variable}>
      <body
        style={
          {
            "--color-brand-primary": theme.primaryColor,
            "--color-brand-accent": theme.accentColor,
          } as CSSProperties
        }
        className="min-h-screen text-neutral-900"
      >
        <div className="h-1" style={{ backgroundColor: theme.primaryColor }} />
        <header className="flex items-center gap-2.5 border-b border-neutral-200 bg-white px-6 py-3">
          {theme.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo path/URL is team-provided, not an optimizable static import
            <img src={theme.logoPath} alt="" className="size-7 rounded-[4px] object-cover" />
          ) : (
            <span
              className="flex size-7 items-center justify-center rounded-[4px] text-xs font-bold text-white"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {(theme.companyName ?? "C")[0]}
            </span>
          )}
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-[15px] font-semibold text-neutral-800">
              {theme.companyName ?? "Conclave"}
            </h1>
            <span className="text-[13px] text-neutral-400">/ Board</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
