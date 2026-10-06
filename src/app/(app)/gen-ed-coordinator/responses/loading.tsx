import { ResponsesRouteFallback } from "@/features/response-review/components/responses-content-fallback";

// The Coordinator has a single Course-bound view, so there is no tab strip to
// reserve space for while the route resolves.
export default function Loading() {
  return <ResponsesRouteFallback showViewTabs={false} />;
}
