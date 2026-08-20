import { PublicRouteLoading } from "@/components/layout/public-route-loading";
import { ROLE_CARDS_STAFF } from "@/features/portals/lib/role-card-config";

export default function Loading() {
  return <PublicRouteLoading variant="portal" cards={ROLE_CARDS_STAFF} />;
}
