/**
 * Theme Pack Editor Page
 *
 * Full visual editor for theme pack canon, characters, and universe rules.
 *
 * @module app/theme-packs/[id]/edit/page
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ThemePackEditor } from "@/components/theme-pack/ThemePackEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ThemePackEditPage({ params }: PageProps) {
  const { id } = await params;

  const themePack = await prisma.themePack.findUnique({
    where: { id },
  });

  if (!themePack) {
    notFound();
  }

  // Convert Prisma JSON to typed canon
  const canon = themePack.canon as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-zinc-950">
      <ThemePackEditor
        themePackId={themePack.id}
        themePackName={themePack.name}
        initialCanon={canon}
      />
    </div>
  );
}
