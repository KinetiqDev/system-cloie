"use client";

import { TemplateBuilder } from "./template-builder";
import type { TemplateBuilderProps } from "./template-builder";

type ManagementTemplateBuilderProps = Omit<
  TemplateBuilderProps,
  "isInstitutionalBaseline" | "onSaveAsCopy" | "onPublish"
> & {
  toolsHref: string;
};

export function ManagementTemplateBuilder(props: ManagementTemplateBuilderProps) {
  return (
    <TemplateBuilder
      {...props}
      isInstitutionalBaseline={false}
      saveSuccessConfig={{ toastMessage: "Instrument template saved." }}
    />
  );
}
