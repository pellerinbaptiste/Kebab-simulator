import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { I18nProvider } from "@/lib/i18n/provider";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

// Charte « Nuit » : Plus Jakarta Sans partout (chiffres en tabulaires)
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

const description =
  "Pronostics entre amis sur l'actu, la politique, le sport, la pop culture et l'absurde. 1000 crédits virtuels offerts, ligues privées et classement en direct.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "PronoLeague — pronostics entre amis", template: "%s · PronoLeague" },
  description,
  applicationName: "PronoLeague",
  keywords: ["pronostics", "paris entre amis", "prédictions", "actualité", "Polymarket", "ligue privée"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: ["en_US"],
    siteName: "PronoLeague",
    title: "PronoLeague — pronostics entre amis",
    description,
    url: "/",
  },
  twitter: { card: "summary", title: "PronoLeague — pronostics entre amis", description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111418",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
