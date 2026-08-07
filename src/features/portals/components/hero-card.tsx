import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeroCardProps {
  name: string;
  contextLabel: string;
  evaluationsHref?: string;
}

export function HeroCard({
  name,
  contextLabel,
  evaluationsHref = "/student/evaluations",
}: HeroCardProps) {
  return (
    <section className="bg-primary border-primary-active/20 text-on-primary mb-8 rounded-2xl border p-6 shadow-md lg:p-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="font-heading text-heading-lg lg:text-heading-xl mb-1 font-extrabold">
            Welcome, {name}
          </h2>
          <p className="text-on-primary/80 font-medium">{contextLabel}</p>
          <p className="bg-on-primary/10 text-body-sm mt-4 inline-block rounded-full border border-on-primary/20 px-3 py-1.5">
            Complete your assigned evaluations before their deadlines.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            render={<Link href={evaluationsHref} />}
            variant="outline"
            className="border-on-primary bg-on-primary text-primary hover:bg-on-primary/90 font-semibold"
          >
            My Evaluations
          </Button>
        </div>
      </div>
    </section>
  );
}
