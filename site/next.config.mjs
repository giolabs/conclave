import nextra from "nextra";

// Single-locale minimal setup — no i18n, no custom landing page. Content
// lives at content root and maps 1:1 to site root (content/index.mdx -> "/").
const withNextra = nextra({
  contentDirBasePath: "/",
});

export default withNextra({
  output: "export",
  basePath: "/conclave",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
});
