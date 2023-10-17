import { Pagination } from "antd";
import React, { useEffect } from "react";
import { Registerable, registerComponentHelper } from "./utils";

type AntdPaginationProps = Omit<
  React.ComponentProps<typeof Pagination>,
  "pageSizeOptions"
> & {
  pageSizeOptions?: { pageSize: number }[];
  paginatedUrl?: (pageNo: number, pageSize: number) => string;
};

export function AntdPagination(props: AntdPaginationProps) {
  const { paginatedUrl, pageSizeOptions, ...rest } = props;

  //   to populate startIndex and endIndex states which are set via onChange prop.
  useEffect(() => {
    if (props.current && props.pageSize && props.onChange) {
      props.onChange(props.current, props.pageSize);
    }
  }, []);

  return (
    <Pagination
      pageSizeOptions={pageSizeOptions
        ?.filter((i) => i?.pageSize)
        .map((i) => i.pageSize)}
      itemRender={
        paginatedUrl
          ? (pageNo, _, originalElement) => {
              if (!React.isValidElement(originalElement) || !props.pageSize) {
                return originalElement;
              }
              let rel = undefined;
              if (props.current) {
                rel =
                  pageNo === props.current
                    ? "self"
                    : pageNo === props.current - 1
                    ? "prev"
                    : pageNo === props.current + 1
                    ? "next"
                    : undefined;
              }

              const href = paginatedUrl(pageNo, props.pageSize);
              return React.cloneElement(originalElement, {
                ...originalElement.props,
                rel,
                href,
                style: {
                  ...(originalElement.props?.style ?? {}),
                  pointerEvents: "none",
                },
              });
            }
          : undefined
      }
      {...rest}
    />
  );
}

export const paginationComponentName = "plasmic-antd5-pagination";

export const paginationHelpers = {
  states: {
    pageSize: {
      onChangeArgsToValue: (_: number, pageSize: number) => pageSize,
    },
    startIndex: {
      onChangeArgsToValue: (currentPage: number, pageSize: number) =>
        (currentPage - 1) * pageSize,
    },
    endIndex: {
      onChangeArgsToValue: (currentPage: number, pageSize: number) =>
        pageSize * currentPage - 1,
    },
  },
};

export function registerPagination(loader?: Registerable) {
  registerComponentHelper(loader, AntdPagination, {
    name: paginationComponentName,
    displayName: "Pagination",
    props: {
      current: {
        editOnly: true,
        uncontrolledProp: "defaultCurrent",
        type: "number",
        displayName: "Current Page",
        description: `Default current page`,
        defaultValue: 1,
      },
      total: {
        type: "number",
        defaultValueHint: 0,
        description: `Total number of data items`,
      },
      pageSize: {
        editOnly: true,
        uncontrolledProp: "defaultPageSize",
        type: "number",
        displayName: "Page size",
        description: `Default number of items per page`,
        defaultValue: 10,
      },
      disabled: {
        type: "boolean",
        defaultValueHint: false,
        description: `Disable pagination controls`,
      },
      hideOnSinglePage: {
        type: "boolean",
        defaultValueHint: false,
        advanced: true,
        description: `Hide pager on single page`,
      },
      showLessItems: {
        type: "boolean",
        defaultValueHint: false,
        advanced: true,
        description: `Show less page items`,
        hidden: (ps) => !!ps.simple,
      },
      showQuickJumper: {
        type: "boolean",
        defaultValueHint: false,
        advanced: true,
        description: `Show "Go to page" control to enable jumping to pages directly`,
        hidden: (ps) => !!ps.simple,
      },
      showSizeChanger: {
        type: "boolean",
        defaultValueHint: (ps) => (ps.total ? ps.total > 50 : false),
        advanced: true,
        description: `Show page size selector`,
        hidden: (ps) => !!ps.simple,
      },
      //   showTitle prop seems to be doing nothing, so this is skipped
      //   showTitle: {
      //     type: "boolean",
      //     defaultValueHint: true,
      //     description: `Show page item's title`,
      //   },
      showTotal: {
        type: "function" as const,
        displayName: "Show total",
        description: "Display the total number and range",
        advanced: true,
        argNames: ["total", "range"],
        argValues: (_ps: any, ctx: any) => [ctx.data[0], ctx.data[1]],
      } as any,
      simple: {
        type: "boolean",
        defaultValueHint: false,
        description: `Uuse simple mode (i.e. minimal controls)`,
      },
      size: {
        type: "choice",
        defaultValueHint: "default",
        description: `Size of the pager`,
        options: ["default", "small"],
      },
      pageSizeOptions: {
        type: "array",
        defaultValue: [
          {
            pageSize: 10,
          },
          {
            pageSize: 20,
          },
          {
            pageSize: 50,
          },
          {
            pageSize: 100,
          },
        ],
        description: "The list of available page sizes",
        advanced: true,
        itemType: {
          type: "object",
          nameFunc: (item) => item.pageSize,
          fields: {
            pageSize: {
              type: "number",
              min: 1,
            },
          },
        },
      },
      paginatedUrl: {
        type: "function",
        advanced: true,
        description:
          "Helps generate SEO-friendly pagination links. These links will include appropriate href attributes, ensuring that search engines can effectively crawl and index your paginated content",
        control: {
          type: "href",
        },
        argNames: ["pageNo", "pageSize"],
        argValues: (_props: AntdPaginationProps, ctx: any) => [
          ctx?.data?.[0],
          _props.pageSize,
        ],
      } as any,
      onChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [
          {
            name: "page",
            type: "number",
          },
          {
            name: "pageSize",
            type: "number",
          },
        ],
      },
      onShowSizeChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [
          {
            name: "current",
            type: "number",
          },
          {
            name: "size",
            type: "number",
          },
        ],
      },
    },
    states: {
      currentPage: {
        type: "writable",
        valueProp: "current",
        onChangeProp: "onChange",
        variableType: "number",
      },
      pageSize: {
        type: "writable",
        valueProp: "pageSize",
        onChangeProp: "onShowSizeChange",
        variableType: "number",
        ...paginationHelpers.states.pageSize,
      },
      startIndex: {
        type: "readonly",
        variableType: "number",
        onChangeProp: "onChange",
        ...paginationHelpers.states.startIndex,
      },
      endIndex: {
        type: "readonly",
        variableType: "number",
        onChangeProp: "onChange",
        ...paginationHelpers.states.endIndex,
      },
    },
    componentHelpers: {
      helpers: paginationHelpers,
      importName: "paginationHelpers",
      importPath: "@plasmicpkgs/antd5/skinny/registerPagination",
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerPagination",
    importName: "AntdPagination",
  });
}
