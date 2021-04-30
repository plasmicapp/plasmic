/**
 * In general, we try not to expose react-aria's Collections API to Plume users.
 * The Collections API is how react-aria users pass data about collections of
 * things using the built-in Item and Section components, which are abstract,
 * metadata-only components that don't render anything but only serve to specify
 * data.  For example, here's how you would use react-spectrum's Picker:
 *
 *   <Picker>
 *     <Section title="Asia">
 *       <Item key="taiwan">Taiwan</Item>
 *       <Item key="japan">Japan</Item>
 *       <Item key="china">China</Item>
 *     </Section>
 *     <Section title="Europe">
 *       <Item key="germany">Germany</Item>
 *       <Item key="france">France</Item>
 *     </Section>
 *   </Picker>
 *
 * You would re-use this same Item/Section components to pass similar things to
 * Menu, Tabs, etc.
 *
 * For Plasmic, this API is too abstract.  The user has explicitly designed components
 * like Select.Option and Select.OptionGroup, and it is weird that they don't actually
 * use these components. It is more natural to do:
 *
 *   <Select>
 *     <Select.OptionGroup title="Asia">
 *       <Select.Option key="taiwan">Taiwan</Select>
 *     </Select.OptionGroup>
 *   </Select>
 *
 * For Plume, we let users directly use the components they designed, both to collect
 * information and to perform actual rendering.  For example, for Plume,
 * you'd use Select.Option instead of Item, and Select.OptionGroup instead of Section.
 * This means that the Select.Option props will collect the same information Item
 * does.
 *
 * A component like Select.Option then serves two purposes:
 *
 * 1. Allow users to specify the collection of data, like in the above example
 *    Here, we're mainly interested in the props in those ReactElements so
 *    we can pass the Item/Section data onto react-aria's APIs.  We are not
 *    actually rendering these elements.
 * 2. Once react-aria's Collections API has gone through them and built
 *    Collection "nodes", we then create cloned versions of these elements
 *    with the corresponding node passed in as a secret prop.  These ReactElements
 *    are then actually used to _render_ the corresponding Option / OptionGroup.
 *
 * This file contains helper functions to help with implementing the above.
 *
 * Note also that most of the collections-based react-aria components expose
 * a parallel API that accepts a list of "items" and a render prop, instead
 * of list of Item/Section elements.  This is for efficiency, but we are opting
 * to only support the composite-component pattern for now for simplicity.
 */

import { Node } from "@react-types/shared";
import React from "react";
import { Item, Section } from "react-stately";
import { ensure, isString } from "../common";
import { flattenChildren } from "../react-utils";
import { getPlumeType, PLUME_STRICT_MODE } from "./plume-utils";

/**
 * Props for a Plume component that corresponds to an Item
 */
export interface ItemLikeProps {
  /**
   * value key corresponding to this item. Not required if you use the
   * `key` prop instead.
   */
  value?: string;

  /**
   * The text string value corresponding to this item. Used to support
   * keyboard type-ahead.  If not specified, then will be derived from
   * `children` if it is a string, or the `value` or `key`.
   */
  textValue?: string;

  /**
   * aria-label for this item.
   */
  "aria-label"?: string;

  /**
   * Primary content label for this item.
   */
  children?: React.ReactNode;

  /**
   * If true, this item will not be selectable.
   */
  isDisabled?: boolean;
}

/**
 * Props for a Plume component that corresponds to a Section
 */
export interface SectionLikeProps {
  /**
   * Heading content of the title
   */
  title?: React.ReactNode;

  /**
   * aria-label for this section
   */
  "aria-label"?: string;

  /**
   * A list of items that belong in this group
   */
  children?: React.ReactNode;
}

/**
 * Given children of a component like Select or Menu, derive the items
 * that we will pass into the Collections API.  These will be
 * ReactElement<ItemLikeProps|SectionLikeProps>[].
 */
export function deriveItemsFromChildren<T extends React.ReactElement>(
  children: React.ReactNode,
  opts: {
    itemPlumeType: string;
    sectionPlumeType?: string;
    invalidChildError?: string;
  }
): T[] {
  if (!children) {
    return [];
  }

  const { itemPlumeType, sectionPlumeType, invalidChildError } = opts;

  const isValidChild = (child: React.ReactChild) => {
    const type = getPlumeType(child);
    return !!type && (type === itemPlumeType || type === sectionPlumeType);
  };

  const flattened = flattenChildren(children);
  if (PLUME_STRICT_MODE && flattened.some((child) => !isValidChild(child))) {
    throw new Error(invalidChildError ?? `Unexpected child`);
  }
  return flattenChildren(children).filter(isValidChild) as T[];
}

/**
 * Given a Collection node, create the React element that we should use
 * to render it.
 */
export function renderCollectionNode(node: Node<any>) {
  // node.rendered should already have our item-like or section-like Plume
  // component elements, so we just need to clone them with a secret
  // _node prop that we use to render.
  if (node.hasChildNodes) {
    return React.cloneElement(node.rendered as React.ReactElement, {
      _node: node,
    });
  } else {
    return React.cloneElement(node.rendered as React.ReactElement, {
      _node: node,
    });
  }
}

/**
 * Renders a item-like or section-like Plume component element into an
 * Item or a Section element.
 */
export function renderAsCollectionChild<
  T extends React.ReactElement<ItemLikeProps | SectionLikeProps>
>(
  child: T,
  opts: {
    itemPlumeType: string;
    sectionPlumeType?: string;
    deriveItems?: (
      children: React.ReactNode
    ) => React.ReactElement<ItemLikeProps | SectionLikeProps>[];
  }
) {
  const plumeType = getPlumeType(child);
  if (plumeType === opts.itemPlumeType) {
    const option = child as React.ReactElement<ItemLikeProps>;

    // We look at the children passed to the item-like element, and derive key
    // or textValue from it if it is a string
    const content = option.props.children;

    // The children render prop needs to return an <Item/>
    return (
      <Item
        // We use ItemLike.value if the user explicitly specified a value,
        // and we fallback to key.  If the user specified neither, then
        // the Collections API will generate a unique key for this item.
        key={getItemLikeKey(option)}
        // textValue is either explicitly specified by the user, or we
        // try to derive it if `content` is a string.
        textValue={
          option.props.textValue ??
          (isString(content)
            ? content
            : option.props.value
            ? `${option.props.value}`
            : option.key
            ? `${option.key}`
            : undefined)
        }
        aria-label={option.props["aria-label"]}
      >
        {
          // Note that what we setting the item-like element as the children
          // here, and not content; we want the entire item-like Plume element to
          // end up as Node.rendered.
        }
        {option}
      </Item>
    );
  } else {
    const group = child as React.ReactElement<SectionLikeProps>;
    return (
      <Section
        // Note that we are using the whole section-like element as the title
        // here, and not group.props.title; we want the entire section-like
        // Plume element to end up as Node.rendered.
        title={group}
        aria-label={group.props["aria-label"]}
        // We are flattening and deriving the descendant Options as items here
        items={ensure(opts.deriveItems)(group.props.children)}
      >
        {
          // We use the same render function to turn descendent Options into Items
        }
        {(c: React.ReactElement) => renderAsCollectionChild(c, opts)}
      </Section>
    );
  }
}

/**
 * Given a list of item-like and section-like plume elements, returns a list of keys
 * corresponding to disabled items
 */
export function extractDisabledKeys(
  items: React.ReactElement<ItemLikeProps | SectionLikeProps>[],
  opts: {
    itemPlumeType: string;
    sectionPlumeType?: string;
  }
) {
  return flattenItems(items, opts)
    .filter((x) => x.props.isDisabled)
    .map((x) => getItemLikeKey(x));
}

function flattenItems(
  items: React.ReactElement<ItemLikeProps | SectionLikeProps>[],
  opts: {
    itemPlumeType: string;
    sectionPlumeType?: string;
  }
): React.ReactElement<ItemLikeProps>[] {
  return items.flatMap((item) => {
    const plumeType = getPlumeType(item);
    if (plumeType === opts.itemPlumeType) {
      return [item];
    } else if (plumeType === opts.sectionPlumeType) {
      return flattenItems(
        deriveItemsFromChildren(item.props.children, opts),
        opts
      );
    } else {
      return [];
    }
  });
}

function getItemLikeKey(element: React.ReactElement<ItemLikeProps>) {
  return element.props.value ?? element.key;
}
