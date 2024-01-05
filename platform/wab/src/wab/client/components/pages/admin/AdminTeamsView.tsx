import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { useAdminCtx } from "@/wab/client/components/pages/admin/AdminCtx";
import {
  useAsyncFnStrict,
  useAsyncStrict,
} from "@/wab/client/hooks/useAsyncStrict";
import EyeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Eye";
import {
  ApiPermission,
  ApiTeam,
  ApiUser,
  TeamWhiteLabelInfo,
} from "@/wab/shared/ApiSchema";
import {
  Button,
  Card,
  Form,
  Input,
  /* eslint-disable-next-line no-restricted-imports */
  Modal,
  notification,
  Select,
  Table,
} from "antd";
import React, { useCallback, useState } from "react";
import { AutoInfo, smartRender } from "./admin-util";

export function AdminTeamsView() {
  const { teamId, setState } = useAdminCtx();
  const nonAuthCtx = useNonAuthCtx();
  const [shouldRefetch, setShouldRefetch] = useState({});
  const refetch = useCallback(() => setShouldRefetch({}), [setShouldRefetch]);
  const { loading, value } = useAsyncStrict(async () => {
    if (!teamId) {
      return undefined;
    }

    return nonAuthCtx.api.getTeam(teamId);
  }, [nonAuthCtx, teamId, shouldRefetch]);
  const team = value?.team;
  const perms = value?.perms;
  return (
    <>
      <TeamLookup />
      {teamId && (
        <Card
          title={
            <div className="flex-col">
              <h1 className="m0">Team: {team?.name || ""}</h1>
              <pre className="text-xsm dimfg">{teamId}</pre>
            </div>
          }
          loading={loading}
          extra={
            <Button onClick={() => setState({ teamId: undefined })}>
              Close team
            </Button>
          }
        >
          {team && perms && (
            <TeamDetail team={team} perms={perms} refetch={refetch} />
          )}
        </Card>
      )}
    </>
  );
}

function TeamLookup() {
  const nonAuthCtx = useNonAuthCtx();
  const adminCtx = useAdminCtx();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const usersResp = useAsyncStrict(
    () => nonAuthCtx.api.listUsers(),
    [nonAuthCtx]
  );
  const [teamsResp, fetchTeams] = useAsyncFnStrict(
    async () =>
      userId ? await nonAuthCtx.api.listTeamsForUser(userId) : undefined,
    [nonAuthCtx, userId]
  );
  useAsyncStrict(fetchTeams, [nonAuthCtx, userId]);

  return (
    <>
      <h2>Lookup teams for user</h2>
      <Select
        style={{ width: 400 }}
        showSearch
        placeholder="Search for a user"
        filterOption={(input, option) => {
          const user: ApiUser | undefined = option?.user;
          if (user) {
            return (
              user.email?.toLowerCase().includes(input.toLowerCase()) ||
              user.firstName?.toLowerCase().includes(input.toLowerCase()) ||
              user.lastName?.toLowerCase().includes(input.toLowerCase()) ||
              false
            );
          }
          return false;
        }}
        options={
          usersResp.value
            ? usersResp.value.users.map((user) => ({
                value: user.id,
                label: user.email,
                user,
              }))
            : []
        }
        onChange={(val) => {
          setUserId(val);
        }}
        value={userId}
      />
      <Table<ApiTeam>
        dataSource={teamsResp.value?.teams ?? []}
        rowKey="id"
        columns={[
          {
            title: "Team",
            dataIndex: "name",
            render: smartRender,
            sorter: (a, b) => (a.name < b.name ? -1 : 1),
          },
          {
            title: "Created at",
            dataIndex: "createdAt",
            render: smartRender,
            sorter: (a, b) => (a.createdAt < b.createdAt ? -1 : 1),
            defaultSortOrder: "descend",
          },
          {
            title: "Modified at",
            dataIndex: "updatedAt",
            render: smartRender,
            sorter: (a, b) => (a.updatedAt < b.updatedAt ? -1 : 1),
            defaultSortOrder: "descend",
          },
          {
            title: "Billing Email",
            dataIndex: "billingEmail",
            render: smartRender,
            sorter: (a, b) => (a.billingEmail < b.billingEmail ? -1 : 1),
          },
          {
            title: "Seats",
            dataIndex: "seats",
            render: smartRender,
            sorter: (a, b) => (a.name < b.name ? -1 : 1),
          },
          {
            title: "Users",
            key: "users",
            render: () => <EyeIcon />,
          },
        ]}
        style={{ cursor: "pointer" }}
        onRow={(record) => ({
          onClick: () => {
            adminCtx.setState({ teamId: record.id });
          },
        })}
      />
    </>
  );
}

interface TeamProps {
  team: ApiTeam;
  perms: ApiPermission[];
  refetch: () => void;
}

function TeamDetail(props: TeamProps) {
  return (
    <div className="flex-col gap-xlg">
      <div>
        <h2>Actions</h2>
        <div className="flex-row gap-m">
          <UpgradePersonalTeam {...props} />
          <ResetTeamTrial {...props} />
          <ConfigureSso {...props} />
          <GenerateTeamApiToken {...props} />
        </div>
      </div>
      <div>
        <h2>White Label</h2>
        <div className="flex-row gap-m">
          <UpdateWhiteLabelName {...props} />
          <UpdateWhiteLabelJwt {...props} />
          <UpdateWhiteLabelTeamClientCredentials {...props} />
        </div>
      </div>
      <div>
        <h2>Info</h2>
        <AutoInfo info={props.team} />
      </div>
      <div>
        <h2>Members</h2>
        <Members {...props} />
      </div>
    </div>
  );
}

function Members({ team, perms, refetch }: TeamProps) {
  const nonAuthCtx = useNonAuthCtx();
  const getEmail = (perm: ApiPermission) => perm.user?.email ?? perm.email;
  return (
    <Table<ApiPermission>
      dataSource={perms}
      rowKey="id"
      columns={[
        {
          title: "Email",
          key: "email",
          render: (_value, perm) => getEmail(perm),
          sorter: (a, b) =>
            (getEmail(a) ?? "") < (getEmail(b) ?? "") ? -1 : 1,
        },
        {
          title: "isUser",
          key: "isUser",
          render: (_value, perm) => `${!!perm.user}`,
          sorter: (a, b) => (!!a.user < !!b.user ? -1 : 1),
        },
        {
          title: "Access Level",
          dataIndex: "accessLevel",
          render: smartRender,
          sorter: (a, b) => (a.accessLevel < b.accessLevel ? -1 : 1),
        },
        {
          title: "Actions",
          dataIndex: "actions",
          render: (_value, perm) => {
            const userId = perm.user?.id;
            if (!userId || perm.accessLevel === "owner") {
              return null;
            }

            return (
              <Button
                onClick={async () => {
                  await nonAuthCtx.api.changeTeamOwner(team.id, userId);
                  refetch();
                }}
              >
                Replace as team owner
              </Button>
            );
          },
        },
      ]}
    />
  );
}

function UpgradePersonalTeam({ team, refetch }: TeamProps) {
  const nonAuthCtx = useNonAuthCtx();
  if (!team.personalTeamOwnerId) {
    return null;
  }
  return (
    <Button
      onClick={async () => {
        await nonAuthCtx.api.upgradePersonalTeam(team.id);
        refetch();
      }}
    >
      Promote to real team
    </Button>
  );
}

function ResetTeamTrial({ team, refetch }: TeamProps) {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <Button
      onClick={() => {
        Modal.confirm({
          title: "Reset team trial?",
          content: `This will reset the team trial for team "${team.name}"`,
          onOk: async () => {
            await nonAuthCtx.api.resetTeamTrial(team.id);
            refetch();
          },
        });
      }}
    >
      Reset team trial
    </Button>
  );
}

const DEFAULT_SSO_CONFIG_TEMPLATES = {
  okta: `
{
  "audience": "",
  "authorizationId": "",
  "clientID": "",
  "clientSecret": ""
}
  `.trim(),
};

function ConfigureSso({ team, refetch }: TeamProps) {
  const nonAuthCtx = useNonAuthCtx();
  const [form] = Form.useForm();
  return (
    <Button
      onClick={async () => {
        let initialValues = {
          teamId: team.id,
          provider: "okta",
          config: DEFAULT_SSO_CONFIG_TEMPLATES["okta"],
        };

        const existing = await nonAuthCtx.api.getSsoConfigByTeamId(team.id);
        if (existing) {
          initialValues = {
            ...initialValues,
            ...existing,
            domain: existing.domains[0],
            config: JSON.stringify(existing.config, undefined, 2),
          };
        }

        Modal.confirm({
          title: "Configure SSO",
          okButtonProps: { style: { display: "none" } },
          content: (
            <Form
              form={form}
              initialValues={initialValues}
              onFinish={async (event) => {
                console.log("FORM", event);

                try {
                  const data = { ...event, config: JSON.parse(event.config) };
                  console.log("Submitting", data);
                  const sso = await nonAuthCtx.api.upsertSsoConfig(data);
                  refetch();
                  Modal.destroyAll();
                  console.log("Created", sso);
                  notification.success({
                    message: `SSO Config updated!  Tenant ID is ${sso.tenantId}`,
                  });
                } catch (e) {
                  notification.error({ message: `${e}` });
                }
              }}
            >
              <Form.Item hidden name="teamId">
                <Input />
              </Form.Item>
              <Form.Item name="domain" label="Domain">
                <Input />
              </Form.Item>
              <Form.Item name="provider" label="Provider">
                <Select
                  onChange={(e) =>
                    form.setFieldsValue({
                      config: DEFAULT_SSO_CONFIG_TEMPLATES[e],
                    })
                  }
                >
                  <Select.Option value="okta">Okta</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="config" label="Config">
                <Input.TextArea autoSize={{ minRows: 4 }} className="code" />
              </Form.Item>
              <Form.Item>
                <Button htmlType="submit" type="primary">
                  Update
                </Button>
              </Form.Item>
            </Form>
          ),
        });
      }}
    >
      Configure SSO
    </Button>
  );
}

function GenerateTeamApiToken({ team, refetch }: TeamProps) {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <Button
      onClick={() =>
        Modal.confirm({
          title: "Generate Team API Token?",
          content: `This will replace the existing token for team "${team.name}".`,
          onOk: async () => {
            try {
              const res = await nonAuthCtx.api.createTeamApiToken(team.id);
              refetch();
              notification.success({
                message: (
                  <div>
                    Token: <strong>{res.token}</strong>
                  </div>
                ),
                duration: 0,
              });
            } catch (e) {
              notification.error({ message: `${e}` });
            }
          },
        })
      }
    >
      Generate Team API Token
    </Button>
  );
}

function UpdateWhiteLabelName({ team, refetch }: TeamProps) {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <Button
      onClick={() => {
        Modal.confirm({
          title: "Update white label JWT",
          okButtonProps: { style: { display: "none" } },
          content: (
            <div>
              <p>
                Convert a team to a white-labeled team by associating a
                white-label name with it.
              </p>
              <Form
                initialValues={{
                  whiteLabelName: team.whiteLabelName,
                }}
                onFinish={async (values) => {
                  if (values.whiteLabelName?.trim() === "") {
                    values.whiteLabelName = null;
                  }
                  const updatedTeam =
                    await nonAuthCtx.api.updateTeamWhiteLabelName(
                      team.id,
                      values.whiteLabelName
                    );
                  refetch();
                  Modal.destroyAll();
                  notification.success({
                    message: "Successfully updated white label team name",
                    description: `Team ${updatedTeam.id} has name "${updatedTeam.whiteLabelName}"`,
                  });
                }}
              >
                <Form.Item name="whiteLabelName" label="White label name">
                  <Input />
                </Form.Item>
                <Form.Item>
                  <Button htmlType="submit" type="primary">
                    Save
                  </Button>
                </Form.Item>
              </Form>
            </div>
          ),
        });
      }}
    >
      {team.whiteLabelName
        ? "Update white label name"
        : "Convert to white label"}
    </Button>
  );
}

function UpdateWhiteLabelJwt({ team, refetch }: TeamProps) {
  const nonAuthCtx = useNonAuthCtx();
  if (!team.whiteLabelName) {
    return null;
  }
  return (
    <Button
      onClick={() => {
        Modal.confirm({
          title: "Update white label JWT",
          okButtonProps: { style: { display: "none" } },
          content: (
            <>
              <h3>
                Team "{team.name}" ({team.whiteLabelName})
              </h3>
              <Form
                initialValues={team.whiteLabelInfo ?? undefined}
                onFinish={async (values) => {
                  console.log("FORM SUBMISSION", values);
                  const whiteLabelInfo: TeamWhiteLabelInfo = {
                    openRedirect: {
                      ...values.openRedirect,
                      scheme: "jwt",
                      algo: "RS256",
                    },
                  };
                  console.log("New WhiteLabelInfo", whiteLabelInfo);
                  await nonAuthCtx.api.updateTeamWhiteLabelInfo(
                    team.id,
                    whiteLabelInfo
                  );
                  refetch();
                  Modal.destroyAll();
                  notification.success({ message: "Updated!" });
                }}
              >
                <Form.Item
                  name={["openRedirect", "publicKey"]}
                  label="JWT Public Key (RS256)"
                >
                  <Input.TextArea />
                </Form.Item>
                <Form.Item>
                  <Button htmlType="submit" type="primary">
                    Save
                  </Button>
                </Form.Item>
              </Form>
            </>
          ),
        });
      }}
    >
      Update white label JWT
    </Button>
  );
}

function UpdateWhiteLabelTeamClientCredentials({ team, refetch }: TeamProps) {
  const nonAuthCtx = useNonAuthCtx();
  if (!team.whiteLabelName) {
    return null;
  }
  return (
    <Button
      onClick={() => {
        Modal.confirm({
          title: "Update white label client credentials",
          okButtonProps: { style: { display: "none" } },
          content: (
            <>
              <h3>
                Team "{team.name}" ({team.whiteLabelName})
              </h3>
              <Form
                initialValues={team.whiteLabelInfo ?? undefined}
                onFinish={async (event) => {
                  const whiteLabelInfo: TeamWhiteLabelInfo = {
                    apiClientCredentials: {
                      ...event.apiClientCredentials,
                    },
                  };
                  await nonAuthCtx.api.updateTeamWhiteLabelInfo(
                    team.id,
                    whiteLabelInfo
                  );
                  refetch();
                  Modal.destroyAll();
                  notification.success({ message: "Updated!" });
                }}
              >
                <Form.Item
                  name={["apiClientCredentials", "clientId"]}
                  label="Client ID"
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={["apiClientCredentials", "issuer"]}
                  label="Issuer"
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={["apiClientCredentials", "aud"]}
                  label="Expected audience (aud)"
                >
                  <Input />
                </Form.Item>
                <Form.Item>
                  <Button htmlType="submit" type="primary">
                    Save
                  </Button>
                </Form.Item>
              </Form>
            </>
          ),
        });
      }}
    >
      Update white label client credentials
    </Button>
  );
}
