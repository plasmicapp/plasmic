import {
  loadAppCtx,
  NonAuthCtx,
  NonAuthCtxContext,
  useNonAuthCtx,
} from "@/wab/client/app-ctx";
import { U, UU } from "@/wab/client/cli-routes";
import type FullCodeEditor from "@/wab/client/components/coding/FullCodeEditor";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import {
  LinkButton,
  SearchBox,
  Spinner,
} from "@/wab/client/components/widgets";
import { downloadBlob, getUploadedFile } from "@/wab/client/dom-utils";
import {
  useAsyncFnStrict,
  useAsyncStrict,
} from "@/wab/client/hooks/useAsyncStrict";
import CheckIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Check";
import EyeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Eye";
import CircleCloseIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__CircleClose";
import { stepsToCypress } from "@/wab/client/tours/tutorials/tutorials-helpers";
import { STUDIO_ONBOARDING_TUTORIALS } from "@/wab/client/tours/tutorials/tutorials-meta";
import {
  assert,
  ensure,
  extractDomainFromEmail,
  spawn,
  tryRemove,
  uncheckedCast,
} from "@/wab/common";
import { DEVFLAGS } from "@/wab/devflags";
import {
  ApiFeatureTier,
  ApiPermission,
  ApiProjectRevision,
  ApiTeam,
  ApiUser,
  BillingFrequency,
  StripeCustomerId,
  StripeSubscriptionId,
  TeamId,
  TeamWhiteLabelInfo,
} from "@/wab/shared/ApiSchema";
import { PkgVersionInfo } from "@/wab/shared/SharedApi";
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  notification,
  Select,
  Table,
  TablePaginationConfig,
  Tabs,
} from "antd";
import TextArea from "antd/lib/input/TextArea";
import L from "lodash";
import moment from "moment";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Modal } from "src/wab/client/components/widgets/Modal";
import useSWR from "swr/immutable";

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

function smartRender(value: any) {
  if (isNaN(new Date("2020-03-27T20:06:43.340Z").getTime())) {
    return moment(value).fromNow();
  } else {
    return "" + value;
  }
}

export function UsersView() {
  const nonAuthCtx = useNonAuthCtx();

  const [query, setQuery] = useState<string>("");
  const [reloadCount, setReloadCount] = useState(0);
  const usersResp = useAsyncStrict(
    () => nonAuthCtx.api.listUsers(),
    [nonAuthCtx, reloadCount]
  );

  async function handleLogin(email: string) {
    await nonAuthCtx.api.adminLoginAs({ email });
    document.location.href = UU.dashboard.fill({});
  }

  return (
    <div className="mv-lg">
      <h2>Users</h2>
      <SearchBox value={query} onChange={(e) => setQuery(e.target.value)} />
      <Table
        dataSource={(usersResp.value?.users ?? []).filter((user) => {
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
            render: (value, user) => <Avatar user={user} />,
          },
          ...["email", "firstName", "lastName", "createdAt", "deletedAt"].map(
            (key) => ({
              key,
              dataIndex: key,
              title: L.startCase(key),
              render: smartRender,
              sorter: (a, b) => (a[key] < b[key] ? -1 : 1),
              ...(key === "email"
                ? { defaultSortOrder: "descend" as const }
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

export function UserProjects() {
  const nonAuthCtx = useNonAuthCtx();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const usersResp = useAsyncStrict(
    () => nonAuthCtx.api.listUsers(),
    [nonAuthCtx, 0]
  );
  const projectsResp = useAsyncStrict(
    async () =>
      userId ? await nonAuthCtx.api.listProjectsForOwner(userId) : undefined,
    [nonAuthCtx, userId]
  );

  return (
    <div className="mv-lg">
      <h2>Lookup projects for user</h2>
      <div>
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
        <Table
          dataSource={projectsResp.value?.projects ?? []}
          rowKey="id"
          columns={[
            {
              title: "Project",
              dataIndex: "name",
              render: (x, project) => (
                <a target="_blank" href={`/projects/${project.id}`}>
                  {project.name}
                </a>
              ),
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
              title: "Owner?",
              dataIndex: "createdById",
              render: (id) => (id === userId ? "Yes" : "No"),
              sorter: (a, b) => (a.createdById === userId ? -1 : 1),
            },
          ]}
        />
      </div>
    </div>
  );
}

export function AllTeamUsers({ teamId }: { teamId?: string }) {
  if (!teamId) {
    return <p>Team not found!</p>;
  }
  const [shouldReRender, forceRender] = React.useState({});
  const nonAuthCtx = useNonAuthCtx();
  const teamResp = useAsyncStrict(
    () => nonAuthCtx.api.getTeam(teamId as TeamId),
    [nonAuthCtx, 0, shouldReRender]
  );

  const [selectedUser, setSelectedUser] = useState<string | undefined>(
    undefined
  );

  const changeTeamOwner = async () => {
    if (selectedUser) {
      await nonAuthCtx.api.changeTeamOwner(teamId, selectedUser);
    }
    forceRender({});
  };
  const resetTeamTrial = async () => {
    await nonAuthCtx.api.resetTeamTrial(teamId);
    forceRender({});
  };
  const getEmail = (perm: ApiPermission) => perm.user?.email ?? perm.email;

  return (
    <div className="mv-lg">
      <Table
        dataSource={teamResp.value?.perms ?? []}
        rowKey="id"
        columns={[
          {
            title: "Email",
            key: "email",
            render: (value: any, perm: ApiPermission) => getEmail(perm),
            sorter: (a, b) =>
              (getEmail(a) ?? "") < (getEmail(b) ?? "") ? -1 : 1,
          },
          {
            title: "isUser",
            key: "isUser",
            render: (value: any, perm: ApiPermission) => `${!!perm.user}`,
            sorter: (a, b) => (!!a.user < !!b.user ? -1 : 1),
          },
          {
            title: "Access Level",
            dataIndex: "accessLevel",
            render: smartRender,
            sorter: (a, b) => (a.accessLevel < b.accessLevel ? -1 : 1),
          },
        ]}
      />
      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
        }}
      >
        <strong>Change team owner</strong>
        <Select
          style={{ width: 400 }}
          showSearch
          placeholder="Select new owner"
          filterOption={(input, option) => {
            const perm: ApiPermission | undefined = option?.perm;
            if (perm?.user) {
              return (
                perm.user.email?.toLowerCase().includes(input.toLowerCase()) ||
                perm.user.firstName
                  ?.toLowerCase()
                  .includes(input.toLowerCase()) ||
                perm.user.lastName
                  ?.toLowerCase()
                  .includes(input.toLowerCase()) ||
                false
              );
            }
            return false;
          }}
          options={
            teamResp.value
              ? teamResp.value.perms
                  .filter((perm) => perm.user)
                  .map((perm) => ({
                    value: perm.user?.id,
                    label: perm.user?.email,
                    perm,
                  }))
              : []
          }
          onChange={(val) => {
            setSelectedUser(val);
          }}
          value={selectedUser}
        />
        <Button onClick={changeTeamOwner}>Confirm</Button>
      </div>
      <div>
        <Button onClick={resetTeamTrial}>Reset team free trial</Button>
      </div>
    </div>
  );
}

export function UserTeams() {
  const nonAuthCtx = useNonAuthCtx();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const usersResp = useAsyncStrict(
    () => nonAuthCtx.api.listUsers(),
    [nonAuthCtx, 0]
  );
  const [teamsResp, fetchTeams] = useAsyncFnStrict(
    async () =>
      userId ? await nonAuthCtx.api.listTeamsForUser(userId) : undefined,
    [nonAuthCtx, userId]
  );
  useAsyncStrict(fetchTeams, [nonAuthCtx, userId]);

  const [selectedTeam, setSelectedTeam] = useState<ApiTeam | undefined>(
    undefined
  );
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <div className="mv-lg">
      <h2>Lookup teams for user</h2>
      <div>
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
        <Table
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
            {
              title: "Actions",
              render: (record: ApiTeam) => {
                if (!record.personalTeamOwnerId) {
                  return null;
                }
                return (
                  <div>
                    <LinkButton
                      onClick={async () => {
                        await nonAuthCtx.api.upgradePersonalTeam(record.id);
                        await fetchTeams();
                      }}
                    >
                      Promote to real team
                    </LinkButton>
                  </div>
                );
              },
            },
          ]}
          style={{ cursor: "pointer" }}
          onRow={(record) => ({
            onClick: () => {
              setSelectedTeam(record);
              setModalVisible(true);
            },
          })}
        />
      </div>
      <div>
        <Modal
          visible={modalVisible}
          footer={null}
          title={selectedTeam?.name}
          onCancel={() => setModalVisible(false)}
          width={"80%"}
        >
          <AllTeamUsers key={selectedTeam?.id} teamId={selectedTeam?.id} />
        </Modal>
      </div>
    </div>
  );
}

export function Inviter() {
  const nonAuthCtx = useNonAuthCtx();
  const admin = useAdminContext();
  const [emails, setEmails] = useState("");

  async function onSubmit() {
    const uniqEmails = L.uniq(emails.toLowerCase().split(/[,\s]+/g));
    const { skippedEmails } = await nonAuthCtx.api.invite({
      emails: uniqEmails,
    });
    if (skippedEmails.length) {
      notification.warn({
        message: "Some emails failed",
        description: `Skipped ${
          skippedEmails.length
        } of ${uniqEmails} unique emails: ${skippedEmails.join(", ")}. `,
      });
    }
    admin.onRefresh();
  }

  return (
    <div className="mv-lg">
      <h2>Invite and whitelist user</h2>

      <Form onFinish={onSubmit}>
        This can be whitespace and comma separated.
        <Input
          placeholder={"Email(s)"}
          name={"emails"}
          value={emails}
          onChange={(e) => setEmails(e.target.value.toLowerCase())}
        />
        <Button htmlType={"submit"}>Send invite</Button>
      </Form>
    </div>
  );
}

function UserLoader({ id }: { id: string }) {
  const nonAuthCtx = useNonAuthCtx();

  const userResp = useAsyncStrict(
    () => nonAuthCtx.api.getUsersById([id]),
    [nonAuthCtx]
  );

  const user = userResp.value?.users[0];
  return <div>{user && <Avatar user={user} />}</div>;
}

export function InviteApprovalsView() {
  const nonAuthCtx = useNonAuthCtx();
  const admin = useAdminContext();

  const requestsResp = useAsyncStrict(
    () => nonAuthCtx.api.listInviteRequests(),
    [nonAuthCtx]
  );

  async function whitelistUser(email: string) {
    await nonAuthCtx.api.addToWhitelist({ email });
    admin.onRefresh();
  }
  async function whitelistDomain(email: string) {
    await nonAuthCtx.api.addToWhitelist({
      domain: extractDomainFromEmail(email),
    });
    admin.onRefresh();
  }

  return (
    <div>
      <h2>Invite approval requests</h2>
      <Table
        dataSource={requestsResp.value?.requests ?? []}
        rowKey={"id"}
        columns={[
          {
            key: "createdById",
            dataIndex: "createdById",
            title: "Created By",
            render: (id) => <UserLoader id={id} />,
          },
          ...["inviteeEmail", "projectId", "createdAt"].map((key) => ({
            key,
            dataIndex: key,
            title: L.startCase(key),
            render: smartRender,
            ...(key === "createdAt"
              ? { defaultSortOrder: "descend" as const }
              : {}),
          })),
          {
            title: "Action",
            key: "action",
            render: (value, request) => (
              <div>
                <LinkButton onClick={() => whitelistUser(request.inviteeEmail)}>
                  Whitelist user
                </LinkButton>{" "}
                |{" "}
                <LinkButton
                  onClick={() => whitelistDomain(request.inviteeEmail)}
                >
                  Whitelist domain
                </LinkButton>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function PublicProjectsView() {
  const nonAuthCtx = useNonAuthCtx();
  const [projectId, setProjectId] = useState("");
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div>
      <h2>Update Public Projects</h2>
      <Form
        onFinish={async () => {
          await nonAuthCtx.api.setSiteInfo(projectId, {
            readableByPublic: isChecked,
          });
        }}
      >
        <Input
          type={"input"}
          value={projectId}
          placeholder="Project Id"
          onChange={(e) => setProjectId(e.target.value)}
        />
        <Checkbox
          onChange={(e) => setIsChecked(e.target.checked)}
          checked={isChecked}
        >
          Should be public
        </Checkbox>
        <Button htmlType={"submit"}>Update</Button>
      </Form>
    </div>
  );
}

function CloneProjectView() {
  const nonAuthCtx = useNonAuthCtx();

  return (
    <div>
      <h2>Clone projects</h2>
      <p>
        This allows you to clone projects by ID, even if share-by-link is turned
        off
      </p>
      <Form
        onFinish={async (event) => {
          try {
            console.log("CLONING", event.projectId, event.revision);
            const res = await nonAuthCtx.api.cloneProjectAsAdmin(
              event.projectId,
              event.revision
            );
            notification.success({
              message: "Project cloned",
              description: (
                <a
                  href={UU.project.fill({ projectId: res.projectId })}
                  target="_blank"
                >
                  Go to project
                </a>
              ),
            });
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="projectId" label="Project ID">
          <Input type={"input"} placeholder="Project Id" />
        </Form.Item>
        <Form.Item name="revision" label="Revision (optional)">
          <Input type={"number"} placeholder="Revision" />
        </Form.Item>
        <Button htmlType={"submit"}>Clone</Button>
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

function UploadProject() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <h2>Upload project from JSON</h2>
      <p>This uploads a json bundle as a project.</p>
      <Button
        onClick={() =>
          getUploadedFile(async (data: string) => {
            await nonAuthCtx.api.importProject(data).then(({ projectId }) => {
              document.location.href = U.project({
                projectId: projectId,
              });
            });
          })
        }
      >
        Upload
      </Button>
    </div>
  );
}

function DownloadProjectView() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <h2>Download project as JSON</h2>
      <p>
        This downloads a project as a json blob, which you can then import into
        your own local dev server.
      </p>
      <Form
        onFinish={async (event) => {
          try {
            const appCtx = await loadAppCtx(nonAuthCtx);
            await appCtx.ops?.download(event.projectId, {
              dontMigrateProject: event.dontMigrateProject,
            });
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="projectId" label="Project ID">
          <Input type={"input"} placeholder="Project Id" />
        </Form.Item>
        <Form.Item
          name="dontMigrateProject"
          label="Don't migrate project?"
          valuePropName="checked"
        >
          <Checkbox />
        </Form.Item>
        <Button htmlType={"submit"}>Download</Button>
      </Form>
    </div>
  );
}

function DownloadProjectViewAndBranches() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <h2>Download project and branches as JSON</h2>
      <p>
        This downloads the whole project data, including branches and
        dependencies, as a JSON blob, which you can then import into your own
        local dev server.
      </p>
      <Form
        onFinish={async (event) => {
          try {
            const appCtx = await loadAppCtx(nonAuthCtx);
            await appCtx.ops?.downloadFullProjectData(
              event.projectId,
              ((event.branchIds as string) ?? "")
                .trim()
                .split(",")
                .map((branchId) => branchId.trim())
                .filter((branchId) => !!branchId)
            );
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="projectId" label="Project ID">
          <Input type={"input"} placeholder="Project Id" />
        </Form.Item>
        <Form.Item name="branchIds" label="Branch IDs (or names)">
          <Input
            type={"input"}
            placeholder="Comma separated list of branch IDs (main is always included)"
          />
        </Form.Item>
        <Button htmlType={"submit"}>Download</Button>
      </Form>
    </div>
  );
}

function ImportProjectsFromProd() {
  const nonAuthCtx = useNonAuthCtx();
  const [projectsInfo, setProjectsInfo] = React.useState<
    { projectId: string; bundle: string; name: string }[] | undefined
  >(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const ref = React.createRef<HTMLIFrameElement>();
  React.useEffect(() => {
    const listener = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === "import-project-from-prod") {
          setProjectsInfo(data.projectsInfo);
          spawn(
            nonAuthCtx.api.setDevFlagOverrides(
              JSON.stringify(data.devflags, null, 2)
            )
          );
        }
      } catch {}
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const updateProjects = async () => {
    if (projectsInfo) {
      console.log("## Deleting existing projects...");
      for (const bundle of projectsInfo) {
        await nonAuthCtx.api.deleteProjectAndRevisions(bundle.projectId);
      }
      console.log("## Uploading new projects...");
      // We have to do it sync, since we can end up trying to insert the same project twice, concurrently and that will fail.
      for (const bundle of projectsInfo) {
        await nonAuthCtx.api.importProject(bundle.bundle, {
          keepProjectIdsAndNames: true,
          projectName: bundle.name,
        });
      }

      ref.current!.contentWindow?.postMessage(
        JSON.stringify({
          source: "import-project-from-prod",
          done: true,
        })
      );

      setModalVisible(false);
    }
  };

  React.useEffect(() => {
    spawn(updateProjects());
  }, [projectsInfo]);

  const showImportFromProd = window.location.hostname.includes("localhost");
  // Don't even show this on prod, just for extra safety
  if (!showImportFromProd) {
    return null;
  }

  return (
    <div>
      <h2>Import devflags and plasmic projects from prod</h2>
      <Modal
        visible={modalVisible}
        footer={null}
        title={"Import plasmic projects from prod"}
        onCancel={() => setModalVisible(false)}
        width={800}
      >
        <iframe
          src="https://studio.plasmic.app/import-projects-from-prod"
          width={760}
          height={500}
          ref={ref}
        />
      </Modal>
      <Button
        disabled={window.location.hostname.startsWith(
          "https://studio.plasmic.app"
        )}
        onClick={() => setModalVisible((v) => !v)}
      >
        Import
      </Button>
      <p>This will override your current devflags</p>
    </div>
  );
}
function DownloadPlumePkg() {
  const nonAuthCtx = useNonAuthCtx();
  const download = async (type: "latest" | "current") => {
    const appCtx = await loadAppCtx(nonAuthCtx);
    const { pkg } = await (type === "current"
      ? appCtx.api.getPlumePkg()
      : appCtx.api.getLatestPlumePkg());
    const blob = new Blob([JSON.stringify(pkg.model)], {
      type: "text/plain;charset=utf-8",
    });
    downloadBlob(blob, "plume-master-pkg.json");
  };
  return (
    <div>
      <h2>Download Plume pkg as json</h2>
      <Button onClick={() => download("latest")}>
        Download latest version
      </Button>
      <Button onClick={() => download("current")}>
        Download currently used
      </Button>
    </div>
  );
}

const LazyFullCodeEditor = React.lazy(
  () => import("@/wab/client/components/coding/FullCodeEditor")
);

function DevFlagControls() {
  const nonAuthCtx = useNonAuthCtx();
  const { data, error, mutate, isLoading } = useSWR(
    "/admin/devflags",
    async () => {
      return (await nonAuthCtx.api.getDevFlagOverrides()).data;
    }
  );

  const {
    data: devFlagVersions,
    mutate: mutateVersions,
    isLoading: isVersionsLoading,
  } = useSWR("/admin/devflags/versions", async () => {
    return (await nonAuthCtx.api.getDevFlagVersions())?.versions;
  });

  const editorRef = React.useRef<FullCodeEditor>(null);
  const [compareTo, setCompareTo] = React.useState("");

  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit() {
    const draft = editorRef.current!.getValue();
    try {
      JSON.parse(draft);
    } catch (e) {
      setSubmitError("Invalid JSON");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    await nonAuthCtx.api.setDevFlagOverrides(draft);
    setSubmitting(false);
    await mutate(draft);
    await mutateVersions();
  }
  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await submit();
        }}
      >
        <h2>Dev Flag Overrides</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        {submitError && <p style={{ color: "red" }}>{submitError}</p>}
        <div style={{ height: 1050 }}>
          {!isLoading ? (
            <React.Suspense fallback={<Spinner />}>
              <LazyFullCodeEditor
                language="json"
                ref={editorRef}
                defaultValue={data || ""}
                autoFocus={false}
              />
            </React.Suspense>
          ) : (
            <Spinner />
          )}
        </div>
        <Button loading={submitting} htmlType={"submit"}>
          Submit
        </Button>
      </form>
      <Table
        rowKey="id"
        loading={isVersionsLoading}
        dataSource={devFlagVersions ?? []}
        columns={[
          {
            title: "Id",
            dataIndex: "id",
          },
          {
            title: "Created by",
            dataIndex: "createdBy",
            render: (val) => val?.email,
          },
          {
            title: "Created at",
            dataIndex: "createdAt",
            render: (val) => `${moment.utc(val).fromNow()} - ${val}`,
          },
          {
            title: "Actions",
            render: (record) => {
              return (
                <>
                  <LinkButton
                    type="button"
                    onClick={async () => {
                      const confirm = window.confirm(
                        "Are you sure you want to revert to this version?"
                      );
                      if (confirm) {
                        await nonAuthCtx.api.setDevFlagOverrides(record.data);
                        await mutate();
                        await mutateVersions();
                        alert("Reverted! Reload the page to see the changes.");
                      }
                    }}
                  >
                    Revert
                  </LinkButton>
                  <LinkButton
                    type="button"
                    onClick={async () => {
                      setCompareTo(record.data);
                    }}
                  >
                    Diff
                  </LinkButton>
                </>
              );
            },
          },
        ]}
      />

      <Modal
        open={compareTo.length > 0}
        footer={null}
        title={"Diff"}
        onCancel={() => setCompareTo("")}
        width={1500}
      >
        {/* TODO: use something like json-diff */}
        <div className="flex">
          {data && data.length > 0 && (
            <div>
              <h3>Current</h3>
              <pre
                style={{
                  width: 600,
                }}
              >
                {JSON.stringify(JSON.parse(data ?? "{}"), null, 2)}
              </pre>
            </div>
          )}
          {compareTo.length > 0 && (
            <div>
              <h3>Old version</h3>
              <pre
                style={{
                  width: 600,
                }}
              >
                {JSON.stringify(JSON.parse(compareTo), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

export function FeatureTierControls() {
  const nonAuthCtx = useNonAuthCtx();
  const admin = useAdminContext();
  // Viewing table
  const [query, setQuery] = useState<string | undefined>("");
  const [reloadCount, setReloadCount] = useState(0);
  // New tier submission form
  const [newTierData, setNewTierData] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Get tiers
  const tiersResp = useAsyncStrict(async () => {
    return await nonAuthCtx.api.listAllFeatureTiers();
  }, [nonAuthCtx, reloadCount]);
  const tiers = tiersResp.value?.tiers ?? [];
  const keysToDisplay: string[] = tiers.length > 0 ? Object.keys(tiers[0]) : [];
  // Removes certain keys in-place
  [
    "updatedAt",
    "deletedAt",
    "createdById",
    "updatedById",
    "deletedById",
  ].forEach((toRemove) => tryRemove(keysToDisplay, toRemove));

  async function submit() {
    let parsedData: ApiFeatureTier;
    try {
      parsedData = JSON.parse(newTierData) as ApiFeatureTier;
    } catch (e) {
      setError("Invalid JSON");
      return;
    }
    try {
      setSubmitting(true);
      await nonAuthCtx.api.addFeatureTier(parsedData);
      setError("");
    } catch (e) {
      setError(e.toString());
    } finally {
      setSubmitting(false);
      admin.onRefresh();
    }
  }

  return (
    <div className="mv-lg">
      <h2>Feature Tiers</h2>
      <SearchBox value={query} onChange={(e) => setQuery(e.target.value)} />
      <Table
        dataSource={tiers.filter((tier) => {
          if (!query || query.trim().length === 0) {
            return true;
          }
          return tier.name?.toLowerCase().includes(query.toLowerCase());
        })}
        scroll={{ x: "max-content" }}
        rowKey={"id"}
        columns={[
          ...keysToDisplay.map((key) => ({
            key,
            dataIndex: key,
            title: L.startCase(key),
            render: smartRender,
            sorter: (a, b) => (a[key] < b[key] ? -1 : 1),
          })),
        ]}
        onRow={(record, rowIndex) => {
          return {
            onClick: (e) => setNewTierData(JSON.stringify(record, null, 4)),
          };
        }}
      />
      <br />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await submit();
        }}
      >
        <h3>
          Add new tier (click on a row above to start with an existing
          definition)
        </h3>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <TextArea
          value={newTierData}
          onChange={(e) => setNewTierData(e.target.value)}
        />
        <Button loading={submitting} htmlType={"submit"}>
          Add
        </Button>
      </form>
    </div>
  );
}

/**
 * Makes it easy to change an existing team's tier
 * - Note that you need
 */
function TeamTierControls() {
  const nonAuthCtx = useNonAuthCtx();
  const admin = useAdminContext();
  const [error, setError] = useState("");
  const [teamId, setTeamId] = React.useState<TeamId | undefined>();
  const [featureTierName, setFeatureTierName] = React.useState<
    string | undefined
  >();
  const [seats, setSeats] = React.useState<number | undefined>();
  const [billingFrequency, setBillingFreq] = React.useState<
    BillingFrequency | undefined
  >();
  const [billingEmail, setBillingEmail] = React.useState<string | undefined>();
  const [stripeCustomerId, setStripeCustomerId] = React.useState<
    StripeCustomerId | undefined
  >();
  const [stripeSubscriptionId, setStripeSubscriptionId] = React.useState<
    StripeSubscriptionId | undefined
  >();

  spawn(nonAuthCtx.api.listCurrentFeatureTiers({ includeLegacyTiers: true }));

  return (
    <div>
      <h2>Modify team billing</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <h2>Upgrade a team from free tier</h2>
      <p></p>
      <ul>
        <li>
          1. First manually create a Stripe customer and subscription for them.
          If Enterprise, select the right combination of products based on what
          was negotiated. If you plan on charging, make sure you send the user
          the invoice when making the subscription.
        </li>
        <li>2. Populate every field in this form</li>
        <li>
          Warning: If you run this on a team that's already on a paid tier, it
          will NOT cancel the existing subscription
        </li>
      </ul>
      <Form
        onFinish={async () => {
          if (!teamId) {
            return setError("Missing Team ID");
          } else if (!featureTierName) {
            return setError("Missing Feature Tier");
          } else if (!seats) {
            return setError("Missing Seats");
          } else if (!billingFrequency) {
            return setError("Missing Billing Frequency");
          } else if (!billingEmail) {
            return setError("Missing Billing Email");
          } else if (!stripeCustomerId) {
            return setError("Missing Stripe Customer ID");
          } else if (!stripeSubscriptionId) {
            return setError("Missing Stripe Subscription ID");
          }
          const { tiers } = await nonAuthCtx.api.listCurrentFeatureTiers({
            includeLegacyTiers: true,
          });
          const tier = tiers.find(
            (t) => t.name.toLowerCase() === featureTierName.toLowerCase()
          );
          if (!tier) {
            return setError(`Cannot find a tier with name ${featureTierName}`);
          }
          await nonAuthCtx.api.upgradeTeamAsAdmin({
            teamId,
            featureTierId: tier.id,
            seats,
            billingFrequency,
            billingEmail,
            stripeCustomerId,
            stripeSubscriptionId,
          });
          setError("");
          notification.info({
            message: `Upgraded Team ${teamId}`,
          });
        }}
      >
        <Input
          type={"input"}
          value={teamId}
          placeholder="Team ID"
          onChange={(e) => setTeamId(uncheckedCast<TeamId>(e.target.value))}
        />
        <Select
          style={{ width: 120 }}
          onChange={(v: string) => setFeatureTierName(v)}
        >
          {[
            ...DEVFLAGS.featureTierNames.slice(0, -1),
            ...DEVFLAGS.newFeatureTierNames,
          ].map((name) => (
            <Select.Option value={name}>{name}</Select.Option>
          ))}
        </Select>
        <Input
          type={"input"}
          value={seats}
          placeholder="Number of Seats"
          onChange={(e) => setSeats(parseInt(e.target.value))}
        />
        <Select
          style={{ width: 120 }}
          onChange={(v: BillingFrequency) => setBillingFreq(v)}
        >
          <Select.Option value="month">Monthly</Select.Option>
          <Select.Option value="year">Yearly</Select.Option>
        </Select>
        <Input
          type={"input"}
          value={billingEmail}
          placeholder="Billing Email"
          onChange={(e) => setBillingEmail(e.target.value)}
        />
        <Input
          type={"input"}
          value={stripeCustomerId}
          placeholder="Stripe Customer Id"
          onChange={(e) =>
            setStripeCustomerId(uncheckedCast<StripeCustomerId>(e.target.value))
          }
        />
        <Input
          type={"input"}
          value={stripeSubscriptionId}
          placeholder="Stripe Subscription Id"
          onChange={(e) =>
            setStripeSubscriptionId(
              uncheckedCast<StripeSubscriptionId>(e.target.value)
            )
          }
        />
        <Button htmlType={"submit"}>Upgrade team </Button>
      </Form>

      <br />

      <h2>Change team tier</h2>
      <p>
        Note: only use this on teams on an existing paid tier. Team will be
        billed according to the new tier pricing. (Useful for testing enterprise
        on dev server)
      </p>
      <Form
        onFinish={async () => {
          if (!teamId) {
            return setError("Missing Team ID");
          } else if (!featureTierName) {
            return setError("Missing Feature Tier");
          } else if (!seats) {
            return setError("Missing Seats");
          }
          const { tiers } = await nonAuthCtx.api.listCurrentFeatureTiers();
          const tier = tiers.find(
            (t) => t.name.toLowerCase() === featureTierName.toLowerCase()
          );
          if (!tier) {
            return setError(`Cannot find a tier with name ${featureTierName}`);
          }
          const { team } = await nonAuthCtx.api.getTeam(teamId);
          const result = await nonAuthCtx.api.changeSubscription({
            teamId,
            featureTierId: tier.id,
            billingFrequency: team.billingFrequency ?? "month",
            seats,
          });
          if (result.type !== "success") {
            return setError("Error changing subscription");
          }
          setError("");
          notification.info({
            message: `Updated Team ${teamId}`,
          });
        }}
      >
        <Input
          type={"input"}
          value={teamId}
          placeholder="Team ID"
          onChange={(e) => setTeamId(uncheckedCast<TeamId>(e.target.value))}
        />
        <Select
          style={{ width: 120 }}
          onChange={(v: string) => setFeatureTierName(v)}
        >
          {[
            ...DEVFLAGS.featureTierNames.slice(0, -1),
            ...DEVFLAGS.newFeatureTierNames,
          ].map((name) => (
            <Select.Option value={name}>{name}</Select.Option>
          ))}
        </Select>
        <Input
          type={"input"}
          value={seats}
          placeholder="Number of Seats"
          onChange={(e) => setSeats(parseInt(e.target.value))}
        />
        <Button htmlType={"submit"}>Change plan</Button>
      </Form>

      <br />

      <h2>Cancel a team plan</h2>
      <p>Note: only use this on teams on an existing paid tier</p>
      <Form
        onFinish={async () => {
          if (!teamId) {
            setError("Missing Team ID");
            return;
          }
          await nonAuthCtx.api.cancelSubscription(teamId);
          setError("");
          notification.info({
            message: `Done cancelling ${teamId}`,
          });
        }}
      >
        <Input
          type={"input"}
          value={teamId}
          placeholder="Team ID"
          onChange={(e) => setTeamId(uncheckedCast<TeamId>(e.target.value))}
        />
        <Button htmlType={"submit"}>Cancel plan</Button>
      </Form>
    </div>
  );
}

function CodeSandboxControls() {
  const nonAuthCtx = useNonAuthCtx();
  const admin = useAdminContext();
  const [token, setToken] = React.useState("");

  return (
    <div>
      <h2>CodeSandbox</h2>
      <p>To refresh the CodeSandbox token</p>
      <ol>
        <li>
          1. Go to{" "}
          <a href="https://codesandbox.io/cli/login" target="_blank">
            this url
          </a>
        </li>
        <li>
          2. Log into Github using the <strong>plasmicops</strong> user; find
          credentials{" "}
          <a
            href="https://docs.google.com/document/d/1tl4jM1lel8uSbMhtxN-ExiQe06Y4cPvCd57feiE3WI4/edit"
            target="_blank"
          >
            here
          </a>
          . <strong>Make sure you don't use your own Github login!</strong>
        </li>
        <li>3. Paste the token you see on the page into this form.</li>
      </ol>
      <Form
        onFinish={async () => {
          try {
            const result = await nonAuthCtx.api.updateCodeSandboxToken(token);
            if (result.error) {
              notification.error({
                message: "Codesandbox token did not work :'(",
                description: `${result.error}`,
              });
            } else {
              notification.success({
                message: "Codesandbox token updated!",
                description: `User: ${result.user.email}`,
              });
            }
          } catch (e) {
            notification.error({
              message: "Codesandbox token did not work :'(",
              description: `${e}`,
            });
          }
          setToken("");
          admin.onRefresh();
        }}
      >
        <Input
          placeholder={"New Token"}
          name={"token"}
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <Button htmlType={"submit"}>Update token</Button>
      </Form>
    </div>
  );
}

function RevertProjectRev() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <h2>Revert project to revision</h2>
      <p>Creates a new revision with data from a specific revision</p>
      <Form
        onFinish={async (event) => {
          console.log(`Reverting ${event.projectId} to ${event.revision}`);
          try {
            await nonAuthCtx.api.revertProjectRevision(
              event.projectId,
              event.revision
            );
            notification.success({ message: "Successfully reverted!" });
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="projectId" label="Project ID">
          <Input placeholder="Project ID" />
        </Form.Item>
        <Form.Item name="revision" label="Revision to revert to">
          <Input placeholder="Revision number" type={"number"} />
        </Form.Item>
        <Button htmlType="submit">Revert</Button>
      </Form>
    </div>
  );
}

function ChangeProjectOwner() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <h2>Change project owner</h2>
      <Form
        onFinish={async (event) => {
          try {
            await nonAuthCtx.api.changeProjectOwner(
              event.projectId,
              event.ownerEmail
            );
            notification.success({ message: "Successfully updated!" });
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="projectId" label="Project ID">
          <Input placeholder="Project ID" />
        </Form.Item>
        <Form.Item name="ownerEmail" label="New owner email address">
          <Input placeholder="Owner email" type={"email"} />
        </Form.Item>
        <Button htmlType="submit">Update</Button>
      </Form>
    </div>
  );
}

function ConfigureSaml() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <h2>Configure SAML SSO</h2>
      <Form
        onFinish={async (event) => {
          console.log("FORM", event);
          try {
            const saml = await nonAuthCtx.api.upsertSamlConfig(event);
            console.log("Created", saml);
            notification.success({
              message: `SAML Config updated!  Tenant ID is ${saml.tenantId}`,
            });
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="teamId" label="Team ID">
          <Input />
        </Form.Item>
        <Form.Item name="domain" label="Domain">
          <Input />
        </Form.Item>
        <Form.Item name="entrypoint" label="Entrypoint">
          <Input />
        </Form.Item>
        <Form.Item name="issuer" label="Issuer">
          <Input />
        </Form.Item>
        <Form.Item name="cert" label="Cert">
          <TextArea />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit">Update</Button>
        </Form.Item>
      </Form>
    </div>
  );
}

function ConfigureSso() {
  const nonAuthCtx = useNonAuthCtx();
  const [form] = Form.useForm();
  return (
    <div>
      <h2>Configure SSO</h2>
      <Form
        form={form}
        initialValues={{
          provider: "okta",
          config: DEFAULT_SSO_CONFIG_TEMPLATES["okta"],
        }}
        onFinish={async (event) => {
          console.log("FORM", event);

          try {
            const data = { ...event, config: JSON.parse(event.config) };
            console.log("Submitting", data);
            const sso = await nonAuthCtx.api.upsertSsoConfig(data);
            console.log("Created", sso);
            notification.success({
              message: `SSO Config updated!  Tenant ID is ${sso.tenantId}`,
            });
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="teamId" label="Team ID">
          <Input
            onBlur={async () => {
              const teamId = form.getFieldValue("teamId");
              const existing = await nonAuthCtx.api.getSsoConfigByTeamId(
                teamId as TeamId
              );
              if (existing) {
                form.setFieldsValue({
                  ...existing,
                  domain: existing.domains[0],
                  config: JSON.stringify(existing.config, undefined, 2),
                });
              }
            }}
          />
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
          <Button htmlType="submit">Update</Button>
        </Form.Item>
      </Form>
    </div>
  );
}

function CreateTutorialDb() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <h2>Create a TutorialDB</h2>
      <p>
        Enter the name of the tutorialdb directory in src/wab/server/tutorialdb
      </p>
      <Form
        onFinish={async (event) => {
          try {
            const type = event.type;
            console.log("Creating tutorial db", type);
            const result = await nonAuthCtx.api.createTutorialDb(type);
            console.log("Created", result);
            notification.success({
              message: (
                <div>
                  <div>
                    <strong>Tutorial DB created!</strong>
                  </div>
                  <div>TutorialDB ID: {result.id}</div>
                </div>
              ),
              duration: 0,
            });
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="type" label="Template">
          <Input placeholder="northwind" />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit">Create</Button>
        </Form.Item>
      </Form>
    </div>
  );
}

function ResetTutorialDb() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <h2>Reset a TutorialDB</h2>
      <Form
        onFinish={async (event) => {
          try {
            const { sourceId } = event;
            console.log("Resetting tutorial db", sourceId);
            await nonAuthCtx.api.resetTutorialDb(sourceId);
            notification.success({
              message: (
                <div>
                  <div>
                    <strong>Tutorial DB reset!</strong>
                  </div>
                </div>
              ),
              duration: 0,
            });
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="sourceId" label="Data source ID">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit">Reset</Button>
        </Form.Item>
      </Form>
    </div>
  );
}

function TeamApiTokens() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <h3>Create Team API Token</h3>
      <Form
        onFinish={async (event) => {
          try {
            const { teamId } = event;
            const res = await nonAuthCtx.api.createTeamApiToken(
              teamId as TeamId
            );
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
        }}
      >
        <Form.Item name="teamId" label="Team ID">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit">Create</Button>
        </Form.Item>
      </Form>
    </div>
  );
}

function TourCypressTest() {
  return (
    <div>
      <h2> Get updated tour Cypress test</h2>
      <Button
        onClick={async () => {
          const content = stepsToCypress(STUDIO_ONBOARDING_TUTORIALS.complete);
          // move content to the clipboard
          await navigator.clipboard.writeText(content);
          notification.success({
            message: "Copied to clipboard!",
          });
        }}
      >
        Generate
      </Button>
    </div>
  );
}

function WhiteLabelTeamJwtOpen() {
  const nonAuthCtx = useNonAuthCtx();
  const [team, setTeam] = React.useState<ApiTeam | undefined>(undefined);

  return (
    <>
      <TeamWhiteLabelLookup onChange={(t) => setTeam(t)} />
      {team && (
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
      )}
    </>
  );
}

function TeamWhiteLabelLookup(props: { onChange: (team: ApiTeam) => void }) {
  const { onChange } = props;
  const nonAuthCtx = useNonAuthCtx();
  return (
    <Form
      layout="inline"
      onFinish={async (values) => {
        const teamName = values.whiteLabelName;
        const team = await nonAuthCtx.api.getTeamByWhiteLabelName(teamName);
        onChange(team);
      }}
    >
      <Form.Item label="White label name" name="whiteLabelName">
        <Input />
      </Form.Item>
      <Form.Item>
        <Button htmlType="submit">Lookup</Button>
      </Form.Item>
    </Form>
  );
}

function WhiteLabelTeamClientCredentials() {
  const nonAuthCtx = useNonAuthCtx();
  const [team, setTeam] = React.useState<ApiTeam | undefined>(undefined);

  return (
    <>
      <TeamWhiteLabelLookup onChange={(t) => setTeam(t)} />
      {team && (
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
              notification.success({ message: "Updated!" });
            }}
          >
            <Form.Item
              name={["apiClientCredentials", "clientId"]}
              label="Client ID"
            >
              <Input />
            </Form.Item>
            <Form.Item name={["apiClientCredentials", "issuer"]} label="Issuer">
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
      )}
    </>
  );
}

function SetTeamWhiteLabelName() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <p>
        Convert a team to a white-labeled team by associating a white-label name
        with it.
      </p>
      <Form
        onFinish={async (values) => {
          if (values.whiteLabelName?.trim() === "") {
            values.whiteLabelName = null;
          }
          const team = await nonAuthCtx.api.updateTeamWhiteLabelName(
            values.teamId,
            values.whiteLabelName
          );
          notification.success({
            message: "Successfully updated white label team name",
            description: `Team ${team.id} has name "${team.whiteLabelName}"`,
          });
        }}
      >
        <Form.Item name="teamId" label="Team ID">
          <Input />
        </Form.Item>
        <Form.Item name="whiteLabelName" label="White label name">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit">Save</Button>
        </Form.Item>
      </Form>
    </div>
  );
}

function WhiteLabeledTeam() {
  return (
    <div>
      <h2>Manage white-labeled teams</h2>
      <Tabs
        items={[
          {
            key: "gen-token",
            label: "Generate Team API token",
            children: <TeamApiTokens />,
          },
          {
            key: "jwt",
            label: "Configure Redirect flow with JWT",
            children: <WhiteLabelTeamJwtOpen />,
          },
          {
            key: "client-credentials",
            label: "Configure API client credentials",
            children: <WhiteLabelTeamClientCredentials />,
          },
          {
            key: "create",
            label: "Make white-labeled team",
            children: <SetTeamWhiteLabelName />,
          },
        ]}
      />
    </div>
  );
}

function PromotionCode() {
  const nonAuthCtx = useNonAuthCtx();
  const [form] = Form.useForm();

  return (
    <div>
      <h2>Create promotion code</h2>
      <Form
        form={form}
        onFinish={async (event) => {
          const id = event.id;
          const message = event.message;
          const trialDays = parseInt(event.trialDays);
          const expirationDate = event.expirationDate
            ? (event.expirationDate.utc().endOf("day").toDate() as Date)
            : undefined;
          console.log(typeof trialDays);
          assert(id && typeof id === "string", "Promo code requires an id");
          assert(
            message && typeof message === "string",
            "Promo code requires a message"
          );
          assert(
            trialDays && typeof trialDays === "number" && trialDays > 0,
            "Promo code requires the amount of trial days"
          );
          await nonAuthCtx.api.createPromotionCode(
            id,
            message,
            trialDays,
            expirationDate
          );
          notification.info({
            message: `Created promotion code with id = ${id}. The promotion page is https://plasmic.app/?promo=${encodeURIComponent(
              id
            )}`,
          });
        }}
      >
        <Form.Item name="id" label="Promo code">
          <Input />
        </Form.Item>
        <Form.Item name="message" label="Banner message">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="trialDays" label="How many days of trial">
          <Input type="number" defaultValue={DEVFLAGS.freeTrialPromoDays} />
        </Form.Item>
        <Form.Item name="expirationDate" label="Expiration Date">
          <DatePicker format={"YYYY-MM-DD"} />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit">Save</Button>
        </Form.Item>
      </Form>
    </div>
  );
}

interface LinkToDownloadStringProps {
  // The file content to be downloaded
  content: string;
  // defaults to `data.json`
  fileName?: string;
  children?: React.ReactNode;
}

function LinkToDownloadString({
  content,
  children,
  fileName,
}: LinkToDownloadStringProps) {
  const blob = useMemo(
    () =>
      new Blob([content], {
        type: "text/plain;charset=utf-8",
      }),
    [content]
  );
  const [objectUrl, setObjectUrl] = useState<string>("");
  useEffect(() => {
    // Data URL has a size limit. However, object url doesn't.
    const newObjectUrl = URL.createObjectURL(blob);
    setObjectUrl(newObjectUrl);

    return () => {
      // Note that the URL created by URL.createObjectURL(blob) won't be
      // released until the document is unloaded or the URL is explicitly
      // released. So here we release it explicitly.
      URL.revokeObjectURL(newObjectUrl);
    };
  }, [blob]);

  return (
    <a
      href={objectUrl}
      download={fileName || "data.json"}
      style={{ padding: 4 }}
    >
      {children ?? "Download"}
    </a>
  );
}

function CopilotFeedbackView() {
  const nonAuthCtx = useNonAuthCtx();
  const [query, setQuery] = useState("");
  const PAGE_SIZE = 10;
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: PAGE_SIZE,
    current: 1,
  });

  const feedbackResp = useAsyncStrict(async () => {
    const res = await nonAuthCtx.api.queryCopilotFeedback({
      query: query.trim() ? query.trim() : undefined,
      pageSize: PAGE_SIZE,
      pageIndex: (pagination.current ?? 1) - 1,
    });
    if (res.total !== pagination.total) {
      pagination.total = res.total;
    }
    return res;
  }, [nonAuthCtx, query, PAGE_SIZE, pagination.current]);

  return (
    <div className="mv-lg">
      <h2>View Copilot Feedback</h2>
      <SearchBox
        placeholder={"Project ID or user email (press enter to run)"}
        onEdit={(v) => setQuery(v)}
      />
      <Table
        rowKey="id"
        loading={feedbackResp.loading}
        dataSource={feedbackResp.value?.feedback ?? []}
        columns={[
          {
            title: "User",
            dataIndex: "createdByEmail",
          },
          {
            title: "Prompt",
            dataIndex: "userPrompt",
          },
          {
            title: "Response",
            dataIndex: "response",
            render: (string) => <code className="code">{string}</code>,
          },
          {
            title: "Feedback",
            dataIndex: "feedback",
            render: (feedback?: boolean) =>
              feedback == null ? null : feedback ? (
                <CheckIcon width={32} height={32} style={{ color: "green" }} />
              ) : (
                <CircleCloseIcon
                  width={32}
                  height={32}
                  style={{ color: "red" }}
                />
              ),
          },
          {
            title: "Feedback description",
            dataIndex: "feedbackDescription",
          },
          {
            title: "Full Prompt",
            dataIndex: "fullPromptSnapshot",
            render: (snapshot) => {
              return (
                <LinkToDownloadString
                  content={JSON.stringify(JSON.parse(snapshot), undefined, 2)}
                />
              );
            },
          },
          {
            title: "Project ID",
            dataIndex: "projectId",
          },
          {
            title: "Created at",
            dataIndex: "createdAt",
            render: smartRender,
          },
        ]}
        pagination={pagination}
        onChange={({ current }) => {
          if (current !== pagination.current) {
            setPagination({ ...pagination, current });
          }
        }}
      />
      {feedbackResp.value && (
        <>
          Total: {feedbackResp.value.totalLikes} (
          {feedbackResp.value.totalLikes} likes,{" "}
          {feedbackResp.value.totalDislikes} dislikes)
        </>
      )}
    </div>
  );
}

function AppAuthMetrics() {
  const nonAuthCtx = useNonAuthCtx();
  const [recency, setRecency] = useState(7);
  const [threshold, setThreshold] = useState(0);
  const [key, setKey] = useState(`app-auth-metrics-${recency}-${threshold}`);

  const { data, isLoading, mutate } = useSWR(key, async () => {
    const res = await nonAuthCtx.api.getAppAuthMetrics(recency, threshold);
    return res;
  });

  return (
    <div className="mv-lg">
      <h2>App Auth Metrics</h2>
      <InputNumber
        value={recency}
        onChange={(value) => setRecency(value ?? 0)}
        addonBefore={"Recency"}
      />
      <InputNumber
        value={threshold}
        onChange={(value) => setThreshold(value ?? 0)}
        addonBefore={"Threshold"}
      />
      <Button
        onClick={async () => {
          const newKey = `app-auth-metrics-${recency}-${threshold}`;
          if (newKey !== key) {
            setKey(newKey);
          } else {
            await mutate();
          }
        }}
      >
        Query / Refresh
      </Button>
      <h4>
        Total apps registered with plasmic-auth:{" "}
        {data?.metrics?.appsUsingPlasmicAuth}{" "}
      </h4>
      <h4>
        Total apps registered with custom-auth:{" "}
        {data?.metrics?.appsUsingCustomAuth}{" "}
      </h4>
      <h4>Number of active apps: {data?.metrics?.numberOfActiveApps} </h4>
      <Table
        rowKey="projectId"
        loading={isLoading}
        dataSource={data?.metrics?.mostActiveApps ?? []}
        columns={[
          {
            title: "Project ID",
            dataIndex: "projectId",
          },
          {
            title: "Active users that logged in",
            dataIndex: "amount",
          },
        ]}
      />
    </div>
  );
}

function DownloadAppMeta() {
  const nonAuthCtx = useNonAuthCtx();
  return (
    <div>
      <h2>Download App Meta</h2>
      <p>This downloads metadata of auth and datasources of an app</p>
      <Form
        onFinish={async (event) => {
          try {
            const appCtx = await loadAppCtx(nonAuthCtx);
            const meta = await appCtx.api.getAppMeta(event.projectId);
            const blob = new Blob([JSON.stringify(meta)], {
              type: "text/plain;charset=utf-8",
            });
            downloadBlob(blob, `app-${event.projectId}-meta.json`);
          } catch (e) {
            notification.error({ message: `${e}` });
          }
        }}
      >
        <Form.Item name="projectId" label="Project ID">
          <Input type={"input"} placeholder="Project Id" />
        </Form.Item>
        <Button htmlType={"submit"}>Download</Button>
      </Form>
    </div>
  );
}

function EditProjectRevBundle() {
  const nonAuthCtx = useNonAuthCtx();
  const [initialRev, setInitialRev] = React.useState<
    ApiProjectRevision | undefined
  >(undefined);
  const editorRef = React.useRef<FullCodeEditor>(null);
  return (
    <div>
      <h2>Edit ProjectRevision bundle</h2>
      <Form
        onFinish={async (values) => {
          const projectId = values.projectId;
          const rev = await nonAuthCtx.api.getLatestProjectRevisionAsAdmin(
            projectId
          );
          setInitialRev(rev);
        }}
      >
        <Form.Item name="projectId" label="Project ID">
          <Input placeholder="Project ID" />
        </Form.Item>
      </Form>
      <Form>
        {initialRev && (
          <>
            <Form.Item label="Current revision">
              <Input readOnly value={initialRev.revision} />
            </Form.Item>
            <React.Suspense fallback={<Spinner />}>
              <div style={{ height: 500 }}>
                <LazyFullCodeEditor
                  language="json"
                  ref={editorRef}
                  defaultValue={
                    initialRev.data
                      ? JSON.stringify(
                          JSON.parse(initialRev.data),
                          undefined,
                          2
                        )
                      : ""
                  }
                />
              </div>
            </React.Suspense>
            <Form.Item>
              <Button
                onClick={async () => {
                  const data = editorRef.current?.getValue();
                  if (data && JSON.parse(data)) {
                    const res =
                      await nonAuthCtx.api.saveProjectRevisionDataAsAdmin(
                        initialRev.projectId,
                        initialRev.revision,
                        data
                      );
                    notification.success({
                      message: `Project saved as revision ${res.revision}`,
                    });
                  }
                }}
              >
                Save
              </Button>
            </Form.Item>
          </>
        )}
      </Form>
    </div>
  );
}

function EditPkgVersionBundle() {
  const nonAuthCtx = useNonAuthCtx();
  const [pkgVersion, setPkgVersion] = React.useState<
    PkgVersionInfo | undefined
  >(undefined);
  const editorRef = React.useRef<FullCodeEditor>(null);
  return (
    <div>
      <h2>Edit PkgVersion bundle</h2>
      <p>Look up either by Pkg ID or PkgVersion ID</p>
      <Form
        onFinish={async (values) => {
          const res = await nonAuthCtx.api.getPkgVersionAsAdmin({
            pkgId: values.pkgId,
            version:
              values.version?.trim()?.length > 0
                ? values.version.trim()
                : undefined,
            pkgVersionId:
              values.pkgVersionId?.trim()?.length > 0
                ? values.pkgVersionId.trim()
                : undefined,
          });
          setPkgVersion(res);
        }}
      >
        <Form.Item name="pkgId" label="Pkg ID">
          <Input placeholder="Pkg ID" />
        </Form.Item>
        <Form.Item name="version" label="Pkg version string (empty for latest)">
          <Input placeholder="Pkg version string" />
        </Form.Item>
        <Form.Item name="pkgVersionId" label="PkgVersion ID">
          <Input placeholder="PkgVersion ID" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Lookup
          </Button>
        </Form.Item>
      </Form>
      <Form>
        {pkgVersion && (
          <>
            <p>
              <code>PkgVersion ID {pkgVersion.id}</code>
            </p>
            <p>
              <code>Version {pkgVersion.version}</code>
            </p>
            <React.Suspense fallback={<Spinner />}>
              <div style={{ height: 500 }}>
                <LazyFullCodeEditor
                  language="json"
                  ref={editorRef}
                  defaultValue={
                    pkgVersion.model
                      ? JSON.stringify(pkgVersion.model, undefined, 2)
                      : ""
                  }
                />
              </div>
            </React.Suspense>
            <Form.Item>
              <Button
                onClick={async () => {
                  const data = editorRef.current?.getValue();
                  if (data && JSON.parse(data)) {
                    const res = await nonAuthCtx.api.savePkgVersionAsAdmin({
                      pkgVersionId: pkgVersion.id,
                      data,
                    });
                    notification.success({
                      message: `PkgVersion saved`,
                    });
                  }
                }}
              >
                Save
              </Button>
            </Form.Item>
          </>
        )}
      </Form>
    </div>
  );
}

interface AdminActions {
  onRefresh: () => void;
}

const AdminContext = createContext<AdminActions | undefined>(undefined);
const useAdminContext = () =>
  ensure(useContext(AdminContext), () => "AdminContext must be used");

export default function AdminPage({ nonAuthCtx }: { nonAuthCtx: NonAuthCtx }) {
  const [key, setKey] = useState(0);
  const adminCtx: AdminActions = {
    onRefresh: () => setKey(key + 1),
  };
  return (
    <NonAuthCtxContext.Provider value={nonAuthCtx}>
      <AdminContext.Provider value={adminCtx}>
        <Tabs
          items={[
            {
              key: "users",
              label: "Users",
              children: (
                <div className="flex-col gap-xxxlg">
                  <UsersView />
                  <UserProjects />
                  <ChangePasswordView />
                  <UserTeams />
                  <DeactivateUserView />
                </div>
              ),
            },
            {
              key: "projects",
              label: "Projects",
              children: (
                <div className="flex-col gap-xxxlg">
                  <DownloadProjectView />
                  <DownloadProjectViewAndBranches />
                  <UploadProject />
                  <ChangeProjectOwner />
                  <RevertProjectRev />
                  <DownloadAppMeta />
                  <EditProjectRevBundle />
                  <EditPkgVersionBundle />
                  <PublicProjectsView />
                  <CloneProjectView />
                </div>
              ),
            },
            {
              key: "devflags",
              label: "Devflags",
              children: (
                <div className="flex-col gap-xxxlg">
                  <DevFlagControls />
                </div>
              ),
            },
            {
              key: "pricing",
              label: "Pricing",
              children: (
                <div className="flex-col gap-xxxlg">
                  <FeatureTierControls />
                  <TeamTierControls />
                  <PromotionCode />
                </div>
              ),
            },
            {
              key: "teams",
              label: "Teams",
              children: (
                <div className="flex-col gap-xxxlg">
                  <ConfigureSso />
                  <WhiteLabeledTeam />
                </div>
              ),
            },
            {
              key: "dev",
              label: "Development",
              children: (
                <div className="flex-col gap-xxxlg">
                  <CreateTutorialDb />
                  <ResetTutorialDb />
                  <TourCypressTest />
                  <DownloadPlumePkg />
                  <ImportProjectsFromProd />
                  <CopilotFeedbackView />
                  <AppAuthMetrics />
                </div>
              ),
            },
          ]}
        />
      </AdminContext.Provider>
    </NonAuthCtxContext.Provider>
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
