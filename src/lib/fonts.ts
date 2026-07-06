import localFont from "next/font/local";

// Identité UPgraders (cahier §10) : Clash Display (display), Satoshi (texte),
// JetBrains Mono (données). OTF/TTF auto-hébergées — un seul format servant
// le web (next/font) ET l'embed PDF (PDFKit).
const clashDisplay = localFont({
  src: [
    { path: "../assets/fonts/ClashDisplay-Regular.otf", weight: "400" },
    { path: "../assets/fonts/ClashDisplay-Medium.otf", weight: "500" },
    { path: "../assets/fonts/ClashDisplay-Semibold.otf", weight: "600" },
    { path: "../assets/fonts/ClashDisplay-Bold.otf", weight: "700" },
  ],
  variable: "--font-clash",
  display: "swap",
});

const satoshi = localFont({
  src: [
    { path: "../assets/fonts/Satoshi-Regular.otf", weight: "400" },
    { path: "../assets/fonts/Satoshi-Medium.otf", weight: "500" },
    { path: "../assets/fonts/Satoshi-Bold.otf", weight: "700" },
    { path: "../assets/fonts/Satoshi-Black.otf", weight: "900" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: [
    { path: "../assets/fonts/JetBrainsMono-Regular.ttf", weight: "400" },
    { path: "../assets/fonts/JetBrainsMono-Bold.ttf", weight: "700" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontVariables = `${clashDisplay.variable} ${satoshi.variable} ${jetbrainsMono.variable}`;
