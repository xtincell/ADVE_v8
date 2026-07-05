import localFont from "next/font/local";

// Identité UPgraders (cahier §10) : Clash Display (display), Satoshi (texte), JetBrains Mono (données).
export const clashDisplay = localFont({
  src: [
    { path: "../assets/fonts/ClashDisplay-400.woff2", weight: "400" },
    { path: "../assets/fonts/ClashDisplay-500.woff2", weight: "500" },
    { path: "../assets/fonts/ClashDisplay-600.woff2", weight: "600" },
    { path: "../assets/fonts/ClashDisplay-700.woff2", weight: "700" },
  ],
  variable: "--font-clash",
  display: "swap",
});

export const satoshi = localFont({
  src: [
    { path: "../assets/fonts/Satoshi-400.woff2", weight: "400" },
    { path: "../assets/fonts/Satoshi-500.woff2", weight: "500" },
    { path: "../assets/fonts/Satoshi-700.woff2", weight: "700" },
    { path: "../assets/fonts/Satoshi-900.woff2", weight: "900" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: [
    { path: "../assets/fonts/JetBrainsMono-Regular.woff2", weight: "400" },
    { path: "../assets/fonts/JetBrainsMono-Bold.woff2", weight: "700" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontVariables = `${clashDisplay.variable} ${satoshi.variable} ${jetbrainsMono.variable}`;
