"use client";

import { useEffect } from "react";

const SUPPORTED_LOCALES = ["en", "es"];
const DEFAULT_LOCALE = "en";
const BASE_PATH = "/conclave";

function pickLocale(): string {
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (cookieMatch && SUPPORTED_LOCALES.includes(cookieMatch[1])) {
      return cookieMatch[1];
    }
  }
  if (typeof navigator !== "undefined") {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const short = lang.slice(0, 2).toLowerCase();
      if (SUPPORTED_LOCALES.includes(short)) {
        return short;
      }
    }
  }
  return DEFAULT_LOCALE;
}

// Client-side language detect-and-redirect for the lang-less "/" route.
// Next.js's built-in i18n routing can't be used with `output: "export"`, so
// this replaces it: respect a previous manual choice (the NEXT_LOCALE cookie
// nextra-theme-docs' own language switcher already sets), then the browser's
// language list, then fall back to English. This page renders inside the
// root layout's <html>/<body> (app/layout.tsx) — it must not render its own.
export default function RootRedirect() {
  useEffect(() => {
    const locale = pickLocale();
    window.location.replace(`${BASE_PATH}/${locale}/`);
  }, []);

  return (
    <p>
      Redirecting to <a href={`${BASE_PATH}/${DEFAULT_LOCALE}/`}>Conclave docs</a>…
    </p>
  );
}
