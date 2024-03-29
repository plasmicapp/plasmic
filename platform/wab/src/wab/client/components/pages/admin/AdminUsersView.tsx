import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { UU } from "@/wab/client/cli-routes";
import { smartRender } from "@/wab/client/components/pages/admin/admin-util";
import { useAdminCtx } from "@/wab/client/components/pages/admin/AdminCtx";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { LinkButton, SearchBox } from "@/wab/client/components/widgets";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import { ApiProject } from "@/wab/shared/ApiSchema";
import { Button, Form, Input, notification, Table } from "antd";
import L from "lodash";
import React, { useState } from "react";
import { AdminUserSelect } from "./AdminUserSelect";

export function AdminUsersView() {
  return (
    <>
      <UsersView />
      <UserProjects />
      <ChangePasswordView />
      <DeactivateUserView />
    </>
  );
}

function UsersView() {
  const nonAuthCtx = useNonAuthCtx();
  const { listUsers } = useAdminCtx();

  const [query, setQuery] = useState<string>("");

  async function handleLogin(email: string) {
    await nonAuthCtx.api.adminLoginAs({ email });
    document.location.href = UU.dashboard.fill({});
  }

  return (
    <div className="mv-lg">
      <h2>Users</h2>
      <SearchBox value={query} onChange={(e) => setQuery(e.target.value)} />
      <Table
        dataSource={(listUsers.value ?? []).filter((user) => {
          if (!query || query.trim().length === 0) {
            return true;
          }
          const q = query.toLowerCase();
          return (
            user.email?.toLowerCase().includes(q) ||
            user.firstName?.toLowerCase().includes(q) ||
            user.lastName?.toLowerCase().includes(q)
          );
        })}
        rowKey={"id"}
        columns={[
          {
            title: "",
            key: "avatar",
            render: (_value, user) => <Avatar user={user} />,
          },
          ...["email", "firstName", "lastName", "createdAt", "deletedAt"].map(
            (key) => ({
              key,
              dataIndex: key,
              title: L.startCase(key),
              render: smartRender,
              sorter: (a, b) => (a[key] < b[key] ? -1 : 1),
              ...(key === "email"
                ? { defaultSortOrder: "ascend" as const }
                : {}),
            })
          ),
          {
            title: "Action",
            key: "action",
            render: (value, user) => (
              <span>
                <LinkButton onClick={() => handleLogin(user.email)}>
                  Login
                </LinkButton>
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

function UserProjects() {
  const nonAuthCtx = useNonAuthCtx();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
    undefined
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

function DeactivateUserView() {
  const nonAuthCtx = useNonAuthCtx();

  return (
    <div>
      <h2>Offload user</h2>
      <p>
        This deactivates the user in the database. You still need to follow{" "}
        <a href="https://coda.io/d/Plasmic-Wiki_dHQygjmQczq/Offboarding-users_suPpD#_lu6Th">
          directions here
        </a>{" "}
        to remove the user from mailing lists (if that's what they want).
      </p>
      <Form
        onFinish={async (event) => {
          try {
            const res = await nonAuthCtx.api.deactivateUserAsAdmin(event.email);
            notification.success({
              message: "User deactivated",
            });
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="email" label="Email">
          <Input type={"input"} placeholder="Email" />
        </Form.Item>
        <Button htmlType={"submit"}>Deactivate</Button>
      </Form>
    </div>
  );
}
