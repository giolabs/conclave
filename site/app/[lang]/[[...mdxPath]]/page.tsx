import { generateStaticParamsFor, importPage } from "nextra/pages";
import { useMDXComponents as getMDXComponents } from "@/mdx-components";
import type { ComponentType, PropsWithChildren } from "react";

export const generateStaticParams = generateStaticParamsFor("mdxPath", "lang");

type PageProps = Readonly<{
  params: Promise<{ lang: string; mdxPath?: string[] }>;
}>;

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const { metadata } = await importPage(params.mdxPath, params.lang);
  return metadata;
}

const Wrapper = getMDXComponents().wrapper as ComponentType<
  PropsWithChildren<{ toc: unknown; metadata: unknown; sourceCode: unknown }>
>;

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(params.mdxPath, params.lang);
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
