"use client";

import dynamic from "next/dynamic";

// three.js chargé côté client uniquement (hors du bundle initial → LCP protégé).
// Le dégradé de repli du hero reste visible tant que le canvas n'est pas monté.
const HeroCanvas = dynamic(() => import("./hero-canvas"), { ssr: false });

export function HeroBackground() {
  return <HeroCanvas />;
}
