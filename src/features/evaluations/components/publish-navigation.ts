/**
 * Upward navigation for the publish pages. The template builder hands off with
 * `from=builder` when its save-then-publish confirm sends the author straight
 * here, so Back returns to the template they were editing; every other entry
 * point returns to the Evaluation Tools list they started from.
 */
export const PUBLISH_FROM_BUILDER = "builder";

export type PublishBackNavigation = {
  href: string;
  label: string;
};

export function resolvePublishBackNavigation({
  from,
  builderHref,
  toolsHref,
}: {
  from: string | undefined;
  /** Edit route for the template being published; absent when none is selected. */
  builderHref: string | undefined;
  toolsHref: string;
}): PublishBackNavigation {
  if (from === PUBLISH_FROM_BUILDER && builderHref) {
    return { href: builderHref, label: "Back to Template Builder" };
  }

  return { href: toolsHref, label: "Back to Evaluation Tools" };
}
