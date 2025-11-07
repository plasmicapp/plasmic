import React from "react";

export const NoItemMessage = ({ children }: { children: React.ReactNode }) => {
  return <div className="p-m text-center dimfg">{children}</div>;
};
