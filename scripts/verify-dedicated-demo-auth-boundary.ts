import { pathToFileURL } from "node:url";
import { verifyDedicatedDemoAuthBoundary } from "./verify-production-auth-boundary";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyDedicatedDemoAuthBoundary().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
