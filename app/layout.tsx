import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-grotesk" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-plex" });

// "Puteal" plus a five word claim.
const TITLE = "Puteal: safe wells for every household";
// Under 160 characters: the problem and the fix.
const DESCRIPTION =
  "Arsenic taints half of Bangladesh's tested tubewells. Puteal sends each household to a safe well by footpath, caps crowding, and tests new deep wells.";

export const metadata: Metadata = {
  metadataBase: new URL("https://puteal.vercel.app"),
  title: { default: TITLE, template: "%s | Puteal" },
  description: DESCRIPTION,
  // app/icon.svg and app/opengraph-image.tsx are file conventions: Next.js adds the icon link
  // and the og:image (absolute through metadataBase) to every route on its own.
  openGraph: {
    type: "website",
    siteName: "Puteal",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${plex.variable}`}>
      <body className="min-h-screen antialiased">
        <SmoothScroll />
        <SiteHeader />
        <main>{children}</main>
        <footer className="puteal-noprint border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-muted-foreground">
            <p className="max-w-prose">
              Puteal works toward UN SDG target 6.1, safe and affordable drinking water for all. The demo village and its
              well test values are sample data; the planner can load real buildings and paths. Map data from OpenStreetMap
              contributors.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
