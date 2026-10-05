import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_DOCS, legalDoc } from "@/lib/legal";

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ slug: d.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: legalDoc(slug).title };
}

export default async function LegalDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LegalPage doc={legalDoc(slug)} />;
}
