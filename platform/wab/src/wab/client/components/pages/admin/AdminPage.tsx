import {
  loadAppCtx,
  NonAuthCtx,
  NonAuthCtxContext,
  useNonAuthCtx,
} from "@/wab/client/app-ctx";
import { U, UU } from "@/wab/client/cli-routes";
import type FullCodeEditor from "@/wab/client/components/coding/FullCodeEditor";
import { smartRender } from "@/wab/client/components/pages/admin/admin-util";
import { AdminBranchingInspector } from "@/wab/client/components/pages/admin/AdminBranchingInspector";
import {
  AdminCtxProvider,
  useAdminCtx,
} from "@/wab/client/components/pages/admin/AdminCtx";
import { AdminImportProjectsFromProd } from "@/wab/client/components/pages/admin/AdminImportProjectsFromProd";
import { AdminTeamsView } from "@/wab/client/components/pages/admin/AdminTeamsView";
import { AdminUsersView } from "@/wab/client/components/pages/admin/AdminUsersView";
import {
  LinkButton,
  SearchBox,
  Spinner,
} from "@/wab/client/components/widgets";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { downloadBlob, getUploadedFile } from "@/wab/client/dom-utils";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import CheckIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Check";
import CircleCloseIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__CircleClose";
import { stepsToCypress } from "@/wab/client/tours/tutorials/tutorials-helpers";
import { STUDIO_ONBOARDING_TUTORIALS } from "@/wab/client/tours/tutorials/tutorials-meta";
import { ApiFeatureTier, ApiProjectRevision } from "@/wab/shared/ApiSchema";
import { assert, tryRemove } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { PkgVersionInfo } from "@/wab/shared/SharedApi";
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  notification,
  Table,
  TablePaginationConfig,
  Tabs,
} from "antd";
import TextArea from "antd/lib/input/TextArea";
import L from "lodash";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr/immutable";

export default function AdminPage({ nonAuthCtx }: { nonAuthCtx: NonAuthCtx }) {
  return (
    <NonAuthCtxContext.Provider value={nonAuthCtx}>
      <AdminCtxProvider>
        <AdminPageTabs />
      </AdminCtxProvider>
    </NonAuthCtxContext.Provider>
  );
}

function AdminPageTabs() {
  const { tab, navigate } = useAdminCtx();
  return (
    <Tabs
      activeKey={tab}
      onChange={(newTab) => navigate({ tab: newTab })}
      items={[
        {
          key: "users",
          label: "Users",
          children: (
            <div className="flex-col gap-xxxlg">
              <AdminUsersView />
            </div>
          ),
        },
        {
          key: "teams",
          label: "Teams",
          children: (
            <div className="flex-col gap-xxxlg">
              <AdminTeamsView />
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
              <PromotionCode />
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
              <DownloadPkgForPkgMgr />
              <DownloadPlumePkg />
              <AdminImportProjectsFromProd />
              <CopilotFeedbackView />
              <AppAuthMetrics />
            </div>
          ),
        },
        {
          key: "branching-inspect",
          label: "Branching inspector",
          children: (
            <div className="flex-col gap-xxxlg">
              <AdminBranchingInspector />
            </div>
          ),
        },
      ]}
    />
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

function downloadForPkgMgr(
  pkg: PkgVersionInfo,
  depPkgs: PkgVersionInfo[] | undefined,
  fileName: string
) {
  const blob = new Blob(
    [
      JSON.stringify(
        [...(depPkgs || []), pkg].map((pkgVersion) => [
          pkgVersion.id,
          pkgVersion.model,
        ])
      ),
    ],
    {
      type: "text/plain;charset=utf-8",
    }
  );
  downloadBlob(blob, `${fileName}-master-pkg.json`);
}

function DownloadPlumePkg() {
  const nonAuthCtx = useNonAuthCtx();
  const download = async (type: "latest" | "current") => {
    const appCtx = await loadAppCtx(nonAuthCtx);
    const { pkg } = await (type === "current"
      ? appCtx.api.getPlumePkg()
      : appCtx.api.getLatestPlumePkg());
    downloadForPkgMgr(pkg, undefined, "plume");
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

function DownloadPkgForPkgMgr() {
  const nonAuthCtx = useNonAuthCtx();
  const [projectId, setProjectId] = useState("");
  const download = async () => {
    const appCtx = await loadAppCtx(nonAuthCtx);
    const { depPkgs, pkg } = await appCtx.api.getPkgVersionByProjectId(
      projectId,
      "latest"
    );

    downloadForPkgMgr(
      pkg,
      depPkgs,
      pkg.model.map[pkg.model.root].name
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
    );
  };
  return (
    <div>
      <h2>Download pkg as json for pkg-mgr</h2>
      <Form>
        <Form.Item name="projectId" label="Project ID">
          <Input
            type={"input"}
            value={projectId}
            placeholder="Project Id"
            onChange={(e) => setProjectId(e.target.value)}
          />
        </Form.Item>
        <Button onClick={() => download()}>Download latest version</Button>
      </Form>
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
  const { listFeatureTiers } = useAdminCtx();

  // Viewing table
  const [query, setQuery] = useState<string | undefined>("");
  // New tier submission form
  const [newTierData, setNewTierData] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Get tiers
  const tiers = listFeatureTiers.value ?? [];
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
      listFeatureTiers.retry();
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
        onRow={(record) => {
          return {
            onClick: (_e) => setNewTierData(JSON.stringify(record, null, 4)),
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
          assert(id && typeof id === "string", "Promo code requires an id");
          assert(
            message && typeof message === "string",
            "Promo code requires a message"
          );
          assert(
            !Number.isNaN(trialDays) && trialDays > 0,
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
                    await nonAuthCtx.api.savePkgVersionAsAdmin({
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
