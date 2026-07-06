import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { SectionBlocks } from "@/components/oracle-blocks";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { llmAvailable } from "@/server/llm/gateway";
import { getReportWithSections } from "@/server/oracle/generate";
import type { SectionContent } from "@/server/oracle/blocks";
import { sectionDef } from "@/server/oracle/sections";
import { TIER_LABELS } from "@/server/scoring/score";
import { enrichSectionAction, regenerateSectionAction } from "../../actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "gold" | "danger" | "info" | "neutral" }> = {
  COMPLETE: { label: "Complète", variant: "success" },
  STALE: { label: "Périmée", variant: "gold" },
  FAILED: { label: "Échec", variant: "danger" },
  GENERATING: { label: "Génération…", variant: "info" },
  PENDING: { label: "En attente", variant: "neutral" },
};

export default async function OracleReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/cockpit/livrables/oracle/${id}`);
  const report = await getReportWithSections(id);
  if (!report) notFound();
  const brand = await getOwnedBrand(user, report.brandId);
  if (!brand) notFound();
  const llmAssist = llmAvailable();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cockpit/livrables" className="font-mono text-xs uppercase tracking-widest text-accent hover:underline">
          ← Livrables
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">
              Oracle <span className="text-ink-faint">v{report.version}</span> — {report.brand.name}
            </h1>
            <p className="mt-1 font-mono text-sm text-ink-muted">
              {report.scoreAtGen}/200 · {TIER_LABELS[report.tierAtGen]} ·{" "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(report.createdAt)} ·
              hash {report.pillarsHash.slice(0, 12)}
            </p>
          </div>
          <a href={`/api/oracle/${report.id}/pdf`} className={buttonClass({})}>
            Exporter en PDF
          </a>
        </div>
        {report.stale && (
          <div className="mt-4 rounded-(--radius-md) border border-gold bg-gold-soft px-4 py-3 text-sm">
            Le socle de la marque a été amendé depuis cette génération — ce rapport reste valable
            comme photographie datée, mais générez une nouvelle version pour la stratégie à jour.
          </div>
        )}
      </div>

      <nav aria-label="Sommaire du rapport" className="rounded-(--radius-md) border border-line bg-surface-raised p-4">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Sommaire</p>
        <ol className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {report.sections.map((s) => (
            <li key={s.id}>
              <a href={`#section-${s.number}`} className="text-ink-muted hover:text-accent">
                {String(s.number).padStart(2, "0")} · {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-8">
        {report.sections.map((s) => {
          const status = STATUS_LABELS[s.status] ?? STATUS_LABELS.PENDING!;
          return (
            <section key={s.id} id={`section-${s.number}`} className="scroll-mt-20 rounded-(--radius-md) border border-line bg-surface-raised p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-accent">{String(s.number).padStart(2, "0")}</span>
                  <h2 className="font-display text-lg font-semibold">{s.title}</h2>
                  <Badge variant="outline">{s.tier}</Badge>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {s.llmUsed && <Badge variant="info">Enrichie IA</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {(s.status === "FAILED" || s.status === "STALE") && (
                    <form action={regenerateSectionAction}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="number" value={s.number} />
                      <Button type="submit" variant="outline" size="sm">
                        Régénérer cette section
                      </Button>
                    </form>
                  )}
                  {llmAssist && sectionDef(s.number).llmEligible && s.status === "COMPLETE" && (
                    <form action={enrichSectionAction}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="number" value={s.number} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        title="Réécrit cette section depuis le snapshot gelé — le déterministe reste la base en cas d'échec"
                      >
                        {s.llmUsed ? "Ré-enrichir (IA)" : "Enrichir (IA)"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
              <div className="pt-4">
                {s.status === "COMPLETE" && s.content ? (
                  <SectionBlocks content={s.content as unknown as SectionContent} />
                ) : s.status === "STALE" && s.content ? (
                  <div className="opacity-60">
                    <SectionBlocks content={s.content as unknown as SectionContent} />
                  </div>
                ) : (
                  <p className="text-sm italic text-ink-muted">
                    {s.error ?? "Section non générée."}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
