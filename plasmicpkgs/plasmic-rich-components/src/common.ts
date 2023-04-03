import { useEffect, useState } from "react";

export function useIsClient() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(true);
  });
  return loaded;
}

export function capitalize(text: string) {
  return text.slice(0, 1).toUpperCase() + text.slice(1);
}
