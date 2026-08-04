"use client";

import { useRouter } from "next/navigation";
import { TemplateBuilder } from "./template-builder";
import { createBaselineCopyAction } from "@/lib/actions/program-head-baseline-actions";
import type { TemplateBuilderProps } from "./template-builder";
import { buildProgramHeadPublishToolPath, buildProgramHeadToolsPath } from "@/lib/constants/program-head-routes";

interface ProgramHeadTemplateBuilderProps extends Omit<
  TemplateBuilderProps,
  "onSaveResult" | "isInstitutionalBaseline" | "onSaveAsCopy" | "onPublish"
> {
  isInstitutionalBaseline?: boolean;
  programId: string;
}

export function ProgramHeadTemplateBuilder({
  isInstitutionalBaseline = false,
  programId,
  ...props
}: ProgramHeadTemplateBuilderProps) {
  const router = useRouter();
  const templateId = props.initialData?.id;

  const handlePublish = templateId
     ? () => router.push(buildProgramHeadPublishToolPath(programId, templateId))
    : undefined;

  return (
    <TemplateBuilder
      {...props}
      isInstitutionalBaseline={isInstitutionalBaseline}
       onSaveAsCopy={(baselineId, customName, structure) =>
         createBaselineCopyAction(programId, baselineId, customName, structure)
       }
       toolsHref={buildProgramHeadToolsPath(programId)}
      onPublish={handlePublish}
    />
  );
}
