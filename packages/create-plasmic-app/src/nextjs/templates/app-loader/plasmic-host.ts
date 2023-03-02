export function makePlasmicHostPage_app_loader(): string {
  return `import { PlasmicCanvasHost } from "@plasmicapp/loader-nextjs";
import "@/plasmic-init-client";

export default function PlasmicHost() {
  return <PlasmicCanvasHost />;
}
`;
}
