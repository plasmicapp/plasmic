import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import { Select } from "antd";
import React from "react";

export interface AdminUserSelectProps {
  onChange: (userId: string) => void;
}

export function AdminUserSelect({ onChange }: AdminUserSelectProps) {
  const nonAuthCtx = useNonAuthCtx();
  const { loading, value: users } = useAsyncStrict(async () => {
    const resp = await nonAuthCtx.api.listUsers();
    return resp.users
      .sort((a, b) => a.email.localeCompare(b.email))
      .map((user) => ({
        value: user.id,
        label: `${user.email} (${user.firstName} ${user.lastName})`,
      }));
  }, [nonAuthCtx]);
  return (
    <Select
      style={{ width: 400 }}
      showSearch
      placeholder={loading ? "Loading users..." : "Search for a user"}
      filterOption={(input, option) => !!option?.label?.includes(input)}
      options={users}
      onChange={(userId: string) => onChange(userId)}
    />
  );
}
