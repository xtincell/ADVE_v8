import type { Block, SectionContent } from "@/server/oracle/blocks";
import { cn } from "@/lib/cn";

// Rendu web du modèle de blocs Oracle — miroir exact du rendu PDF.

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p className="text-sm leading-relaxed">{block.text}</p>;
    case "list":
      return block.ordered ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {block.items.map((i) => (
            <li key={i.slice(0, 60)}>{i}</li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-1 text-sm">
          {block.items.map((i) => (
            <li key={i.slice(0, 60)} className="flex gap-2">
              <span aria-hidden className="text-accent">•</span>
              {i}
            </li>
          ))}
        </ul>
      );
    case "kv":
      return (
        <dl className="grid gap-2">
          {block.rows.map(([k, v]) => (
            <div key={k} className="grid gap-0.5 sm:grid-cols-[160px_1fr] sm:gap-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{k}</dt>
              <dd className="text-sm">{v}</dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left">
                {block.head.map((h) => (
                  <th key={h} className="py-1.5 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2 pr-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <div
          className={cn(
            "rounded-(--radius-sm) border-l-2 bg-surface-sunken/60 px-4 py-3 text-sm",
            block.tone === "warning" ? "border-gold" : block.tone === "success" ? "border-success" : "border-accent",
          )}
        >
          {block.text}
        </div>
      );
    case "score":
      return (
        <div>
          <p className="text-sm font-semibold">{block.label}</p>
          <p className="font-mono text-xl font-bold text-accent">
            {block.value} <span className="text-sm font-normal text-ink-faint">/ {block.max}</span>
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(block.value / block.max) * 100}%` }} />
          </div>
        </div>
      );
    case "empty":
      return (
        <div className="rounded-(--radius-sm) border border-dashed border-line-strong px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gold-strong">{block.status}</p>
          <p className="mt-1 text-sm text-ink-muted">{block.note}</p>
        </div>
      );
  }
}

export function SectionBlocks({ content }: { content: SectionContent }) {
  return (
    <div className="space-y-4">
      {content.blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
      {content.sources.length > 0 && (
        <p className="border-t border-line pt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          Sources : {content.sources.join(" · ")}
        </p>
      )}
    </div>
  );
}
