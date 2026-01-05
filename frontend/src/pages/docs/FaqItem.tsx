/**
 * FaqItem - FAQ item component for documentation pages
 */

interface FaqItemProps {
  readonly question: string;
  readonly answer: string;
}

export function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <div className="p-5 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)]">
      <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-2">
        {question}
      </h3>
      <p className="text-sm text-[var(--monarch-text)]">{answer}</p>
    </div>
  );
}
