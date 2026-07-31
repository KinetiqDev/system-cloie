"use client";

import { useState, ElementType } from "react";
import { Button } from "@/components/ui/button";
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
        <div className="flex items-center justify-center size-12 rounded-xl bg-primary-soft text-primary shrink-0">
          <Icon className="size-6" />
        </div>
        <div>
          <h3 className="text-title-md font-semibold text-text-primary">{config.title}</h3>
          {!isSelfService && config.category === "pre_provisioned_admin" && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-medium tracking-wide uppercase">
              <Lock className="size-3" />
              Pre-Provisioned
            </span>
          )}
        </div>
      </div>

      <p className="text-body-sm text-text-secondary flex-1 mb-6">
        {config.description}
      </p>

      <div className="space-y-4 mt-auto">
        {/* Domain Indicator */}
        <div className="text-caption text-text-muted flex items-start gap-2 bg-background p-3 rounded-lg border border-border/50">
          {needsAcdEmail ? (
            <>
              <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
              <span>ACD email required (@acd.edu.ph or @acdeducation.com)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
              <span>Any Google account accepted</span>
            </>
          )}
        </div>

        {/* Action Area */}
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="w-full bg-white text-text-primary border border-border hover:bg-surface-hover shadow-sm"
        >
          <img
              src="/logos/google-logo.svg" 
              alt="" 
              className="h-4 w-auto mr-2" 
              aria-hidden="true" 
          />
          {`Continue as ${config.title}`}
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
