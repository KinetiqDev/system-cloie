"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CentralOutcomeAdministration } from "../services/manage-central-outcomes";
import {
  reviewCentralOutcomeAction,
  commitCentralOutcomeAction,
} from "@/lib/actions/central-outcome-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { PO_CLASSIFICATION_LABELS } from "../po-classification";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";

type Review = Extract<
  Awaited<ReturnType<typeof reviewCentralOutcomeAction>>,
  { success: true }
>["data"];

export function CentralOutcomesPage({ data }: { data: CentralOutcomeAdministration }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [editing, setEditing] = useState<CentralOutcomeAdministration["common"][number] | null>(
    null
  );
  const [programId, setProgramId] = useState(data.programs[0]?.id ?? "");
  const [poEditingId, setPOEditingId] = useState("");
  const program = data.programs.find((item) => item.id === programId);
  const [classification, setClassification] = useState<"COMMON" | "INSTITUTION_SPECIFIC">("COMMON");
  const [commonId, setCommonId] = useState("");
  const selected = data.common.find((item) => item.id === commonId);

  function prepare(value: unknown) {
    setError(null);
    startTransition(async () => {
      const result = await reviewCentralOutcomeAction(value);
      if (result.success) setReview(result.data);
      else setError(result.error);
    });
  }
  function save() {
    if (!review) return;
    startTransition(async () => {
      const result = await commitCentralOutcomeAction(review, true);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setReview(null);
      setEditing(null);
      setPOEditingId("");
      setCommonId("");
      router.refresh();
    });
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header>
        <h1 className="text-heading-xl">Common and Institution-specific outcomes</h1>
        <p className="text-body-sm text-muted-foreground mt-1">
          Secretary and Dean manage the shared Common PO catalog and its program adoptions.
          Institutional Learning Outcomes remain separate.
        </p>
      </header>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <section className="flex flex-col gap-4" aria-labelledby="common-catalog-title">
        <h2 id="common-catalog-title" className="text-heading-lg">
          Shared Common PO catalog
        </h2>
        <form
          key={editing?.id ?? "new"}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            prepare({
              kind: "COMMON_PO",
              action: editing ? "update" : "create",
              ...(editing ? { id: editing.id } : {}),
              code: fields.get("code"),
              description: fields.get("description"),
              sourceRef: fields.get("sourceRef"),
            });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="common-code">Common PO code</FieldLabel>
              <Input
                id="common-code"
                name="code"
                defaultValue={editing?.code}
                required
                maxLength={20}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="common-description">Approved statement</FieldLabel>
              <Textarea
                id="common-description"
                name="description"
                defaultValue={editing?.description}
                required
                minLength={3}
                maxLength={1000}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="common-source">Source reference</FieldLabel>
              <Input
                id="common-source"
                name="sourceRef"
                defaultValue={editing?.source_ref ?? ""}
                maxLength={1000}
              />
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              Review {editing ? "correction" : "new Common PO"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
        {data.common.length === 0 && (
          <p className="text-body-sm text-muted-foreground">
            No Common POs yet. Add a shared definition before adopting it or mapping GE CILOs.
          </p>
        )}
        <ol className="flex flex-col gap-3">
          {data.common.map((item, index) => (
            <li
              key={item.id}
              className="border-border flex min-w-0 flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{item.code}</Badge>
                <Badge variant="outline">{item.is_active ? "Active" : "Archived"}</Badge>
                <span className="text-body-sm">
                  {item._count.program_pos} program adoptions · {item._count.ge_mappings} GE
                  mappings
                </span>
              </div>
              <p className="text-body-sm break-words">{item.description}</p>
              {item.source_ref && (
                <p className="text-body-sm text-muted-foreground break-words">{item.source_ref}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEditing(item)}>
                  Edit {item.code}
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    prepare({
                      kind: "COMMON_PO",
                      action: item.is_active ? "archive" : "restore",
                      id: item.id,
                    })
                  }
                >
                  {item.is_active ? "Archive" : "Restore"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={index === 0 || pending}
                  onClick={() => {
                    const ids = data.common.map((row) => row.id);
                    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                    prepare({ kind: "COMMON_PO", action: "reorder", orderedIds: ids });
                  }}
                >
                  Move up
                </Button>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="flex flex-col gap-4" aria-labelledby="program-adoption-title">
        <h2 id="program-adoption-title" className="text-heading-lg">
          Program Common and Institution-specific POs
        </h2>
        <Field>
          <FieldLabel htmlFor="admin-po-program">Program</FieldLabel>
          <Select
            value={programId}
            onValueChange={(value) => {
              setProgramId(value ?? "");
              setPOEditingId("");
            }}
          >
            <SelectTrigger id="admin-po-program" className="w-full">
              <SelectValue>{program?.code ?? "Select program"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {data.programs.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <form
          key={`${programId}:${poEditingId}`}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            prepare({
              kind: "PO",
              action: poEditingId ? "update" : "create",
              ...(poEditingId ? { id: poEditingId } : {}),
              programId,
              code: fields.get("code"),
              description:
                classification === "COMMON" ? selected?.description : fields.get("description"),
              classification,
              commonOutcomeId: classification === "COMMON" ? commonId : null,
            });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="admin-po-category">Classification</FieldLabel>
              <Select
                value={classification}
                onValueChange={(value) => {
                  if (value === "COMMON" || value === "INSTITUTION_SPECIFIC")
                    setClassification(value);
                }}
              >
                <SelectTrigger id="admin-po-category" className="w-full">
                  <SelectValue>
                    {classification === "COMMON" ? "Common" : "Institution-specific"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="COMMON">Common</SelectItem>
                    <SelectItem value="INSTITUTION_SPECIFIC">Institution-specific</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {classification === "COMMON" && (
              <Field>
                <FieldLabel htmlFor="admin-common-reference">Shared Common PO</FieldLabel>
                <Select
                  value={commonId || null}
                  onValueChange={(value) => setCommonId(value ?? "")}
                >
                  <SelectTrigger id="admin-common-reference" className="w-full">
                    <SelectValue>{selected?.code ?? "Select a Common PO"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data.common
                        .filter((item) => item.is_active)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.code} · {item.description}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-body-sm">{selected?.description}</p>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="admin-local-code">Program-local PO code</FieldLabel>
              <Input
                id="admin-local-code"
                name="code"
                required
                maxLength={20}
                defaultValue={program?.pos.find((item) => item.id === poEditingId)?.code}
              />
            </Field>
            {classification === "INSTITUTION_SPECIFIC" && (
              <Field>
                <FieldLabel htmlFor="admin-local-description">Program outcome statement</FieldLabel>
                <Textarea
                  id="admin-local-description"
                  name="description"
                  required
                  minLength={3}
                  maxLength={1000}
                  defaultValue={program?.pos.find((item) => item.id === poEditingId)?.description}
                />
              </Field>
            )}
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending || !programId} type="submit">
              Review program PO
            </Button>
            {poEditingId && (
              <Button type="button" variant="outline" onClick={() => setPOEditingId("")}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
        {program?.pos.map((item) => (
          <article
            key={item.id}
            className="border-border flex flex-col gap-2 rounded-lg border p-4"
          >
            <div className="flex flex-wrap gap-2">
              <Badge>{item.code}</Badge>
              <Badge variant="secondary">{PO_CLASSIFICATION_LABELS[item.classification]}</Badge>
              <Badge variant="outline">{item.is_active ? "Active" : "Archived"}</Badge>
            </div>
            <p className="text-body-sm break-words">{item.description}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPOEditingId(item.id);
                  // A legacy UNCLASSIFIED row adopts as Institution-specific by
                  // default; the reviewer can still choose Common.
                  setClassification(
                    item.classification === "COMMON" ? "COMMON" : "INSTITUTION_SPECIFIC"
                  );
                  setCommonId(item.common_outcome_id ?? "");
                }}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  prepare({
                    kind: "PO",
                    action: item.is_active ? "archive" : "restore",
                    programId,
                    id: item.id,
                  })
                }
              >
                {item.is_active ? "Archive" : "Restore"}
              </Button>
            </div>
          </article>
        ))}
      </section>
      <ResponsiveDialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open) setReview(null);
        }}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Review outcome change</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Confirm the exact change. Shared statement corrections update all linked program POs.
              Archiving a Common PO removes its GE readiness eligibility but preserves mappings and
              local active states.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="flex flex-col gap-4">
            {review?.input.kind === "COMMON_PO" && review.input.action === "archive" && (
              <Alert variant="warning">
                <AlertDescription>
                  GE courses that depend on this outcome as their only active Common PO mapping will
                  become incomplete. New publication will be blocked until Faculty map the affected
                  CILOs to another active Common PO. Linked local POs stay active and their
                  historical wording stays available.
                </AlertDescription>
              </Alert>
            )}
            <h3 className="text-heading-md">Before</h3>
            <pre className="bg-muted text-body-sm overflow-auto rounded-lg p-3 break-all whitespace-pre-wrap">
              {JSON.stringify(review?.before, null, 2)}
            </pre>
            <h3 className="text-heading-md">After</h3>
            <pre className="bg-muted text-body-sm overflow-auto rounded-lg p-3 break-all whitespace-pre-wrap">
              {JSON.stringify(review?.after, null, 2)}
            </pre>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={pending} onClick={() => setReview(null)}>
                Back
              </Button>
              <Button loading={pending} onClick={save}>
                Confirm change
              </Button>
            </div>
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
