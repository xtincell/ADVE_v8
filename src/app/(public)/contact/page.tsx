import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { env } from "@/env";

export const metadata: Metadata = {
  title: "Contact",
  description: "Parler à l'équipe UPgraders : WhatsApp d'abord, email sinon.",
};

export default function ContactPage() {
  const whatsapp = env().MANUAL_PAYMENT_WHATSAPP_NUMBER;
  const email = env().CONTACT_EMAIL;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Contact</p>
      <h1 className="mt-3 text-3xl font-semibold md:text-5xl">On se parle ?</h1>
      <p className="mt-4 max-w-xl text-ink-muted">
        Ici, le canal roi c&apos;est WhatsApp — comme pour nos paiements. Une question sur la
        méthode, un devis, un partenariat : écrivez-nous, un humain répond.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <h2 className="font-display text-lg font-semibold">WhatsApp</h2>
            {whatsapp ? (
              <>
                <p className="mt-2 text-sm text-ink-muted">Réponse en journée (GMT), lun.–sam.</p>
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Bonjour UPgraders — je vous écris depuis le site La Fusée.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass({ className: "mt-4" })}
                >
                  Ouvrir WhatsApp
                </a>
              </>
            ) : (
              <p className="mt-2 rounded-(--radius-sm) bg-surface-sunken px-3 py-2 font-mono text-xs text-ink-muted">
                NUMÉRO NON CONFIGURÉ — l&apos;opérateur doit définir MANUAL_PAYMENT_WHATSAPP_NUMBER.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <h2 className="font-display text-lg font-semibold">Email</h2>
            <p className="mt-2 text-sm text-ink-muted">Pour les sujets qui méritent une trace écrite.</p>
            {email ? (
              <a href={`mailto:${email}`} className={buttonClass({ variant: "outline", className: "mt-4" })}>
                {email}
              </a>
            ) : (
              <p className="mt-2 rounded-(--radius-sm) bg-surface-sunken px-3 py-2 font-mono text-xs text-ink-muted">
                EMAIL NON CONFIGURÉ — l&apos;opérateur doit définir CONTACT_EMAIL.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 rounded-(--radius-md) border border-line bg-surface-raised p-5 text-sm text-ink-muted">
        <p>
          <strong className="text-ink">Vous êtes une marque ?</strong> Le plus rapide reste le{" "}
          <Link href="/diagnostic" className="underline">diagnostic gratuit</Link> : votre score
          arrive avec la conversation.
        </p>
        <p className="mt-2">
          <strong className="text-ink">Vous êtes talent ou agence ?</strong> Rejoignez{" "}
          <Link href="/guilde" className="underline">La Guilde</Link> — c&apos;est la porte
          d&apos;entrée canonique du réseau.
        </p>
      </div>
    </div>
  );
}
