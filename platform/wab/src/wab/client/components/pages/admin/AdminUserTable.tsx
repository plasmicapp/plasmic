import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { smartRender } from "@/wab/client/components/pages/admin/admin-util";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { LinkButton, SearchBox } from "@/wab/client/components/widgets";
import { ApiUser } from "@/wab/shared/ApiSchema";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { Table, TableProps } from "antd";
import L from "lodash";
import React, { useMemo, useState } from "react";

interface Item {
  user: ApiUser;
}

export interface AdminUserTableProps<T extends Item> {
  items: T[];
  extraColumns?: TableProps<T>["columns"];
}

export function AdminUserTable<T extends Item = Item>({
  items,
  extraColumns = [],
}: AdminUserTableProps<T>) {
  const nonAuthCtx = useNonAuthCtx();

  const [filter, setFilter] = useState<string>("");
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!filter || filter.trim().length === 0) {
        return true;
      }
      const q = filter.toLowerCase();
      return (
        item.user.email?.toLowerCase().includes(q) ||
        item.user.firstName?.toLowerCase().includes(q) ||
        item.user.lastName?.toLowerCase().includes(q)
      );
    });
  }, [items, filter]);

  async function handleLogin(email: string) {
    await nonAuthCtx.api.adminLoginAs({ email });
    document.location.href = fillRoute(APP_ROUTES.dashboard, {});
  }

  return (
    <div>
      <SearchBox value={filter} onChange={(e) => setFilter(e.target.value)} />
      <Table<T>
        dataSource={filteredItems}
        rowKey={"id"}
        columns={[
          {
            title: "",
            key: "avatar",
            render: (_value, item) => <Avatar user={item.user} />,
          },
          ...["email", "firstName", "lastName", "createdAt", "deletedAt"].map(
            (key) => ({
              key,
              dataIndex: ["user", key],
              title: L.startCase(key),
              render: smartRender,
              sorter: (a, b) => (a.user[key] < b.user[key] ? -1 : 1),
              ...(key === "email"
                ? { defaultSortOrder: "ascend" as const }
                : {}),
            })
          ),
          {
            title: "Action",
            key: "action",
            render: (_value, item) => (
              <span>
                <LinkButton onClick={() => handleLogin(item.user.email)}>
                  Login
                </LinkButton>
              </span>
            ),
          },
          ...extraColumns,
        ]}
      />
    </div>
  );
}
