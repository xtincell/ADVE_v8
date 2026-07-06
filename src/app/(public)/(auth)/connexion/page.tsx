import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { googleEnabled } from "@/server/auth";
import { getSessionUser } from "@/server/auth/guards";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/apres-connexion");

  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-3xl font-semibold">Connexion</h1>
      <p className="mt-2 text-sm text-ink-muted">Retrouvez votre espace La Fusée.</p>
      <LoginForm next={next ?? ""} withGoogle={googleEnabled()} />
      <p className="mt-6 text-sm text-ink-muted">
        Pas encore de compte ?{" "}
        <Link href="/diagnostic" className="font-medium text-accent hover:underline">
          Commencez par votre diagnostic gratuit
        </Link>
        .
      </p>
    </div>
  );
}
