import React from "react";

export interface LoadingProps {
  className?: string;
  children?: React.ReactNode;
  loadingTime?: number;
  loading?: React.ReactNode;
  customizeLoading?: boolean;
}

export function Loading(props: LoadingProps) {
  const { className, children, loadingTime, loading, customizeLoading } = props;

  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setTimeout(() => setIsLoading(false), loadingTime ?? 3000);
  }, [isLoading]);

  return (
    <div className={className}>
      {isLoading || !!customizeLoading ? loading : children}
    </div>
  );
}
