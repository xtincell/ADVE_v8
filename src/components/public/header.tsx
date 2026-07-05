import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClass } from "@/components/ui/button";
import { getSessionUser } from "@/server/auth/guards";
import { MobileNav } from "./mobile-nav";

const NAV = [
  { href: "/methode", label: "La méthode" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/guilde", label: "La Guilde" },
  { href: "/agence", label: "L'agence" },
  { href: "/contact", label: "Contact" },
];

function homeFor(roles: string[]): string {
  if (roles.includes("ADMIN") || roles.includes("OPERATOR")) return "/console";
  if (roles.includes("TALENT")) return "/creator";
  if (roles.includes("AGENCY")) return "/agency";
  return "/cockpit";
}

export async function PublicHeader() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="La Fusée — accueil">
          <Logo withTagline />
        </Link>
        <nav aria-label="Navigation principale" className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link href={homeFor(user.roles)} className={buttonClass({ variant: "outline", size: "sm" })}>
              Mon espace
            </Link>
          ) : (
            <Link href="/connexion" className="hidden text-sm text-ink-muted hover:text-ink sm:block">
              Connexion
            </Link>
          )}
          <Link href="/diagnostic" className={buttonClass({ size: "sm", className: "hidden sm:inline-flex" })}>
            Diagnostic gratuit
          </Link>
          <MobileNav items={NAV} connected={!!user} home={user ? homeFor(user.roles) : null} />
        </div>
      </div>
    </header>
  );
}
