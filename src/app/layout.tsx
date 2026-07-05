import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "La Fusée — l'OS de votre marque, par UPgraders",
    template: "%s · La Fusée",
  },
  description:
    "La Fusée transforme des marques en icônes culturelles. Diagnostic scoré gratuit, stratégie complète, réseau de talents — la méthode ADVE pour l'industrie créative d'Afrique francophone.",
};

// Applique le thème avant le premier paint (localStorage > préférence système).
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${fontVariables} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
