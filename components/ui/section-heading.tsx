export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-strong">
        {eyebrow}
      </span>
      <div className="space-y-1">
        <h2 className="font-heading text-3xl font-bold tracking-tight">{title}</h2>
        {description ? <p className="max-w-2xl text-muted">{description}</p> : null}
      </div>
    </div>
  );
}
