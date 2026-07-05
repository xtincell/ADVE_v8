import Link from "next/link";

const DOCS = [
  { href: "/legal/cgu", label: "CGU" },
  { href: "/legal/cgv", label: "CGV" },
  { href: "/legal/sla", label: "SLA" },
  { href: "/legal/dpa", label: "DPA" },
  { href: "/legal/mentions-legales", label: "Mentions légales" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/trust-center", label: "Trust center" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[190px_1fr]">
      <nav aria-label="Documents légaux" className="md:sticky md:top-24 md:self-start">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Légal</p>
        <ul className="mt-3 space-y-1.5">
          {DOCS.map((d) => (
            <li key={d.href}>
              <Link href={d.href} className="text-sm text-ink-muted hover:text-ink">
                {d.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
