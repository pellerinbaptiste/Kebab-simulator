import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Informations légales" };

export default function LegalIndexPage() {
  return <LegalPage />;
}
