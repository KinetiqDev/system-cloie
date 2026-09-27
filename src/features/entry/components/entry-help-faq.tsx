import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "I am a Student but I have never signed in. Where do I start?",
    answer:
      "Start at Student sign-in with your ACD Google account (@acd.edu.ph or @acdeducation.com). Student accounts are created by the Secretary's office: if your account is not set up yet, you will see a not-yet-set-up explanation with Secretary support guidance. Do not use Faculty registration — it cannot provision a Student account.",
  },
  {
    question: "I submitted a Faculty request. What happens next?",
    answer:
      "Your request waits for institutional review and grants no Faculty workspace access until your eligibility is confirmed. If it is approved, your Faculty workspace opens on your next sign-in. If it is declined, you will see the outcome with reapplication steps.",
  },
  {
    question: "My Alumni or Industry Partner application was not approved. What now?",
    answer:
      "Following institutional review, declined external applications cannot open role dashboards. The decision message includes the next step, which may be reapplying with corrected details or contacting the Secretary's office.",
  },
  {
    question: "I used the wrong sign-in method for my account.",
    answer:
      "Internal workspaces (Student, Faculty, Secretary, Dean, Program Head, General Education Coordinator) always require current ACD Google sign-in. If you try a password or recovery session on an internal workspace, you will see a method-mismatch explanation directing you back to Google sign-in. External participants (Alumni, Industry Partner) may use either email-password or Google.",
  },
  {
    question: "My verification or recovery code expired. What do I do?",
    answer:
      "Codes have a limited lifetime. Request a new code from the verification page and enter the latest one — older codes stop working. If no email arrives, check spam, confirm the address spelling, then wait for the resend cooldown before requesting again.",
  },
  {
    question: "I forgot my external account password. How do I recover it?",
    answer:
      "Use Forgot password with your account email. If the email is eligible, a 6-digit recovery code is sent; enter it with a new password. The recovery session only sets the new password — it never opens a workspace or skips role, approval, or legal checks.",
  },
  {
    question: "Why do sign-in pages never say whether my email exists?",
    answer:
      "Public login, signup, resend, and recovery responses intentionally reveal no account existence or provider, so accounts cannot be enumerated. You always see the same message for an address regardless of what the system holds for it.",
  },
];

/**
 * Read-mode help and FAQ for the public landing. Mirrors the failure states
 * of the scoped entrances so every dead end leads somewhere clear.
 */
export function EntryHelpFaq() {
  return (
    <div className="space-y-4">
      {FAQ_ITEMS.map((item) => (
        <Disclosure
          key={item.question}
          className="border-border bg-surface rounded-xl border px-5 py-1 shadow-sm"
        >
          <DisclosureTrigger variant="card">
            <span className="text-body-md text-foreground font-semibold">{item.question}</span>
          </DisclosureTrigger>
          <DisclosureContent>
            <p className="text-body-md text-muted-foreground pb-3 leading-relaxed">{item.answer}</p>
          </DisclosureContent>
        </Disclosure>
      ))}
    </div>
  );
}
