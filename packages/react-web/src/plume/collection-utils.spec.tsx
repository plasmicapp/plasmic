import * as React from "react";
import {
  deriveItemsFromChildren,
  ItemLikeProps,
  SectionLikeProps,
} from "./collection-utils";
import { setPlumeStrictMode } from "./plume-utils";

describe("deriveItemsFromChildren", () => {
  function ItemLike(props: ItemLikeProps) {
    return <>{props.value}</>;
  }
  ItemLike.__plumeType = "item-like";
  function SectionLike(props: SectionLikeProps) {
    return <>{props.children}</>;
  }
  SectionLike.__plumeType = "section-like";

  beforeEach(() => {
    setPlumeStrictMode(true);
  });
  it("throws errors in strict mode", () => {
    expect(() => {
      deriveItemsFromChildren(
        <>
          <ItemLike value="hi"></ItemLike>
          <ItemLike value="hi2"></ItemLike>
          <ItemLike></ItemLike>
        </>,
        {
          itemPlumeType: "item-like",
          sectionPlumeType: "section-like",
          requireItemValue: true,
        }
      );
    }).toThrowError(`Must specify a "value" prop`);
    expect(() => {
      deriveItemsFromChildren(
        <SectionLike>
          <ItemLike value="hi"></ItemLike>
          <ItemLike value="hi2"></ItemLike>
          <ItemLike></ItemLike>
        </SectionLike>,
        {
          itemPlumeType: "item-like",
          sectionPlumeType: "section-like",
          requireItemValue: true,
        }
      );
    }).toThrowError(`Must specify a "value" prop`);
    expect(() => {
      deriveItemsFromChildren(
        <SectionLike>
          <ItemLike value="hi"></ItemLike>
          <ItemLike value="hi2"></ItemLike>
          {[<ItemLike></ItemLike>]}
        </SectionLike>,
        {
          itemPlumeType: "item-like",
          sectionPlumeType: "section-like",
          requireItemValue: true,
        }
      );
    }).toThrowError(`Must specify a "value" prop`);
  });
  it("derives items through fragments, arrays, and sections", () => {
    const { items, disabledKeys } = deriveItemsFromChildren(
      <>
        <SectionLike>
          <ItemLike value="x1" />
          <ItemLike value="x2" isDisabled />
        </SectionLike>
        <ItemLike value="x3" />
        <SectionLike>
          <ItemLike value="x4" isDisabled />
          <>
            <ItemLike value="x5" />
            <ItemLike value="x6" isDisabled />
            {[7, 8].map((n) => (
              <ItemLike value={`x${n}`} />
            ))}
            {[9, 10].map((n) => (
              <ItemLike value={`x${n}`} isDisabled />
            ))}
          </>
        </SectionLike>
      </>,
      {
        itemPlumeType: "item-like",
        sectionPlumeType: "section-like",
        requireItemValue: true,
      }
    );
    expect(disabledKeys).toEqual(["x2", "x4", "x6", "x9", "x10"]);
    expect(items).toMatchObject([
      <SectionLike key="section-0">
        <ItemLike value="x1" />
        <ItemLike value="x2" isDisabled />
      </SectionLike>,
      <ItemLike value="x3" />,
      <SectionLike key="section-1">
        <ItemLike value="x4" isDisabled />
        <ItemLike value="x5" />
        <ItemLike value="x6" isDisabled />
        <ItemLike value="x7" />
        <ItemLike value="x8" />
        <ItemLike value="x9" isDisabled />
        <ItemLike value="x10" isDisabled />
      </SectionLike>,
    ]);
  });

  it("auto-assigns missing values in non-strict mode", () => {
    setPlumeStrictMode(false);
    const { items, disabledKeys } = deriveItemsFromChildren(
      <>
        <SectionLike>
          <ItemLike value="x0" />
          <ItemLike isDisabled />
        </SectionLike>
        <ItemLike />
        <SectionLike>
          <ItemLike value="x3" isDisabled />
          <>
            <ItemLike value="x4" />
            <ItemLike isDisabled />
            {[6, 7].map(() => (
              <ItemLike />
            ))}
            {[8, 9].map((n) => (
              <ItemLike value={`x${n}`} isDisabled />
            ))}
          </>
        </SectionLike>
      </>,
      {
        itemPlumeType: "item-like",
        sectionPlumeType: "section-like",
        requireItemValue: true,
      }
    );
    expect(disabledKeys).toEqual(["1", "x3", "5", "x8", "x9"]);
    expect(items).toMatchObject([
      <SectionLike key="section-0">
        <ItemLike value="x0" />
        <ItemLike value="1" isDisabled />
      </SectionLike>,
      <ItemLike value="2" />,
      <SectionLike key="section-1">
        <ItemLike value="x3" isDisabled />
        <ItemLike value="x4" />
        <ItemLike value="5" isDisabled />
        <ItemLike value="6" />
        <ItemLike value="7" />
        <ItemLike value="x8" isDisabled />
        <ItemLike value="x9" isDisabled />
      </SectionLike>,
    ]);
  });
});
