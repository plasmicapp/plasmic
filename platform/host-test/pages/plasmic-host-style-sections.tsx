import { PlasmicCanvasHost, registerComponent } from "@plasmicapp/host";
import { StyleSection } from "@plasmicapp/host/dist/registerComponent";
interface PropType {
  name: string;
  className?: string;
  applyClassName?: boolean;
}

function TestComponent(props: PropType) {
  const { name, className, applyClassName = true } = props;
  return <div className={applyClassName ? className : undefined}>{name}</div>;
}

function registerTestComponent(
  name: string,
  styleSections: boolean | StyleSection[],
  applyClassName: boolean = true
) {
  registerComponent(TestComponent, {
    name,
    displayName: name,
    importName: "TestComponent",
    styleSections: applyClassName ? styleSections : undefined,
    props: {
      name: {
        type: "string",
        defaultValue: `${name} - Hello world`,
      },
      applyClassName: {
        type: "boolean",
        defaultValue: applyClassName,
      },
    },
    importPath: ".",
  });
}

const styleSections: StyleSection[] = [
  "visibility",
  "transform",
  "transitions",
  "sizing",
  "spacing",
  "typography",
  "shadows",
  "border",
  "effects",
  "background",
  "overflow",
  "layout",
].sort() as StyleSection[];

registerTestComponent("NoStyleSections", false);
registerTestComponent("StyleSectionsNoClassName", true, false);
registerTestComponent("StyleSectionsWithClassName", true);

styleSections.forEach((section) => {
  // Prefix "S" for single section components
  registerTestComponent(`S_${section}`, [section]);
});

for (let i = 0; i < styleSections.length; i++) {
  for (let j = i + 1; j < styleSections.length; j++) {
    const section1 = styleSections[i];
    const section2 = styleSections[j];
    // Prefix "D" for dual section components
    registerTestComponent(`D_${section1}_${section2}`, [section1, section2]);
  }
}

registerTestComponent("All", styleSections);

export default function Host() {
  return <PlasmicCanvasHost />;
}
