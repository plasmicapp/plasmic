import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { useAdminCtx } from "@/wab/client/components/pages/admin/AdminCtx";
import { AdminUserTable } from "@/wab/client/components/pages/admin/AdminUserTable";
import { PublicLink } from "@/wab/client/components/PublicLink";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import { notNil } from "@/wab/common";
import {
  ApiPermission,
  ApiTeam,
  ApiTeamDiscourseInfo,
  ApiUser,
  TeamWhiteLabelInfo,
} from "@/wab/shared/ApiSchema";
import {
  BASE_URL,
  PUBLIC_SUPPORT_CATEGORY_ID,
} from "@/wab/shared/discourse/config";
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
  Tabs,
} from "antd";
import React, { useMemo, useState } from "react";
import { AutoInfo, smartRender } from "./admin-util";
import { AdminUserSelect } from "./AdminUserSelect";

export function AdminTeamsView() {
  const { teamId, navigate } = useAdminCtx();
  const nonAuthCtx = useNonAuthCtx();
  const {
    loading,
    value: data,
    retry: refetch,
  } = useAsyncStrict(async () => {
    if (!teamId) {
      return undefined;
    }

    const [teamAndPerms, discourseInfo] = await Promise.all([
      nonAuthCtx.api.getTeam(teamId),
      nonAuthCtx.api.getTeamDiscourseInfo(teamId).catch(() => null),
    ]);
    return {
      ...teamAndPerms,
      discourseInfo,
    };
  }, [nonAuthCtx, teamId]);
  return (
    <>
      <Tabs
        items={[
          {
            key: "paying",
            label: "Paying teams",
            children: <PayingTeamsView />,
          },
          {
            key: "user",
            label: "Lookup team by user",
            children: <TeamLookupByUser />,
          },
        ]}
      />
      {teamId && (
        <Card
          title={
            <div className="flex-col">
              <h1 className="m0">
                {data ? `Team: ${data.team.name}` : "Loading..."}
              </h1>
              <pre className="text-xsm dimfg">{teamId}</pre>
            </div>
          }
          loading={loading}
          extra={
            <Button onClick={() => navigate({ tab: "teams" })}>
              Close team
            </Button>
          }
        >
          {data && (
            <>
              <TeamDetail
                team={data.team}
                perms={data.perms}
                discourseInfo={data.discourseInfo}
                refetch={refetch}
              />
            </>
          )}
        </Card>
      )}
    </>
  );
}

function TeamLookupByUser() {
  const nonAuthCtx = useNonAuthCtx();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const listTeams = useAsyncStrict(
    async () =>
      userId ? await nonAuthCtx.api.adminListTeams({ userId }) : undefined,
    [nonAuthCtx, userId]
  );

  return (
    <>
      <h2>Lookup teams for user</h2>
      <AdminUserSelect onChange={(val) => setUserId(val)} />
      <TeamTable
        loading={listTeams.loading}
        teams={listTeams.value?.teams ?? []}
      />
    </>
  );
}

function PayingTeamsView() {
  const nonAuthCtx = useNonAuthCtx();
  const { listFeatureTiers } = useAdminCtx();
  const listTeams = useAsyncStrict(
    async () =>
      listFeatureTiers.value
        ? await nonAuthCtx.api.adminListTeams({
            featureTierIds: listFeatureTiers.value.map((ft) => ft.id),
          })
        : undefined,
    [nonAuthCtx, listFeatureTiers.value]
  );

  return (
    <>
      <h2>All customers</h2>
      <TeamTable
        loading={listTeams.loading}
        teams={listTeams.value?.teams ?? []}
      />
    </>
  );
}

function TeamTable(props: { loading: boolean; teams: ApiTeam[] }) {
  const { navigate } = useAdminCtx();
  return (
    <Table<ApiTeam>
      loading={props.loading}
      dataSource={props.teams}
      rowKey="id"
      columns={[
        {
          title: "Team",
          dataIndex: "name",
          render: smartRender,
          sorter: {
            compare: (a, b) => (a.name < b.name ? -1 : 1),
            multiple: 1,
          },
          defaultSortOrder: "ascend",
        },
        {
          title: "Feature Tier",
          key: "featureTier",
          filters: [
            {
              text: "Enterprise",
              value: "Enterprise",
            },
            {
              text: "Team (Scale)",
              value: "Team",
            },
            {
              text: "Starter",
              value: "Starter",
            },
            {
              text: "Free",
              value: "Free",
            },
          ],
          onFilter: (value, team) => {
            if (team.featureTier) {
              return team.featureTier.name.includes(value as string);
            } else {
              return value === "Free";
            }
          },
          render: (_value, team) => {
            const ft = team.featureTier;
            if (ft) {
              return `${ft.name} ($${ft.monthlyBasePrice}/mo)`;
            } else {
              return "Free";
            }
          },
          sorter: {
            compare: (a, b) => {
              const aft = a.featureTier;
              const bft = b.featureTier;

              if (aft === bft) {
                return 0;
              } else if (aft === null) {
                return -1;
              } else if (bft === null) {
                return 1;
              } else if (
                aft.name === "Enterprise" &&
                bft.name !== "Enterprise"
              ) {
                return 1;
              } else if (
                aft.name !== "Enterprise" &&
                bft.name === "Enterprise"
              ) {
                return -1;
              } else {
                return (
                  (a.featureTier?.monthlyBasePrice ?? 0) -
                  (b.featureTier?.monthlyBasePrice ?? 0)
                );
              }
            },
            multiple: 2,
          },
          defaultSortOrder: "descend",
        },
        {
          title: "Seats",
          dataIndex: "seats",
          render: smartRender,
          sorter: (a, b) => (a.seats ?? 0) - (b.seats ?? 0),
        },
        {
          title: "Billing Email",
          dataIndex: "billingEmail",
          render: smartRender,
          sorter: (a, b) => a.billingEmail.localeCompare(b.billingEmail),
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
      ]}
      style={{ cursor: "pointer" }}
      onRow={(record) => ({
        onClick: () => {
          navigate({ tab: "teams", id: record.id });
        },
      })}
    />
  );
}

interface TeamProps {
  team: ApiTeam;
  perms: ApiPermission[];
  discourseInfo: ApiTeamDiscourseInfo | null;
  refetch: () => void;
}

function TeamDetail(props: TeamProps) {
  return (
    <div className="flex-col gap-xlg">
      <Tabs
        items={[
          {
            key: "links",
            label: "Quick Links",
            children: <QuickLinks {...props} />,
          },
          {
            key: "actions",
            label: "Actions",
            children: <Actions {...props} />,
          },
          {
            key: "members",
            label: "Members",
            children: <Members {...props} />,
          },
          {
            key: "discourse",
            label: "Discourse",
            children: <TeamDiscourseInfo {...props} />,
          },
          {
            key: "white-label",
            label: "White-label",
            children: <WhiteLabel {...props} />,
          },
        ]}
      />
      <div>
        <h2>Info</h2>
        <AutoInfo info={props.team} />
      </div>
    </div>
  );
}

function QuickLinks({ team }: TeamProps) {
  const links = [
    `https://studio.plasmic.app/orgs/${team.id}`,
    `https://studio.plasmic.app/orgs/${team.id}/settings`,
    `https://studio.plasmic.app/orgs/${team.id}/support`,
    team.stripeCustomerId &&
      `https://dashboard.stripe.com/customers/${team.stripeCustomerId}`,
    team.stripeSubscriptionId &&
      `https://dashboard.stripe.com/subscriptions/${team.stripeSubscriptionId}`,
  ].filter(notNil);
  return (
    <div className="flex-col gap-m">
      {links.map((link) => (
        <PublicLink href={link} target="_blank">
          {link}
        </PublicLink>
      ))}
    </div>
  );
}

function Actions(props: TeamProps) {
  return (
    <div className="flex-row gap-m">
      <UpgradePersonalTeam {...props} />
      <ResetTeamTrial {...props} />
      <ConfigureSso {...props} />
      <GenerateTeamApiToken {...props} />
    </div>
  );
}

function Members({ team, perms, refetch }: TeamProps) {
  const nonAuthCtx = useNonAuthCtx();

  // Each permission should already have a user,
  // but need to check and make the types happy.
  const items = useMemo(
    () =>
      perms.filter((perm) => {
        return !!perm.user;
      }),
    [perms]
  ) as (ApiPermission & { user: ApiUser })[];

  return (
    <AdminUserTable<ApiPermission & { user: ApiUser }>
      items={items}
      extraColumns={[
        {
          title: "Access Level",
          dataIndex: "accessLevel",
          render: smartRender,
          sorter: {
            compare: (a, b) => (a.accessLevel < b.accessLevel ? -1 : 1),
            multiple: 1,
          },
          defaultSortOrder: "descend",
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

function WhiteLabel(props: TeamProps) {
  return (
    <div className="flex-row gap-m">
      <UpdateWhiteLabelName {...props} />
      <UpdateWhiteLabelJwt {...props} />
      <UpdateWhiteLabelTeamClientCredentials {...props} />
    </div>
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

function TeamDiscourseInfo(props: TeamProps) {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div className="flex-col gap-m">
      {props.discourseInfo ? (
        <div>
          This org has a private Discourse support{" "}
          <PublicLink
            href={`${BASE_URL}/c/${props.discourseInfo.categoryId}`}
            target="_blank"
          >
            category
          </PublicLink>{" "}
          and{" "}
          <PublicLink
            href={`${BASE_URL}/g/${props.discourseInfo.slug}`}
            target="_blank"
          >
            group
          </PublicLink>
          . Use the form below to update the org's slug or name.
          <Button
            onClick={async () => {
              console.log(
                `Sending support welcome email to members of team ${props.team.name}`
              );
              const { sent, failed } =
                await nonAuthCtx.api.sendTeamSupportWelcomeEmail(props.team.id);
              console.log(`Sent:`, sent);
              console.log(`Failed:`, failed);

              if (failed.length > 0) {
                notification.error({
                  message: `Sent ${sent.length} emails, failed to send ${failed.length} emails (see console logs for emails)`,
                });
              } else {
                notification.success({
                  message: `Sent ${sent.length} emails (see console logs for emails)`,
                });
              }
            }}
          >
            Send support welcome email
          </Button>
        </div>
      ) : (
        <div>
          This org doesn't currently have a private Discourse support category.
          They will be directed to the{" "}
          <a
            href={`${BASE_URL}/c/${PUBLIC_SUPPORT_CATEGORY_ID}`}
            target="_blank"
          >
            public Discourse support category
          </a>{" "}
          instead. Use the form below to create a private Discourse support
          category. It will only succeed if the org has a valid feature tier.
        </div>
      )}
      <TeamDiscourseInfoForm
        team={props.team}
        discourseInfo={props.discourseInfo}
        refetch={props.refetch}
      />
    </div>
  );
}

function TeamDiscourseInfoForm({
  team,
  discourseInfo,
  refetch,
}: {
  team: ApiTeam;
  discourseInfo: ApiTeamDiscourseInfo | null;
  refetch: () => void;
}) {
  const nonAuthCtx = useNonAuthCtx();
  const [form] = Form.useForm();
  const initialValues = useMemo(() => {
    if (discourseInfo) {
      return {
        slug: discourseInfo.slug,
        name: discourseInfo.name,
      };
    } else {
      return {
        slug: suggestSlug(team),
        name: team.name,
      };
    }
  }, [discourseInfo]);
  return (
    <Form<{ slug: string; name: string }>
      form={form}
      initialValues={initialValues}
      onFinish={async (values) => {
        console.log(
          `Syncing ${team.name} team's to Discourse slug=${values.slug} name=${values.name}`
        );
        await nonAuthCtx.api.syncTeamDiscourseInfo(team.id, values);
        console.log(`Sync success`);
        notification.success({
          message: `Discourse info synced. Send a support welcome email when ready.`,
        });
        await refetch();
      }}
    >
      <Form.Item
        name="slug"
        label="Slug"
        validateFirst
        rules={[
          { required: true },
          { min: 7 },
          { max: 50 },
          { pattern: /^org-[a-z]+(-[a-z]+)*$/ },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="name"
        label="Name"
        validateFirst
        rules={[
          { required: true },
          { min: 3 },
          { max: 50 },
          { pattern: /^\S.*\S$/ },
        ]}
      >
        <Input />
      </Form.Item>
      <Button htmlType="submit" type="primary">
        Sync to Discourse
      </Button>
    </Form>
  );
}

function suggestSlug(team: ApiTeam) {
  // Get the part of the name before any punctuation
  const companyNameBeforePunctuation = team.name.split(
    /[.,/#!$%^&*;:{}=\-_`~()]/
  )[0];
  const slug = companyNameBeforePunctuation
    .replace(/[^\w\s]/gi, "") // Remove non-word characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-{2,}/g, "-") // Replace multiple hyphens with single hyphen
    .trim() // Trim leading and trailing spaces
    // Category name max length is 50 (cannot be configured).
    // Group name max length is 50 (defaults to 20, configured via "max username length").
    // Take first 46 characters to make room for "org-".
    .substring(0, 46)
    .toLowerCase();
  return `org-${slug}`;
}
