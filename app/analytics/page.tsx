/**
 * Analytics Dashboard Page
 *
 * Displays usage statistics, cost tracking, and run history.
 *
 * @module app/analytics/page
 */

import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const metadata = {
  title: "Analytics | PuppetFlow",
  description: "Usage analytics and cost tracking for PuppetFlow generations",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
