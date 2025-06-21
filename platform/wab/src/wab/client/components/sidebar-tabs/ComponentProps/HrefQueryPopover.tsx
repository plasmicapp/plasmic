import { useOnIFrameMouseDown } from "@/wab/client/components/widgets";
import { PageHref } from "@/wab/shared/model/classes";
import { Popover, RefSelectProps, Select } from "antd";
import React from "react";
import { FocusScope } from "react-aria";

interface HrefQueryPopoverProps {
  expr: PageHref;
  pageQuery: Record<string, string>;
  children: React.ReactNode;
  onAdd: (key: string) => void;
}

export function HrefQueryPopover({
  expr,
  pageQuery,
  children,
  onAdd,
}: HrefQueryPopoverProps) {
  const [searchValue, setSearchValue] = React.useState<string | undefined>(
    undefined
  );
  const [showing, setShowing] = React.useState(false);
  const selectRef = React.useRef<RefSelectProps>(null);
  useOnIFrameMouseDown(() => {
    setShowing(false);
  });
  return (
    <Popover
      trigger={["click"]}
      onOpenChange={(open) => {
        setShowing(open);
        setSearchValue("");
        if (open) {
          selectRef.current?.focus();
        }
      }}
      overlayClassName="ant-popover--tight"
      visible={showing}
      placement={"left"}
      destroyTooltipOnHide
      content={
        <FocusScope autoFocus contain restoreFocus>
          <Select
            showSearch={true}
            searchValue={searchValue}
            onSearch={(val) => setSearchValue(val)}
            onSelect={(val) => {
              onAdd(val);
              setShowing(false);
            }}
            style={{
              width: 200,
            }}
            bordered={false}
            ref={selectRef}
            placeholder="Choose a query param"
            notFoundContent={null}
            open
          >
            {searchValue && (
              <Select.Option key={"__custom__"} value={searchValue}>
                {searchValue}
              </Select.Option>
            )}
            {Object.keys(pageQuery).map(
              (query) =>
                !expr.query[query] && (
                  <Select.Option key={query} value={query}>
                    {query}
                  </Select.Option>
                )
            )}
          </Select>
        </FocusScope>
      }
    >
      {children}
    </Popover>
  );
}
