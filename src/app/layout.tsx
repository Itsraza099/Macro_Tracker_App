import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import AppNav from "@/components/AppNav";
import DemoRuntime from "@/components/DemoRuntime";
import "./globals.css";

const ui = Geist({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Macro Tracker",
  description: "Mobile-first macro and calorie tracker. Interactive demo with sample data.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Macro Tracker",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ui.variable} ${serif.variable}`}>
      <body>
        <AppNav />
        <DemoRuntime />
        {/* Content sits beside the sidebar on desktop, above the tab bar on phones */}
        <div className="md:pl-56">
          <main
            className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10 pt-[calc(env(safe-area-inset-top)+20px)] md:pt-10 pb-[calc(env(safe-area-inset-bottom)+92px)] md:pb-14"
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
