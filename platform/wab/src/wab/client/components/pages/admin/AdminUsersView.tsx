import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { smartRender } from "@/wab/client/components/pages/admin/admin-util";
import { useAdminCtx } from "@/wab/client/components/pages/admin/AdminCtx";
import { AdminUserSelect } from "@/wab/client/components/pages/admin/AdminUserSelect";
import { AdminUserTable } from "@/wab/client/components/pages/admin/AdminUserTable";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import { ApiProject } from "@/wab/shared/ApiSchema";
import { Button, Form, Input, Table } from "antd";
import React, { useState } from "react";

export function AdminUsersView() {
  return (
    <>
      <UsersView />
      <UserProjects />
      <ChangePasswordView />
    </>
  );
}

function UsersView() {
  const { listUsers } = useAdminCtx();
  return (
    <div className="mv-lg">
      <h2>Users</h2>
      <AdminUserTable
        items={listUsers.value?.map((user) => ({ user })) ?? []}
        onUsersChanged={listUsers.retry}
      />
    </div>
  );
}

function UserProjects() {
  const nonAuthCtx = useNonAuthCtx();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
    undefined,
  );
  const { value: projects } = useAsyncStrict(async () => {
    if (!selectedUserId) {
      return [];
    }
    const resp = await nonAuthCtx.api.listProjectsForOwner(selectedUserId);
    return resp.projects as (ApiProject & {
      teamName: string;
      workspaceName: string;
    })[];
  }, [nonAuthCtx, selectedUserId]);

  return (
    <div className="mv-lg">
      <h2>Lookup projects for user</h2>
      <div>
        <AdminUserSelect onChange={(userId) => setSelectedUserId(userId)} />
        <Table
          dataSource={projects ?? []}
          rowKey="id"
          columns={[
            {
              title: "Team",
              dataIndex: "team",
              render: (x, project) => (
                <a target="_blank" href={`/orgs/${project.teamId}`}>
                  {project.teamName}
                </a>
              ),
              sorter: {
                compare: (a, b) => a.teamName.localeCompare(b.teamName),
                multiple: 3,
              },
              defaultSortOrder: "ascend",
            },
            {
              title: "Workspace",
              dataIndex: "workspace",
              render: (x, project) => (
                <a target="_blank" href={`/workspaces/${project.workspaceId}`}>
                  {project.workspaceName}
                </a>
              ),
              sorter: {
                compare: (a, b) =>
                  a.workspaceName.localeCompare(b.workspaceName),
                multiple: 2,
              },
              defaultSortOrder: "ascend",
            },
            {
              title: "Project",
              dataIndex: "name",
              render: (x, project) => (
                <a target="_blank" href={`/projects/${project.id}`}>
                  {project.name}
                </a>
              ),
              sorter: {
                compare: (a, b) => a.name.localeCompare(b.name),
                multiple: 1,
              },
              defaultSortOrder: "ascend",
            },
            {
              title: "Created at",
              dataIndex: "createdAt",
              render: smartRender,
              sorter: (a, b) => (a.createdAt < b.createdAt ? -1 : 1),
            },
            {
              title: "Modified at",
              dataIndex: "updatedAt",
              render: smartRender,
              sorter: (a, b) => (a.updatedAt < b.updatedAt ? -1 : 1),
            },
            {
              title: "Owner?",
              dataIndex: "createdById",
              render: (id) => (id === selectedUserId ? "Yes" : "No"),
              sorter: (a) => (a.createdById === selectedUserId ? -1 : 1),
            },
          ]}
        />
      </div>
    </div>
  );
}

function ChangePasswordView() {
  const nonAuthCtx = useNonAuthCtx();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    await nonAuthCtx.api.setPassword({
      email,
      newPassword: password,
    });
  };

  return (
    <div>
      <h2>Change password for a user</h2>
      <Form onFinish={handleSubmit}>
        <Input
          type={"email"}
          placeholder={"Email"}
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase())}
        />
        <Input
          type={"password"}
          placeholder={"Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button htmlType={"submit"}>Change password</Button>
      </Form>
    </div>
  );
}
