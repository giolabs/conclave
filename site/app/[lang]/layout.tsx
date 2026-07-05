import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";
import type { ReactNode } from "react";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "es" }];
}

const REPO_BASE = "https://github.com/lucasgio/conclave/blob/main/site/content";

type LangLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ lang: string }>;
}>;

export default async function LangLayout({ children, params }: LangLayoutProps) {
  const { lang } = await params;
  const pageMap = await getPageMap(`/${lang}`);
  const navbar = <Navbar logo={<b>Conclave</b>} projectLink="https://github.com/lucasgio/conclave" />;

  return (
    <>
      {/* The true <html> shell lives in the root app/layout.tsx (above this
          [lang] segment) and can't know the locale at build time, so it
          defaults to "en" — this plain-text inline script (no interpolated
          markup, just a JSON-stringified literal from our own static params)
          corrects the lang attribute on /es/* pages. */}
      <script>{`document.documentElement.lang = ${JSON.stringify(lang)};`}</script>
      <Layout
        navbar={navbar}
        footer={<Footer>MIT {new Date().getFullYear()} © Conclave contributors.</Footer>}
        docsRepositoryBase={`${REPO_BASE}/${lang}`}
        pageMap={pageMap}
        i18n={[
          { locale: "en", name: "English" },
          { locale: "es", name: "Español" },
        ]}
      >
        {children}
      </Layout>
    </>
  );
}
