export type CodeComponentProps = {
  children: React.ReactNode;
};

export function CodeComponent({ children }: CodeComponentProps) {
  return (
    <div>
      <span>This is a code component.</span>
      {children}
    </div>
  );
}
