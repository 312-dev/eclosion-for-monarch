/**
 * FaqItem - FAQ item component for documentation pages
 */

interface FaqItemProps {
  readonly question: string;
  readonly answer: string;
}

export function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <div className="p-5 rounded-xl bg-(--monarch-bg-card) border border-(--monarch-border)">
      <h3 className="font-semibold text-(--monarch-text-dark) mb-2">{question}</h3>
      <p className="text-sm text-(--monarch-text)">{answer}</p>
    </div>
  );
}
