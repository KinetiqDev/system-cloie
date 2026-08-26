import type { SubmittedResponseSection } from "@/features/responses/services/get-student-submitted-response-review";

interface SubmittedResponseReviewProps {
  evaluationTitle: string;
  courseTitle: string | null;
  programLabel: string;
  submittedAt: Date;
  sections: SubmittedResponseSection[];
}

export function SubmittedResponseReview({
  evaluationTitle,
  courseTitle,
  programLabel,
  submittedAt,
  sections,
}: SubmittedResponseReviewProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="font-heading text-2xl font-black">{evaluationTitle}</h1>
        <p className="text-text-secondary text-sm">
          {courseTitle ? `${courseTitle} • ${programLabel}` : programLabel}
        </p>
        <p className="text-text-secondary mt-1 text-xs">Submitted on {formatDate(submittedAt)}</p>
      </div>

      {sections.map((section) => (
        <section key={section.id} className="space-y-4">
          <h2 className="border-border border-b pb-2 text-lg font-bold">{section.name}</h2>
          <div className="space-y-4">
            {section.items.map((item, idx) => {
              const itemKey = item.kind === "quantitative" ? item.itemKey : item.promptKey;
              return (
                <div key={itemKey ?? idx} className="border-border rounded-xl border p-4">
                  <p className="text-text-secondary mb-2 text-sm">{item.prompt}</p>
                  <p className="text-text-primary font-bold">
                    {item.answer !== undefined ? String(item.answer) : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
