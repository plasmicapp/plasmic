import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface CardPickerPropTypeProps {
  cardPickerProp: string;
}

export function CardPickerPropType(props: CardPickerPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerCardPickerPropType() {
  registerComponent(CardPickerPropType, {
    name: "test-card-picker-prop-type",
    displayName: "Card Picker Prop Type",
    props: {
      cardPickerProp: {
        type: "cardPicker",
        options: [
          {
            label: "hello",
            footer: "Image 1",
            value: "image1",
            imgUrl: "/img1.jpeg",
          },
          {
            footer: "Image 2",
            value: "image2",
            imgUrl: "/img2.jpeg",
          },
          {
            footer: "Image 3",
            value: "image3",
            imgUrl: "/img3.jpeg",
          },
        ],
        showInput: true,
      },
    },
    importName: "CardPickerPropType",
    importPath: "../code-components/CardPickerPropType",
  });
}
