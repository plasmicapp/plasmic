import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { smartRender } from "@/wab/client/components/pages/admin/admin-util";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { LinkButton, SearchBox } from "@/wab/client/components/widgets";
import { ApiUser } from "@/wab/shared/ApiSchema";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { Table, TableProps, Tag, notification } from "antd";
import L from "lodash";
import moment from "moment";
import React, { useMemo, useRef, useState } from "react";

interface Item {
  user: ApiUser;
}

export interface AdminUserTableProps<T extends Item> {
  items: T[];
  extraColumns?: TableProps<T>["columns"];
  onUsersChanged: () => void;
}

export function AdminUserTable<T extends Item = Item>({
  items,
  extraColumns = [],
  onUsersChanged,
}: AdminUserTableProps<T>) {
  const nonAuthCtx = useNonAuthCtx();
  const onUsersChangedRef = useRef(onUsersChanged);
  onUsersChangedRef.current = onUsersChanged;

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
    document.location.href = APP_ROUTES.dashboard.fill({});
  }

  function describeUser(id: string | null) {
    if (!id) {
      return "not recorded (admin action or phishing ban)";
    }
    const user = items.find((item) => item.user.id === id)?.user;
    return user ? `${user.email} (${id})` : id;
  }

  async function confirmAndRun(
    user: ApiUser,
    opts: {
      title: string;
      action: string;
      done: string;
      effect: React.ReactNode;
      danger?: boolean;
      run: () => Promise<unknown>;
    },
  ) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    const confirmed = await reactConfirm({
      title: opts.title,
      message: (
        <div>
          <p>{opts.effect}</p>
          <ul>
            <li>Name: {name || "(none)"}</li>
            <li>Email: {user.email}</li>
            <li>ID: {user.id}</li>
            <li>
              Created: {moment(user.createdAt).format("YYYY-MM-DD HH:mm")}
            </li>
            {user.isWhiteLabel && <li>White-label user</li>}
            {user.deletedAt && (
              <>
                <li>
                  Deactivated:{" "}
                  {moment(user.deletedAt).format("YYYY-MM-DD HH:mm")}
                </li>
                <li>Deactivated by: {describeUser(user.deletedById)}</li>
              </>
            )}
          </ul>
        </div>
      ),
      confirmLabel: opts.action,
      danger: opts.danger,
    });
    if (!confirmed) {
      return;
    }
    try {
      await opts.run();
      notification.success({ message: `${opts.done} ${user.email}` });
      onUsersChangedRef.current();
    } catch (e) {
      notification.error({ message: `${e}` });
    }
  }

  function handleDeactivate(user: ApiUser, clearPassword: boolean) {
    return confirmAndRun(user, {
      title: clearPassword
        ? "Deactivate user and clear password?"
        : "Deactivate user?",
      action: clearPassword ? "Deactivate and clear password" : "Deactivate",
      done: clearPassword
        ? "Deactivated and cleared password for"
        : "Deactivated",
      effect: clearPassword
        ? "The user can't log in. Their password is cleared, so after reactivation they must reset it or sign in with Google/SSO."
        : "The user can't log in. Their password is kept, so they can log in normally after reactivation.",
      danger: true,
      run: () =>
        nonAuthCtx.api.deactivateUserAsAdmin(user.id, { clearPassword }),
    });
  }

  function handleReactivate(user: ApiUser) {
    return confirmAndRun(user, {
      title: "Reactivate user?",
      action: "Reactivate",
      done: "Reactivated",
      effect:
        "The user can log in again. If their password was cleared when they were deactivated, they must reset it or sign in with Google/SSO.",
      run: () => nonAuthCtx.api.reactivateUserAsAdmin(user.id),
    });
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
          ...["email", "firstName", "lastName", "createdAt"].map((key) => ({
            key,
            dataIndex: ["user", key],
            title: L.startCase(key),
            render: smartRender,
            sorter: (a, b) => (a.user[key] < b.user[key] ? -1 : 1),
            ...(key === "email" ? { defaultSortOrder: "ascend" as const } : {}),
          })),
          {
            title: "Status",
            key: "status",
            render: (_value, item) =>
              item.user.deletedAt ? (
                <span>
                  <Tag color="red">Deactivated</Tag>
                  {smartRender(item.user.deletedAt)}
                </span>
              ) : (
                <Tag color="green">Active</Tag>
              ),
            filters: [
              { text: "Active", value: "active" },
              { text: "Deactivated", value: "deactivated" },
            ],
            onFilter: (value, item) =>
              (value === "deactivated") === !!item.user.deletedAt,
            sorter: (a, b) =>
              new Date(a.user.deletedAt ?? 0).getTime() -
              new Date(b.user.deletedAt ?? 0).getTime(),
          },
          {
            title: "Action",
            key: "action",
            render: (_value, item) => (
              <div className="flex flex-vcenter gap-m nowrap">
                {!item.user.deletedAt && (
                  <LinkButton onClick={() => handleLogin(item.user.email)}>
                    Login
                  </LinkButton>
                )}
                {item.user.deletedAt ? (
                  <LinkButton onClick={() => handleReactivate(item.user)}>
                    Reactivate
                  </LinkButton>
                ) : (
                  <>
                    <LinkButton
                      onClick={() => handleDeactivate(item.user, false)}
                    >
                      Deactivate
                    </LinkButton>
                    <LinkButton
                      onClick={() => handleDeactivate(item.user, true)}
                    >
                      Deactivate and clear password
                    </LinkButton>
                  </>
                )}
              </div>
            ),
          },
          ...extraColumns,
        ]}
      />
    </div>
  );
}
