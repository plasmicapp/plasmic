/** @format */

import { useEffect, useState } from "react";

function AngularTest({
  className,
  message,
}: {
  className?: string;
  message?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      // Do not run these on Next.js server side, since custom elements are not available there.
      // @ts-ignore-next-line
      await import("../ng/runtime.6263bc5acf5b193e");
      // @ts-ignore-next-line
      await import("../ng/polyfills.5cf9041adbc6958d");
      // @ts-ignore-next-line
      await import("../ng/main.ef91450b26733d80");
      setLoaded(true);
    })();
  });
  return (
    <div className={className}>
      {/* @ts-ignore-next-line */}
      {loaded && <angular-component message={message} />}
    </div>
  );
}

export default AngularTest;
