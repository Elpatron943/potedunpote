import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { PortalHeader } from "@/components/portal-header";
import { SiteHeader } from "@/components/site-header";
import { SiteChatbot } from "@/components/site-chatbot";
import { getPortalSessionInfo } from "@/lib/portal-session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Le pote d'un pote",
    template: "%s · Le pote d'un pote",
  },
  description:
    "Fiches entreprise, avis et repères pour choisir ton artisan du bâtiment en confiance.",
  icons: {
    icon: [{ url: "/brand/logo.png", type: "image/png" }],
    apple: [{ url: "/brand/logo.png", type: "image/png" }],
    shortcut: "/brand/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const portalInfo = await getPortalSessionInfo();
  const showChatbotForVisitor = portalInfo == null || !portalInfo.hasArtisanProfile;

  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        {portalInfo ? <PortalHeader info={portalInfo} /> : <SiteHeader />}
        {children}
        {showChatbotForVisitor ? <SiteChatbot /> : null}
      </body>
    </html>
  );
}
