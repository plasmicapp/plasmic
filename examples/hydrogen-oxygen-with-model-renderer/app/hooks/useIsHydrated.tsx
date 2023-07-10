import {useState, useEffect} from 'react';

// @feedback - This hook could be replaced by remix-utils's ow hook should we want to go down this route.
export function useIsHydrated() {
  const [isHydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return isHydrated;
}
