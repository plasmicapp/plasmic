import { useAdminCtx } from "@/wab/client/components/pages/admin/AdminCtx";
import { Select } from "antd";
import React, { useMemo } from "react";

export interface AdminUserSelectProps {
  onChange: (userId: string) => void;
}

export function AdminUserSelect({ onChange }: AdminUserSelectProps) {
  const { listUsers } = useAdminCtx();
  const userOptions = useMemo(() => {
    if (!listUsers.value) {
      return [];
    }

    return listUsers.value
      .sort((a, b) => a.email.localeCompare(b.email))
      .map((user) => ({
        value: user.id,
        label: `${user.email} (${user.firstName} ${user.lastName})`,
      }));
  }, [listUsers.value]);
  return (
    <Select
      style={{ width: 400 }}
      showSearch
      placeholder={listUsers.loading ? "Loading users..." : "Search for a user"}
      filterOption={(input, option) => !!option?.label?.includes(input)}
      options={userOptions}
      onChange={(userId: string) => onChange(userId)}
    />
  );
}
