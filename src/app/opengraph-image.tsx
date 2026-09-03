import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// See docs/decisions.md's "Open Graph share image" entry for why this is generated in code
// (via next/og's ImageResponse) rather than a static PNG dropped in by hand.

export const alt = "Habit Tracker — a habit tracking app for building and maintaining daily habits";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "Habit Tracker";
const TAGLINE = "A habit tracking app for building and maintaining daily habits.";

// ImageResponse renders via Satori, not a browser, and can't use next/font/google like the rest
// of the app - it needs raw font bytes. This fetches Nunito from Google Fonts directly (same
// source as next/font/google, just resolved at image-generation time instead of build time), and
// restricts each request to only the characters actually drawn, keeping the download small.
async function loadGoogleFont(weight: number, text: string) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Nunito:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(cssUrl)).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
  const fontUrl = match?.[1];
  if (!fontUrl) {
    throw new Error(`Could not resolve a Nunito ${weight} font file from Google Fonts`);
  }
  const fontResponse = await fetch(fontUrl);
  return fontResponse.arrayBuffer();
}

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "src/app/opengraph-image-logo.png"));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  const [nunitoBold, nunitoSemibold] = await Promise.all([
    loadGoogleFont(700, TITLE),
    loadGoogleFont(600, TAGLINE),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        padding: "0 80px",
        background: "#1a6bbf",
      }}
    >
      {/* The mark's own fill is this exact brand blue, so it needs a light card behind it for
        contrast - without this it would disappear entirely against a matching-colour background. */}
      <div style={{ display: "flex", background: "#ffffff", borderRadius: 32, padding: 30 }}>
        <img src={logoSrc} width={260} height={260} alt="" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
        <div style={{ fontFamily: "Nunito", fontWeight: 700, fontSize: 72, color: "#ffffff" }}>
          {TITLE}
        </div>
        <div
          style={{
            fontFamily: "Nunito",
            fontWeight: 600,
            fontSize: 30,
            lineHeight: 1.4,
            color: "#dbeeff",
          }}
        >
          {TAGLINE}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Nunito", data: nunitoBold, weight: 700, style: "normal" },
        { name: "Nunito", data: nunitoSemibold, weight: 600, style: "normal" },
      ],
    },
  );
}
