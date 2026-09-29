"use client";

import { useState, ElementType } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  CheckCircle2,
  Lock,
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpen,
  Briefcase,
  Building2,
  UserCog,
} from "lucide-react";
import { RoleCardConfig } from "../lib/role-card-config";
import { roleToIntentOrThrow } from "@/features/auth/services/role-intent";
import { LegalAcknowledgementDialog } from "@/features/legal/components/legal-acknowledgement-dialog";

const ICON_MAP: Record<string, ElementType> = {
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpen,
  Briefcase,
  Building2,
  UserCog,
};

interface RoleSelectionCardProps {
  config: RoleCardConfig;
}

export function RoleSelectionCard({ config }: RoleSelectionCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const Icon = ICON_MAP[config.iconName] || ShieldCheck;
  const intent = roleToIntentOrThrow(config.role);

  const isPreProvisioned =
    config.category === "pre_provisioned_admin" ||
    config.category === "secretary_provisioned_student";
  const needsAcdEmail =
    config.category === "self_service_internal" ||
    config.category === "provisioned_faculty" ||
    isPreProvisioned;

  return (
    <div className="bg-surface border-border flex h-full flex-col rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-center gap-4">
        <div className="bg-primary-soft text-selected-fg flex size-12 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-6" />
        </div>
        <div>
          <h3 className="text-title-md text-foreground font-semibold">{config.title}</h3>
          {isPreProvisioned && (
            <Badge variant="warning" className="mt-1 tracking-wide uppercase">
              <Lock className="size-3" />
              Pre-Provisioned
            </Badge>
          )}
        </div>
      </div>

      <p className="text-body-sm text-muted-foreground mb-6 flex-1">{config.description}</p>

      <div className="mt-auto space-y-4">
        {/* Domain Indicator */}
        <div className="text-caption text-muted-foreground bg-background border-border/50 flex items-start gap-2 rounded-lg border p-3">
          {needsAcdEmail ? (
            <>
              <ShieldAlert className="text-primary mt-0.5 size-4 shrink-0" />
              <span>ACD email required (@acd.edu.ph or @acdeducation.com)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />
              <span>Any Google account accepted</span>
            </>
          )}
        </div>

        {/* Action Area */}
        <Button
          onClick={() => setIsDialogOpen(true)}
          variant="outline"
          className="h-auto min-h-8 w-full min-w-0 py-1.5 text-center text-wrap break-words whitespace-normal shadow-sm [&_img]:shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- third-party
              brand lockup; a static decorative SVG gains nothing from the
              image optimizer and would need width/height plumbing. */}
          <img
            src="/logos/google-logo.svg"
            alt=""
            className="h-4 w-auto shrink-0"
            aria-hidden="true"
          />
          <span className="min-w-0 text-center leading-tight">{`Continue as ${config.title}`}</span>
        </Button>
      </div>
      <LegalAcknowledgementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        roleTitle={config.title}
        intent={intent}
      />
    </div>
  );
}
