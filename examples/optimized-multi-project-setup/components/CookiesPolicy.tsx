import { PlasmicComponent } from "@plasmicapp/loader-nextjs";

// To demonstrate the usage of common components, we have included a simple
// component that is going to be shared across multiple pages.
export default function CookiesPolicy() {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 30,
        left: 0,
        right: 0,
      }}
    >
      <PlasmicComponent component="CookiesPolicy" />
    </div>
  );
}
