import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "I am a Student. Where do I start?",
    answer:
      "Sign in with your ACD Google account. The Secretary's office sets up Student accounts; if yours is not ready, contact them for help.",
  },
  {
    question: "I submitted a Faculty request. What happens next?",
    answer:
      "The Secretary's office reviews your request. You cannot use the Faculty workspace until it is approved. Sign in again to see the decision; if it was not approved, you can reapply.",
  },
  {
    question: "My Alumni or Industry Partner application was not approved. What now?",
    answer:
      "Following institutional review, declined external applications cannot open role dashboards. The decision message includes the next step, which may be reapplying with corrected details or contacting the Secretary's office.",
  },
  {
    question: "Why can't I use my password for a staff or Student workspace?",
    answer:
      "Students, Faculty, and staff must use an ACD Google account. Alumni and Industry Partners can use a password or Google. Return to the right sign-in page and choose Google for an internal workspace.",
  },
  {
    question: "My verification or recovery code expired. What do I do?",
    answer:
      "Request a new code and enter the latest one. Check your spam folder and email spelling if it does not arrive; wait for the resend timer before trying again.",
  },
  {
    question: "I forgot my password. How do I recover it?",
    answer:
      "Use Forgot password on the Alumni and partner sign-in page. Enter the six-digit code sent to your email and set a new password. Sign in again afterward.",
  },
  {
    question: "Why doesn't the page say whether my email is registered?",
    answer:
      "Sign-in and recovery messages do not confirm whether an account exists. This protects other people's account information. If you have an account, follow the next step shown on the page.",
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
