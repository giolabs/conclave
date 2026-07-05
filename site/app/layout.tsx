import { Head } from "nextra/components";
import "nextra-theme-docs/style.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s · Conclave",
    default: "Conclave",
  },
  description: "Conclave — Scrum for Claude Code teams.",
};

// Minimal shell shared by every route, including the lang-less "/" redirect
// page. Per-locale chrome (Nextra's Layout/Navbar/Footer, the pageMap, the
// language switcher) lives in app/[lang]/layout.tsx — <html lang> can't be
// set correctly here since this layout sits above the [lang] segment.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>{children}</body>
    </html>
  );
}
