import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-grotesk" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-plex" });

export const metadata: Metadata = {
  title: "Puteal: send every household to a safe well",
  description:
    "A village map for arsenic-affected Bangladesh that matches each household to a safe tubewell along real footpaths, keeps pumps from overcrowding, and shows where one new deep well would help most.",
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
              Puteal works toward UN SDG 6.1, safe drinking water for all. The demo village and its well test values are
              sample data; the planner can load real buildings and paths from OpenStreetMap contributors.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
