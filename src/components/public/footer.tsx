import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Produit",
    links: [
      { href: "/methode", label: "La méthode ADVE" },
      { href: "/diagnostic", label: "Diagnostic gratuit" },
      { href: "/tarifs", label: "Tarifs" },
      { href: "/statut", label: "Statut du service" },
    ],
  },
  {
    title: "UPgraders",
    links: [
      { href: "/agence", label: "L'agence" },
      { href: "/services", label: "Services" },
      { href: "/realisations", label: "Réalisations" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "La Guilde",
    links: [
      { href: "/guilde", label: "Missions ouvertes" },
      { href: "/guilde/deposer", label: "Déposer une mission" },
      { href: "/guilde/talents", label: "Devenir talent" },
      { href: "/guilde/agences", label: "Agences partenaires" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/legal/cgu", label: "CGU" },
      { href: "/legal/cgv", label: "CGV" },
      { href: "/legal/mentions-legales", label: "Mentions légales" },
      { href: "/legal/confidentialite", label: "Confidentialité" },
      { href: "/legal/sla", label: "SLA" },
      { href: "/legal/dpa", label: "DPA" },
      { href: "/legal/trust-center", label: "Trust center" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface-sunken/40">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <Logo withTagline />
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              L&apos;OS de stratégie de marque de l&apos;industrie créative d&apos;Afrique francophone.
            </p>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-accent">
              De la poussière à l&apos;étoile
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-sm font-semibold">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-ink-muted hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col justify-between gap-2 border-t border-line pt-6 text-xs text-ink-faint sm:flex-row">
          <p>© {new Date().getFullYear()} UPgraders. Tous droits réservés.</p>
          <p>Dakar · Abidjan · Douala — paiement mobile money & carte.</p>
        </div>
      </div>
    </footer>
  );
}
