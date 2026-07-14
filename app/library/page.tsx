/**
 * Generation Library
 *
 * Permanent dashboard of every run ever generated through the app.
 * Data comes from the Runs table (grows with the DB).
 *
 * Route: /library
 *
 * @module app/library/page
 */

import { LibraryPage } from "@/components/library";

export const metadata = {
  title: "Library · PuppetFlow",
  description: "All generations created in PuppetFlow",
};

export default function LibraryRoute() {
  return <LibraryPage />;
}
