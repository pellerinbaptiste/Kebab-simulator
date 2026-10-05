import type { Metadata, Viewport } from "next";
import { Anton, Archivo, IBM_Plex_Mono } from "next/font/google";

import { I18nProvider } from "@/lib/i18n/provider";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

// Charte « La Une » : Anton (manchettes), Archivo (texte), IBM Plex Mono (chiffres)
const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", weight: ["400", "500", "600"], subsets: ["latin"] });

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#151513" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${anton.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
