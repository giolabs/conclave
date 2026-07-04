import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const navbar = <Navbar logo={<b>Conclave</b>} projectLink="https://github.com/lucasgio/conclave" />;
  const pageMap = await getPageMap();

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          footer={<Footer>MIT {new Date().getFullYear()} © Conclave contributors.</Footer>}
          docsRepositoryBase="https://github.com/lucasgio/conclave/blob/main/site"
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
