import { DataProvider } from "@plasmicapp/loader-nextjs";
import React, { useEffect } from "react";

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  });
  return (
    <DataProvider name={"isScrolled"} data={isScrolled}>
      {children}
    </DataProvider>
  );
}
