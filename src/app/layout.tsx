import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // Needed so Next.js can resolve opengraph-image's relative path into a real absolute URL for
  // the actual og:image meta tag - without it, Next falls back to http://localhost:3000 (per
  // `pnpm build`'s own warning), which would break the social-share preview in production since a
  // crawler can't fetch an image from localhost. Hardcoded to the one stable production domain
  // (from README.md) rather than read from an env var - this project has a single, unchanging
  // deployment, so a new NEXT_PUBLIC_SITE_URL plumbed through .env.local/Vercel/CI would add real
  // moving parts for no benefit here.
  metadataBase: new URL("https://habit-tracker-eta-gold.vercel.app"),
  title: "Habit Tracker",
  description: "A habit tracking app for building and maintaining daily habits.",
  appleWebApp: {
    title: "Habit Tracker",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} antialiased`}>
      <body className="font-sans py-8 px-4">
        {/* border-line + shadow-sm: the page background (#f0f4f8) and this card's own background
        (--color-brand-subtle, #ebf4ff) are only ~1:1 in contrast - far below WCAG 1.4.11's 3:1
        guideline for a perceivable UI boundary - so the card needs a real edge cue that doesn't
        depend on that colour difference. A border alone isn't enough either: border-line
        (--color-line, #b8d4f0) only scores ~1.4:1 against the page. shadow-sm adds actual
        perceived depth (a soft blur/opacity gradient, not another flat colour), which reads as
        separation regardless of how close the two backgrounds are; the border reinforces the
        boundary at zero distance from the shadow, where the shadow itself doesn't reach. */}
        <main className="bg-brand-subtle mx-auto max-w-150 rounded-2xl border-[1.5px] border-line p-6 shadow-sm">
          {children}
        </main>
      </body>
    </html>
  );
}
