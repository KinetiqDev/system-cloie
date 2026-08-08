interface HeroCardProps {
  name: string;
  contextLabel: string;
}

export function HeroCard({ name, contextLabel }: HeroCardProps) {
  return (
    <section className="bg-primary border-primary-active/20 text-on-primary mb-8 rounded-2xl border p-6 shadow-md lg:p-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="font-heading text-heading-lg lg:text-heading-xl mb-1 font-extrabold">
            Welcome, {name}
          </h2>
          <p className="text-on-primary font-medium">{contextLabel}</p>
          <p className="bg-on-primary/10 text-body-sm border-on-primary/20 mt-4 inline-block rounded-full border px-3 py-1.5">
            Complete your assigned evaluations before their deadlines.
          </p>
        </div>
      </div>
    </section>
  );
}
