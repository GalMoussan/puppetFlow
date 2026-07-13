/**
 * Run Viewer Page
 *
 * Displays a completed (or in-progress) run with scene cards.
 * Route: /runs/[id]
 *
 * @module app/runs/[id]/page
 */

import { RunViewerPage } from "@/components/run/RunViewerPage";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function RunPage({ params }: PageProps) {
  const resolved = "then" in params ? await params : params;
  return <RunViewerPage runId={resolved.id} />;
}
