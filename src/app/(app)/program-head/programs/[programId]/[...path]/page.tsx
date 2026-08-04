import { notFound } from "next/navigation";

/**
 * Every Program Head management destination now has a real page under
 * `programs/[programId]/`. This catch-all exists only to make any other
 * nested path under a selected Program fail closed instead of rendering a
 * placeholder that could imply cross-Program behavior.
 */
export default async function SelectedProgramUnknownChildPage() {
  notFound();
}
