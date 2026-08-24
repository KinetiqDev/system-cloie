-- ph-evidence hardening: targeted indexes for Program Head evidence queries.
-- Evidence: EXPLAIN ANALYZE on realistic seed volume (docs/reviews/ph-evidence-explain-analyze.md).
-- The dashboard rating scan seq-scanned quantitative_response_items once per
-- response (12s at ~36k items); response-detail item lookups and the
-- deployment groupBy similarly lacked supporting indexes.

-- CreateIndex
CREATE INDEX "quantitative_response_items_response_id_idx" ON "quantitative_response_items"("response_id");

-- CreateIndex
CREATE INDEX "qualitative_response_items_response_id_idx" ON "qualitative_response_items"("response_id");

-- CreateIndex
CREATE INDEX "responses_deployment_id_idx" ON "responses"("deployment_id");
