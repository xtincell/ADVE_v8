import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { listPosts } from "@/server/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "La méthode, les marchés créatifs africains, les marques qui montent.",
};

export default function BlogPage() {
  const posts = listPosts();
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Blog</p>
      <h1 className="mt-3 text-3xl font-semibold md:text-5xl">Carnets de bord</h1>
      {posts.length === 0 ? (
        <EmptyState className="mt-10" title="Aucun article publié" description="Les premiers carnets arrivent bientôt." />
      ) : (
        <ul className="mt-10 space-y-8">
          {posts.map((p) => (
            <li key={p.slug} className="border-b border-line pb-8 last:border-0">
              <p className="font-mono text-xs text-ink-faint">
                {p.date && new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(p.date))}
              </p>
              <Link href={`/blog/${p.slug}`} className="group mt-1 block">
                <h2 className="font-display text-2xl font-semibold group-hover:text-accent">{p.title}</h2>
              </Link>
              <p className="mt-2 text-ink-muted">{p.description}</p>
              <Link href={`/blog/${p.slug}`} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
                Lire →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
