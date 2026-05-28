import { Construction } from 'lucide-react';

interface Props {
  title: string;
  phase: string;
  preview: string[];
}

export function ComingSoon({ title, phase, preview }: Props) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm" style={{ color: 'rgb(var(--muted-foreground))' }}>
          {phase}
        </p>
      </header>

      <div
        className="rounded-lg border p-6 flex items-start gap-4"
        style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--card))' }}
      >
        <div
          className="h-10 w-10 grid place-items-center rounded-md shrink-0"
          style={{ background: 'rgb(var(--muted))' }}
        >
          <Construction size={18} className="text-brand-600" />
        </div>
        <div className="space-y-2">
          <h2 className="font-medium">Coming soon</h2>
          <p className="text-sm" style={{ color: 'rgb(var(--muted-foreground))' }}>
            This module is on the roadmap. Planned features:
          </p>
          <ul
            className="text-sm list-disc pl-5 space-y-1"
            style={{ color: 'rgb(var(--muted-foreground))' }}
          >
            {preview.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
