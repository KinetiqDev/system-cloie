"use client";

import { loadFacultyManagedCilosAction } from "@/lib/actions/course-bound-evaluation-actions";
import {
  saveFacultyTemplateDraftAction,
  validateFacultyTemplatePublishReadinessAction,
} from "@/lib/actions/faculty-template-actions";
import type { FacultyCourseContext } from "@/features/evaluations/types";
import { loadFacultyCourseGoOptionsAction } from "@/lib/actions/faculty-template-actions";
import type { TemplateCiloQuestionBinding } from "../types";
import { TemplateBuilder, type TemplateBuilderProps } from "./template-builder";

interface FacultyTemplateBuilderProps {
  /** Server-prepared course contexts the faculty member may bind CILOs to. */
  courseContexts: FacultyCourseContext[];
  programLabel: string;
  /** Existing template being edited or copied; absent for a new draft. */
  initialData?: TemplateBuilderProps["initialData"];
  /** CILO bindings carried in from the template being edited or copied. */
  initialBindings?: TemplateCiloQuestionBinding[];
  /** Direct question–GO bindings carried in from the template being edited or copied. */
  initialGoBindings?: TemplateBuilderProps["initialGoBindings"];
  startingFrom?: TemplateBuilderProps["startingFrom"];
  saveSuccessConfig?: TemplateBuilderProps["saveSuccessConfig"];
}

/**
 * Binds the shared builder to the faculty draft save action: an owned template
 * updates in place, a shared one becomes the faculty member's copy, and a draft
 * without a starting template is created blank.
 */
export function FacultyTemplateBuilder({
  courseContexts,
  initialBindings = [],
  initialGoBindings,
  programLabel,
  ...props
}: FacultyTemplateBuilderProps) {
  return (
    <TemplateBuilder
      {...props}
      facultyConfig={{
        courseContexts,
        initialBindings,
        initialGoBindings: initialGoBindings ?? [],
        loadManagedCilosAction: loadFacultyManagedCilosAction,
        loadCourseGoOptionsAction: loadFacultyCourseGoOptionsAction,
        validatePublishReadinessAction: validateFacultyTemplatePublishReadinessAction,
      }}
      onSave={saveFacultyTemplateDraftAction}
      programLabel={programLabel}
      toolsHref="/faculty/tools"
    />
  );
}
