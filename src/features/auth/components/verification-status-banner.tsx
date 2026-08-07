import { VerificationStatus } from "@prisma/client";
import { AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface VerificationStatusBannerProps {
  status: VerificationStatus;
}

export function VerificationStatusBanner({ status }: VerificationStatusBannerProps) {
  if (status === VerificationStatus.APPROVED) {
    return null;
  }

  if (status === VerificationStatus.PENDING) {
    return (
      <div className="mb-6">
        <Alert className="border-info/50 bg-info-soft text-info">
          <Clock className="text-info size-5" />
          <AlertTitle className="text-label-lg font-semibold tracking-wide">
            Verification Pending
          </AlertTitle>
          <AlertDescription className="text-body-sm mt-1">
            Your profile is currently under review by our administrators. You have limited access to
            some features until your account is verified.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (status === VerificationStatus.REJECTED) {
    return (
      <div className="mb-6">
        <Alert className="border-danger/50 bg-danger-soft text-danger">
          <AlertTriangle className="text-danger size-5" />
          <AlertTitle className="text-label-lg font-semibold tracking-wide">
            Verification Rejected
          </AlertTitle>
          <AlertDescription className="text-body-sm mt-1">
            We could not verify your profile. Please contact the administration for more information
            or to resolve this issue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}
