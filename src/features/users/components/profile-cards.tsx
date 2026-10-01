import { Mail, ShieldCheck, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProfilePersonalInfoCardProps = {
  fullName: string;
  email?: string | null;
  role: string;
  labelClassName?: string;
  titleClassName?: string;
  labelTag?: "label" | "p";
};

export function ProfilePersonalInfoCard({
  fullName,
  email,
  role,
  labelClassName = "text-label-sm text-muted-foreground tracking-wider uppercase",
  titleClassName = "text-lg font-bold",
  labelTag = "label",
}: ProfilePersonalInfoCardProps) {
  const Label = labelTag;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <div className="bg-primary-soft text-selected-fg rounded-lg p-2">
          <User aria-hidden="true" className="size-5" />
        </div>
        <div>
          <CardTitle className={titleClassName}>Personal Information</CardTitle>
          <CardDescription>Basic account details</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1">
          <Label className={labelClassName}>Full Name</Label>
          <p className="text-sm font-semibold">{fullName}</p>
        </div>
        <div className="space-y-1">
          <Label className={labelClassName}>Email Address</Label>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Mail aria-hidden="true" className="text-text-muted size-4" />
            {email ?? "No email available"}
          </div>
        </div>
        <div className="pt-2">
          <Badge variant="secondary" className="bg-primary-soft text-selected-fg font-bold">
            Role: {role}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileDataPrivacyNotice() {
  return (
    <Card className="border-border border-l-primary border-l-4 shadow-sm md:col-span-2">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="bg-primary-soft text-selected-fg shrink-0 rounded-lg p-2">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-text-primary font-bold">Data Privacy & Responses</h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Your evaluation responses are handled confidentially. Authorized Program Heads may
              review submitted responses for quality assurance and accreditation purposes. Once an
              evaluation is finalized and submitted, it cannot be modified to protect the integrity
              of results.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
