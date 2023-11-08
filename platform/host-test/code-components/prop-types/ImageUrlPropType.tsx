import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface ImageUrlPropTypeProps {
  imageUrl: string;
}

export function ImageUrlPropType(props: ImageUrlPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerImageUrlPropType() {
  registerComponent(ImageUrlPropType, {
    name: "test-image-url-prop-type",
    displayName: "Image URL Prop Type",
    props: {
      imageUrl: {
        type: "imageUrl",
      },
    },
    importName: "ImageUrlPropType",
    importPath: "../code-components/ImageUrlPropType",
  });
}
