import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";

// Surface marketing verrouillée en sombre cinématique (Page Theme Lock : une
// seule identité visuelle, aucune inversion de thème en cours de scroll).
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="flex min-h-screen flex-col bg-surface text-ink">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
