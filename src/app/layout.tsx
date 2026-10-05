import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { I18nProvider } from "@/lib/i18n/provider";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#121826" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
