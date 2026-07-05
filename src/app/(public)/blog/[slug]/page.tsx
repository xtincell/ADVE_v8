import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, listPosts } from "@/server/blog";

export async function generateStaticParams() {
  return listPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  return post ? { title: post.title, description: post.description } : {};
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-14">
      <Link href="/blog" className="font-mono text-xs uppercase tracking-widest text-accent hover:underline">
        ← Blog
      </Link>
      <h1 className="mt-4 text-3xl font-semibold md:text-4xl">{post.title}</h1>
      {post.date && (
        <p className="mt-2 font-mono text-xs text-ink-faint">
          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(post.date))}
        </p>
      )}
      <div
        className="prose-blog mt-8"
        // Contenu markdown local du repo (content/blog), rendu par marked — pas d'entrée utilisateur.
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </article>
  );
}
