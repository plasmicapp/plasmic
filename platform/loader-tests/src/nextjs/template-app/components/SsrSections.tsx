import { ReactNode } from "react";

interface SectionProps {
  className?: string;
  heading?: string;
  children?: ReactNode;
}

/**
 * Code components used by nextjs-subtree-prefetching-config.spec.ts to test
 * subtreePrefetchingConfig in the server query tree.
 */
export function ServerSection({ className, heading, children }: SectionProps) {
  return (
    <section className={className} data-test-id="server-section">
      <h2>{heading}</h2>
      <div>{children}</div>
    </section>
  );
}

export function NoPrefetchSection({
  className,
  heading,
  children,
}: SectionProps) {
  return (
    <section className={className} data-test-id="no-prefetch-section">
      <h2>{heading}</h2>
      <div>{children}</div>
    </section>
  );
}
