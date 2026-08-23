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
  UserCog
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

  const isSelfService = config.category === "self_service_internal" || config.category === "self_service_external";
  const needsAcdEmail = config.category === "self_service_internal" || config.category === "provisioned_faculty" || config.category === "pre_provisioned_admin";

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-2xl p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center justify-center size-12 rounded-xl bg-primary-soft text-selected-fg shrink-0">
          <Icon className="size-6" />
        </div>
        <div>
          <h3 className="text-title-md font-semibold text-foreground">{config.title}</h3>
          {!isSelfService && config.category === "pre_provisioned_admin" && (
            <Badge variant="warning" className="mt-1 uppercase tracking-wide">
              <Lock className="size-3" />
              Pre-Provisioned
            </Badge>
          )}
        </div>
      </div>

      <p className="text-body-sm text-muted-foreground flex-1 mb-6">
        {config.description}
      </p>

      <div className="space-y-4 mt-auto">
        {/* Domain Indicator */}
        <div className="text-caption text-muted-foreground flex items-start gap-2 bg-background p-3 rounded-lg border border-border/50">
          {needsAcdEmail ? (
            <>
              <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
              <span>ACD email required (@acd.edu.ph or @acdeducation.com)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
              <span>Any Google account accepted</span>
            </>
          )}
        </div>

        {/* Action Area */}
        <Button 
          onClick={() => setIsDialogOpen(true)}
          variant="outline"
          className="h-auto min-h-8 w-full min-w-0 py-1.5 shadow-sm whitespace-normal text-wrap break-words text-center [&_img]:shrink-0"
        >
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
