"use client";

import { useRouter } from "next/navigation";
import { TemplateBuilder } from "./template-builder";
import { createBaselineCopyAction } from "@/lib/actions/program-head-baseline-actions";
import {
  createProgramHeadTemplateAction,
  updateProgramHeadTemplateAction,
} from "@/lib/actions/program-head-template-actions";
import type { TemplateBuilderProps } from "./template-builder";
import { buildProgramHeadPublishToolPath, buildProgramHeadToolsPath } from "@/lib/constants/program-head-routes";

interface ProgramHeadTemplateBuilderProps extends Omit<
  TemplateBuilderProps,
  "onSave" | "onSaveResult" | "isInstitutionalBaseline" | "onSaveAsCopy" | "onPublish"
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
  const handleSave = async (formData: FormData) => {
    formData.set("programId", programId);
    return templateId
      ? await updateProgramHeadTemplateAction(formData)
      : await createProgramHeadTemplateAction(formData);
  };

  const handlePublish = templateId
     ? () => router.push(buildProgramHeadPublishToolPath(programId, templateId))
    : undefined;

  return (
    <TemplateBuilder
      {...props}
      onSave={handleSave}
      isInstitutionalBaseline={isInstitutionalBaseline}
      onSaveAsCopy={(baselineId, customName, structure, ploBindings) =>
        createBaselineCopyAction(programId, baselineId, customName, structure, ploBindings)
      }
      toolsHref={buildProgramHeadToolsPath(programId)}
      onPublish={handlePublish}
    />
  );
}
