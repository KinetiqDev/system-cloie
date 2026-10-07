import { test } from "@playwright/test";
import { verifyAttainmentGuide } from "./support/attainment";

test("Program Head attainment guide explains canonical chart colors", async ({ page }) => {
  await verifyAttainmentGuide(page);
});
