import { Skeleton, SkeletonProps } from "antd";
import React from "react";
import { Registerable, registerComponentHelper } from "./utils";

export type AntdSkeletonProps = SkeletonProps & {
  type?: 'Basic' | 'Button' | 'Avatar' | 'Input' | 'Image' | 'Node'
  width?: string | number | (string | number)[]
  widthTitle?: string
  rows?: number
  shape?: 'circle' | 'square'
  size?: 'large' | 'small' | 'default'
  customClassName?: string
}

export function AntdSkeleton(props: AntdSkeletonProps) {
  const {
    type,
    paragraph,
    avatar,
    title,
    shape,
    size,
    loading,
    width,
    widthTitle,
    rows,
    className: rootClassName,
    customClassName,
    children,
  } = props

  if (type === 'Button') {
    return loading ? (
      <Skeleton.Button
        {...props}
        rootClassName={rootClassName}
        className={customClassName}
      />
    ) : (
      children
    )
  }

  if (type === 'Avatar') {
    return loading ? (
      <Skeleton.Avatar
        {...props}
        rootClassName={rootClassName}
        className={customClassName}
      />
    ) : (
      children
    )
  }

  if (type === 'Input') {
    return loading ? (
      <Skeleton.Input
        {...props}
        rootClassName={rootClassName}
        className={customClassName}
      />
    ) : (
      children
    )
  }

  if (type === 'Image') {
    return loading ? (
      <Skeleton.Image
        {...props}
        rootClassName={rootClassName}
        className={customClassName}
      />
    ) : (
      children
    )
  }

  if (type === 'Node') {
    return (
      <Skeleton.Node
        {...props}
        rootClassName={props.className}
        className={customClassName}
      />
    )
  }

  return (
    <Skeleton
      {...props}
      paragraph={paragraph ? { rows, width } : false}
      avatar={avatar ? { shape, size } : false}
      title={title ? { width: widthTitle, className: customClassName } : false}
      rootClassName={rootClassName}
      className={customClassName}
    />
  )
}

export const skeletonComponentName = "plasmic-antd5-skeleton";

export function registerSkeleton(loader?: Registerable) {
  registerComponentHelper(loader, AntdSkeleton, {
    name: skeletonComponentName,
    displayName: 'Skeleton',
    props: {
      children: 'slot',
      type: {
        type: 'choice',
        defaultValue: 'Basic',
        options: ['Basic', 'Button', 'Avatar', 'Input', 'Image', 'Node'],
      },
      active: {
        type: 'boolean',
        description: 'Show animation effect',
        defaultValue: false,
      },
      avatar: {
        type: 'boolean',
        description: 'Show avatar placeholder',
        hidden: (ps) => ps.type !== 'Basic',
        defaultValue: false,
      },
      loading: {
        type: 'boolean',
        description: 'Display the skeleton when true',
        defaultValue: false,
      },
      paragraph: {
        type: 'boolean',
        description: 'Show paragraph placeholder',
        hidden: (ps) => ps.type !== 'Basic',
        defaultValue: true,
      },
      round: {
        type: 'boolean',
        description: 'Show paragraph and title radius when true',
        hidden: (ps) => ps.type !== 'Basic',
        defaultValue: false,
      },
      title: {
        type: 'boolean',
        description: 'Show title placeholder',
        hidden: (ps) => ps.type !== 'Basic',
        defaultValue: true,
      },
      size: {
        type: 'choice',
        defaultValue: 'default',
        description: `Size of the skeleton for types: Avatar, Button and Input`,
        hidden: (ps) =>
          ps.type !== 'Avatar' &&
          ps.type !== 'Button' &&
          ps.type !== 'Input' &&
          ps.avatar !== true,
        advanced: true,
        options: ['large', 'small', 'default'],
      },
      // SkeletonAvatarProps
      shape: {
        type: 'choice',
        defaultValue: 'circle',
        description: `Set the shape of avatar`,
        hidden: (ps) => ps.type !== 'Avatar' && ps.avatar !== true,
        advanced: true,
        options: ['circle', 'square'],
      },
      // SkeletonTitleProps
      widthTitle: {
        type: 'string',
        description: 'Width of the title',
        hidden: (ps) => !ps.title,
        advanced: true,
      },
      // SkeletonParagraphProps
      width: {
        type: 'array',
        description:
          'Set the width of paragraph. When width is an Array, it can set the width of each row. Otherwise only set the last row width',
        hidden: (ps) => !ps.paragraph && ps.type !== 'Basic',
        advanced: true,
      },
      rows: {
        type: 'number',
        description: 'Set the row count of paragraph',
        hidden: (ps) => !ps.paragraph && ps.type !== 'Basic',
        advanced: true,
      },
      // SkeletonButtonProps
      shapeButton: {
        type: 'choice',
        defaultValue: 'default',
        description: `Set the shape of button`,
        hidden: (ps) => ps.type !== 'Button',
        advanced: true,
        options: ['default', 'circle', 'round', 'square'],
      },
      block: {
        type: 'boolean',
        description: 'Option to fit button width to its parent width',
        hidden: (ps) => ps.type !== 'Button' && ps.type !== 'Input',
        defaultValue: false,
        advanced: true,
      },
      customClassName: {
        type: 'string',
        displayName: 'Class Name',
        description: 'Custom class name for Node skeleton for custom styling',
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerSkeleton",
    importName: "AntdSkeleton",
  });
}
