import { AppCtx } from "@/wab/client/app-ctx";
import { U } from "@/wab/client/cli-routes";
import { ConnectOAuthButton } from "@/wab/client/components/auth/ConnectOAuth";
import styles from "@/wab/client/components/auth/ConnectOAuth.module.scss";
import { reactPrompt } from "@/wab/client/components/quick-modals";
import { SectionSeparator } from "@/wab/client/components/sidebar/sidebar-helpers";
import { ListBox, ListBoxItem } from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import Select from "@/wab/client/components/widgets/Select";
import { Textbox } from "@/wab/client/components/widgets/Textbox";
import { useApi } from "@/wab/client/contexts/AppContexts";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { ensure, notNil } from "@/wab/common";
import GLogo from "@/wab/commons/images/g-logo.png";
import { RequiredSubKeys } from "@/wab/commons/types";
import {
  ApiDataSource,
  ApiUpdateDataSourceRequest,
  CmsDatabaseId,
  ListAuthIntegrationsResponse,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import {
  DataSourceType,
  getAllPublicDataSourceMetas,
  getDataSourceMeta,
} from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  coerceArgValueToString,
  DataSourceMeta,
  EnumArgMeta,
  SettingFieldMeta,
} from "@/wab/shared/data-sources-meta/data-sources";
import { POSTGRES_META } from "@/wab/shared/data-sources-meta/postgres-meta";
import { DATA_SOURCE_CAP, DATA_SOURCE_LOWER } from "@/wab/shared/Labels";
import { Alert, Form, FormInstance, Input, notification } from "antd";
import jsonrepair from "jsonrepair";
import { isEqual, noop } from "lodash";
import { parse } from "pg-connection-string";
import React from "react";
import { Modal } from "src/wab/client/components/widgets/Modal";
import useSWR, { useSWRConfig } from "swr";

export interface DataSourceModalProps {
  workspaceId: WorkspaceId;
  appCtx: AppCtx;
  editingDataSource: "new" | ApiDataSource;
  onUpdate: (dataSource: ApiDataSource) => Promise<any>;
  onDone: () => void;
  dataSourceType?: DataSourceType;
  readOpsOnly?: boolean;
}

const INTEGRATION_KEY = "/api/v1/auth/integrations";
const BASES_KEY = "/api/v1/data-source/bases/";
const CMS_DATABASES_KEY = "api/v1/cmse/databases?workspaceId=";

interface DataSourceAlias {
  id: string;
  label: string;
  aliasFor: DataSourceMeta;
  message: React.ReactNode;
}

function isDataSourceAlias(x: unknown): x is DataSourceAlias {
  return typeof x === "object" && x !== null && "aliasFor" in x;
}

const DATA_SOURCE_ALIASES: DataSourceAlias[] = [
  {
    id: "supabase",
    label: "Supabase",
    aliasFor: POSTGRES_META,
    message: (
      <>
        <p>
          To connect to your Supabase database, Plasmic makes a{" "}
          <a
            href="https://supabase.com/docs/guides/database/connecting-to-postgres#direct-connections"
            target="_blank"
          >
            direct connection
          </a>{" "}
          to the underlying Postgres database.
        </p>
        <p>
          See{" "}
          <a href="https://docs.plasmic.app/learn/supabase" target="_blank">
            our Supabase docs
          </a>{" "}
          for more details.
        </p>
      </>
    ),
  },
];

type DataSourceFormData = RequiredSubKeys<
  ApiUpdateDataSourceRequest,
  "name" | "credentials" | "settings" | "source"
>;

function isUntestableDataSourceType(type: DataSourceType | undefined) {
  if (!type) {
    return true;
  }
  return ["http"].includes(type);
}

export function DataSourceModal({
  workspaceId,
  appCtx,
  editingDataSource,
  onDone,
  onUpdate,
  dataSourceType,
  readOpsOnly,
}: DataSourceModalProps) {
  const api = useApi();
  const [form] = Form.useForm<DataSourceFormData>();
  const dataSourceMetasOrAliases = React.useMemo(() => {
    const list: (DataSourceMeta | DataSourceAlias)[] =
      getAllPublicDataSourceMetas();
    DATA_SOURCE_ALIASES.forEach((alias) => {
      if (!list.find((meta) => meta.id === alias.id)) {
        list.push(alias);
      }
    });
    list.sort((a, b) => a.label.localeCompare(b.label));
    return list;
  }, []);
  const [selectedDataSourceType, setSelectedDataSourceType] = React.useState(
    editingDataSource !== "new" ? editingDataSource.source : dataSourceType
  );
  const [showAliasMessage, setShowAliasMessage] =
    React.useState<React.ReactNode>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [successfulConnections, setSuccessfulConnections] = React.useState<
    Record<string, boolean>
  >({});
  const sourceMeta = selectedDataSourceType
    ? getDataSourceMeta(selectedDataSourceType)
    : undefined;
  const isDisabled =
    editingDataSource !== "new" &&
    editingDataSource.ownerId !== undefined &&
    appCtx.selfInfo?.id !== editingDataSource.ownerId;

  const hasOauthIntegration =
    sourceMeta !== undefined &&
    Object.values(sourceMeta.credentials).some((x) => x.type === "oauth2");

  const { data: integrationList } = useSWR(
    () => (hasOauthIntegration ? INTEGRATION_KEY : undefined),
    async () => {
      return await api.listAuthIntegrations();
    }
  );

  const isValidValuesData = React.useCallback(
    (values: DataSourceFormData) => {
      return (
        values.name &&
        values.source &&
        sourceMeta &&
        (editingDataSource !== "new" ||
          Object.entries(sourceMeta.credentials).every(
            ([key, fieldMeta]) =>
              !fieldMeta.required || !!values.credentials[key]
          )) &&
        Object.entries(sourceMeta.settings).every(
          ([key, fieldMeta]) => !fieldMeta.required || !!values.settings[key]
        )
      );
    },
    [sourceMeta, editingDataSource]
  );

  const testDataSourceConnection = React.useCallback(
    async (dsWorkspaceId: WorkspaceId) => {
      try {
        const values = form.getFieldsValue();

        if (!isValidValuesData(values)) {
          notification.error({
            message: "Missing required data",
          });
          return { result: { connected: false } };
        }

        const params = {
          workspaceId: dsWorkspaceId,
          ...values,
        };

        const key = JSON.stringify(params);

        if (
          isUntestableDataSourceType(selectedDataSourceType) ||
          editingDataSource !== "new"
        ) {
          return { result: { connected: true } };
        }

        // Don't test the same successful connection twice
        if (successfulConnections[key]) {
          notification.success({
            message: "Connection successful",
          });
          return { result: { connected: true } };
        }

        const connectionTest = await appCtx.api.testDataSource(params);

        if (!connectionTest.result.connected) {
          if (connectionTest.result.error?.includes("SSL")) {
            const connectionOptions = JSON.parse(
              values.settings.connectionOptions ?? "{}"
            );
            if (
              connectionOptions.ssl === true &&
              connectionOptions.sslmode === "require"
            ) {
              notification.error({
                message: "Connection failed",
                description:
                  "SSL is required for this connection. Please enable SSL in connection options and try again.",
              });
            } else {
              form.setFieldsValue({
                settings: {
                  connectionOptions: JSON.stringify({
                    ...connectionOptions,
                    ssl: true,
                    sslmode: "require",
                  }),
                },
              });
              notification.warn({
                message: "Connection failed",
                description:
                  "SSL is not enabled for this connection. Add ssl:true and sslmode:require to connection options and try again.",
              });
            }
          } else {
            notification.error({
              message: "Connection failed",
              description: connectionTest.result.error,
            });
          }
        } else {
          notification.success({
            message: "Connection successful",
          });
          setSuccessfulConnections((prev) => ({
            ...prev,
            [key]: true,
          }));
        }

        return connectionTest;
      } catch (err) {
        notification.error({
          message: "Connection failed",
          description: err.message,
        });
        return { result: { connected: false } };
      }
    },
    [form, appCtx, successfulConnections, isValidValuesData]
  );

  return (
    <Modal
      key={editingDataSource === "new" ? "new" : editingDataSource.id}
      visible
      onCancel={() => onDone()}
      title={
        editingDataSource === "new"
          ? `New ${DATA_SOURCE_LOWER}`
          : `${DATA_SOURCE_CAP} settings`
      }
      footer={null}
      closable={false}
      wrapClassName="prompt-modal"
    >
      {isDisabled && (
        <Alert
          className="mb-lg"
          type="info"
          showIcon={true}
          message={<div>Only the owner of the integration can edit it</div>}
        />
      )}

      <Form
        form={form}
        autoComplete="off"
        initialValues={
          editingDataSource !== "new" ? editingDataSource : undefined
        }
        labelCol={{
          xs: { span: 24 },
          sm: { span: 8 },
        }}
        wrapperCol={{
          xs: { span: 24 },
          sm: { span: 16 },
        }}
        onFinish={async (values) => {
          console.log("SUBMITTING", values);
          if (isValidValuesData(values)) {
            setIsLoading(true);
            let dataSource: ApiDataSource;

            const connectionTest = await testDataSourceConnection(
              editingDataSource !== "new"
                ? editingDataSource.workspaceId
                : workspaceId
            );

            if (!connectionTest.result.connected) {
              setIsLoading(false);
              return;
            }

            try {
              if (editingDataSource === "new") {
                dataSource = await appCtx.api.createDataSource({
                  workspaceId,
                  ...values,
                });
              } else {
                dataSource = await appCtx.api.updateDataSource(
                  editingDataSource.id,
                  {
                    ...values,
                  }
                );
              }
              await onUpdate(dataSource);
              setIsLoading(false);
              onDone();
            } catch (err) {
              setIsLoading(false);
              notification.error({
                message: `Error while ${
                  editingDataSource === "new" ? "creating" : "updating"
                } ${DATA_SOURCE_LOWER}`,
                description: err.message,
              });
            }
          } else {
            notification.error({
              message: "Missing required data",
            });
          }
        }}
      >
        <Form.Item name="source" label="Source" key="source" required>
          <Select
            type="bordered"
            {...(dataSourceType || editingDataSource !== "new"
              ? { isReadOnly: true, value: dataSourceType, isDisabled: true }
              : {})}
            onChange={(id) => {
              const metaOrAlias = dataSourceMetasOrAliases.find(
                (item) => item.id === id
              );
              if (!metaOrAlias) {
                return;
              }

              if (isDataSourceAlias(metaOrAlias)) {
                form.setFieldValue("source", metaOrAlias.aliasFor.id);
                setSelectedDataSourceType(
                  metaOrAlias.aliasFor.id as DataSourceType
                );
                setShowAliasMessage(metaOrAlias.message);
              } else {
                setSelectedDataSourceType(metaOrAlias.id as DataSourceType);
                setShowAliasMessage(null);
              }
            }}
            isDisabled={isDisabled}
            aria-label="Source"
            data-test-id={"data-source-picker"}
          >
            {dataSourceMetasOrAliases
              .filter((s) => {
                return (
                  !readOpsOnly ||
                  getDataSourceMeta(s.id).ops.some((op) => op.type === "read")
                );
              })
              .map((s) => (
                <Select.Option key={s.id} value={s.id}>
                  {s.label}
                </Select.Option>
              ))}
          </Select>
        </Form.Item>
        {selectedDataSourceType && (
          <Form.Item
            name="name"
            label="Name"
            key="name"
            initialValue={
              editingDataSource !== "new" ? editingDataSource.name : undefined
            }
            required
          >
            <Textbox
              placeholder="Name this integration"
              styleType={["bordered"]}
              autoFocus
              aria-label="Name"
              autoComplete="off"
              disabled={isDisabled}
              data-test-id={`data-source-name`}
            />
          </Form.Item>
        )}
        {showAliasMessage && (
          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Alert message={showAliasMessage} type="info" />
          </Form.Item>
        )}
        {selectedDataSourceType === "airtable" && (
          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Alert
              message={
                <>
                  Airtable is <strong>not recommended</strong> due to its low
                  rate limits and slow performance. It is sufficient for
                  prototypes, but not for production. Consider migrating the
                  data to a database like Postgres.
                </>
              }
              type="warning"
            />
          </Form.Item>
        )}
        {sourceMeta && <SectionSeparator className="mb-xlg" />}
        {sourceMeta && sourceMeta.id === "postgres" && (
          <PostgresConnectionStringImportButton
            form={form}
            sourceMeta={sourceMeta}
            isDisabled={isDisabled}
          />
        )}
        {sourceMeta && (!hasOauthIntegration || notNil(integrationList)) && (
          <>
            <CredentialsAndSettingsSection
              form={form}
              sourceMeta={sourceMeta}
              workspaceId={workspaceId}
              integrationList={integrationList}
              editingDataSource={editingDataSource}
              isDisabled={isDisabled}
            />
          </>
        )}
        <Form.Item
          wrapperCol={{
            xs: {
              span: 24,
              offset: 0,
            },
            sm: {
              span: 16,
              offset: 8,
            },
          }}
        >
          <Button
            className="mr-sm"
            type="primary"
            htmlType="submit"
            data-test-id="prompt-submit"
            disabled={!selectedDataSourceType || isDisabled || isLoading}
          >
            {"Confirm"}
          </Button>
          <Button
            className="mr-sm"
            onClick={() => onDone()}
            disabled={isLoading || isTestingConnection}
          >
            Cancel
          </Button>
          {isUntestableDataSourceType(selectedDataSourceType) ? null : (
            <Button
              className="mr-sm"
              type="secondary"
              disabled={!selectedDataSourceType || isTestingConnection}
              onClick={async () => {
                setIsTestingConnection(true);
                await testDataSourceConnection(workspaceId);
                setIsTestingConnection(false);
              }}
              data-test-id="test-connection"
            >
              {isTestingConnection ? "Testing ..." : "Test connection"}
            </Button>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}

function CredentialsAndSettingsSection(props: {
  form: FormInstance<DataSourceFormData>;
  sourceMeta: DataSourceMeta;
  workspaceId: WorkspaceId;
  editingDataSource: "new" | ApiDataSource;
  integrationList?: ListAuthIntegrationsResponse;
  isDisabled?: boolean;
}) {
  const {
    form,
    sourceMeta,
    workspaceId,
    integrationList,
    editingDataSource,
    isDisabled,
  } = props;
  const { mutate } = useSWRConfig();
  const api = useApi();

  const trySaveJson = (val: string) => {
    const strSizeLimit = 500 * 1024; // 500KB
    if (val.length > strSizeLimit) {
      notification.error({
        message: "Value is too long",
        description: "Please provide a value up to 500KB characters long",
      });
      return;
    }

    try {
      val = jsonrepair(val);
    } catch {}

    if (val[0] !== "{") {
      notification.warn({
        message: "Invalid JSON object",
        description: "Only JSON objects (wrapped in {}) are supported.",
      });
      return;
    }

    try {
      const jsonObj = JSON.parse(val);
      form.setFieldsValue({
        credentials: { credentials: jsonObj },
      });
    } catch (err) {
      notification.warn({
        message: "Invalid JSON",
        description: `${err}`,
      });
    }
  };

  const renderFormItem = (
    key: string,
    settingMeta: SettingFieldMeta,
    type: "credentials" | "settings"
  ) => {
    return (
      <Form.Item
        name={[type, key]}
        label={settingMeta.label ?? key}
        key={key}
        required={settingMeta.required && editingDataSource === "new"}
        extra={settingMeta.description}
        initialValue={
          settingMeta.type === "oauth2"
            ? integrationList?.providers.find((p) => p.name === sourceMeta.id)
                ?.id
            : settingMeta.default
            ? coerceArgValueToString(settingMeta.default, settingMeta)
            : undefined
        }
        hidden={settingMeta.hidden}
      >
        {settingMeta.type === "oauth2" ? (
          <DataSourcesSignInFormButton
            provider={sourceMeta.id}
            onSuccess={async () => {
              const data = (await mutate(
                INTEGRATION_KEY
              )) as ListAuthIntegrationsResponse;
              const integration = data.providers.find(
                (p) => p.name === sourceMeta.id
              );
              const { credentials } = form.getFieldsValue();
              credentials[key] = integration?.id;
              form.setFieldsValue({ credentials });
            }}
            onFailure={(reason) => {
              console.log("OAuth failed", reason);
            }}
            onStart={noop}
            disabled={isDisabled}
          >
            {integrationList?.providers.find(
              (provider) => provider.name === sourceMeta.id
            )
              ? "Edit integration"
              : undefined}
          </DataSourcesSignInFormButton>
        ) : settingMeta.type === "base" ? (
          <DataSourceBaseFormSelect
            sourceMeta={sourceMeta}
            settingMeta={settingMeta}
            disabled={isDisabled}
          />
        ) : settingMeta.type === "plasmic-cms-id" ? (
          <PlasmicCmsSelect
            workspaceId={workspaceId}
            defaultValue={
              editingDataSource !== "new"
                ? editingDataSource.settings[key]
                : undefined
            }
            onChange={async (cmsId) => {
              const db = ensure(
                await api.getCmsDatabase(cmsId as CmsDatabaseId),
                "Couldn't find CMS database by cmsId"
              );
              const secretToken = db.secretToken;
              form.setFieldsValue({
                credentials: { secretToken: secretToken },
              });
            }}
            disabled={isDisabled}
          />
        ) : settingMeta.type === "dict" ? (
          <StringDictEditor disabled={isDisabled} />
        ) : settingMeta.type === "enum" ? (
          <Select
            type="bordered"
            options={(settingMeta as EnumArgMeta).options}
          />
        ) : key === "password" ? (
          <Input.Password
            placeholder={settingMeta.placeholder ?? settingMeta.label}
            aria-label={settingMeta.label}
            disabled={isDisabled}
          />
        ) : (
          <Textbox
            placeholder={settingMeta.placeholder ?? settingMeta.label}
            styleType={["bordered"]}
            aria-label={settingMeta.label}
            defaultValue={
              settingMeta.default
                ? coerceArgValueToString(settingMeta.default, settingMeta)
                : undefined
            }
            disabled={isDisabled}
            data-test-id={`${key}`}
          />
        )}
      </Form.Item>
    );
  };

  const renderOrder = sourceMeta.fieldOrder
    ? [
        ...sourceMeta.fieldOrder.map((key) => {
          if (key in sourceMeta.credentials) {
            return () =>
              renderFormItem(key, sourceMeta.credentials[key], "credentials");
          }

          return () =>
            renderFormItem(key, sourceMeta.settings[key], "settings");
        }),
      ]
    : [
        ...Object.entries(sourceMeta.credentials).map(
          ([key, settingMeta]) =>
            () =>
              renderFormItem(key, settingMeta, "credentials")
        ),
        ...Object.entries(sourceMeta.settings).map(
          ([key, settingMeta]) =>
            () =>
              renderFormItem(key, settingMeta, "settings")
        ),
      ];

  return <>{renderOrder.map((render) => render())}</>;
}

function DataSourcesSignInFormButton(props: {
  provider: string;
  children?: React.ReactNode;
  value?: string;
  onStart: () => void;
  onSuccess: () => void;
  onFailure: (reason: string) => void;
  disabled?: boolean;
}) {
  const { provider, ...providerProps } = props;
  switch (provider) {
    case "airtable":
      return <AirtableSignInButton {...providerProps} />;
    case "google-sheets":
      return <GoogleSheetsSignInButton {...providerProps} />;
    default:
      return null;
  }
}

function AirtableSignInButton(props: {
  children?: React.ReactNode;
  onStart: () => void;
  onSuccess: () => void;
  onFailure: (reason: string) => void;
  disabled?: boolean;
}) {
  const { onStart, onSuccess, onFailure, children, disabled } = props;
  return (
    <ConnectOAuthButton
      onStart={onStart}
      onSuccess={onSuccess}
      onFailure={onFailure}
      url={U.airtableAuth({})}
      waitingChildren={"Signing into airtable..."}
      disabled={disabled}
    >
      {children ? children : "Connect to Airtable"}
    </ConnectOAuthButton>
  );
}

function GoogleSheetsSignInButton(props: {
  children?: React.ReactNode;
  onStart: () => void;
  onSuccess: () => void;
  onFailure: (reason: string) => void;
  disabled?: boolean;
}) {
  // Must adhere to Google branding guidelines
  const { onStart, onSuccess, onFailure, children, disabled } = props;
  return (
    <ConnectOAuthButton
      onStart={onStart}
      onSuccess={onSuccess}
      onFailure={onFailure}
      url={U.googleSheetsAuth({})}
      waitingChildren={"Connect to Google"}
      disabled={disabled}
      style={{
        background: "white",
        border: "1px solid #eee",
        borderBottom: "1px solid #ccc",
      }}
      icon={<img alt={"Google"} className={styles.Icon} src={GLogo} />}
    >
      Connect to Google
    </ConnectOAuthButton>
  );
}

function DataSourceBaseFormSelect(props: {
  sourceMeta: DataSourceMeta;
  settingMeta: SettingFieldMeta;
  onChange?: () => void;
  value?: string;
  disabled?: boolean;
}) {
  const { sourceMeta, settingMeta, disabled, ...selectProps } = props;
  const api = useApi();
  const { data: basesList } = useSWR(BASES_KEY + sourceMeta.id, async () => {
    return await api.listDataSourceBases(sourceMeta!.id);
  });
  return (
    <Select
      isDisabled={!basesList || disabled}
      type="bordered"
      aria-label={settingMeta.label}
      placeholder="Base"
      {...selectProps}
    >
      {basesList?.bases.map((s) => (
        <Select.Option key={s.value} value={s.value}>
          {s.label}
        </Select.Option>
      ))}
    </Select>
  );
}

function PlasmicCmsSelect(props: {
  workspaceId: WorkspaceId;
  defaultValue?: string;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  const { workspaceId, defaultValue, onChange, disabled } = props;
  const api = useApi();
  const { data: cmsDatabases } = useSWR(
    CMS_DATABASES_KEY + workspaceId,
    async () => {
      return await api.listCmsDatabasesForWorkspace(workspaceId);
    }
  );

  return (
    <Select
      onChange={onChange}
      defaultValue={defaultValue}
      isDisabled={disabled}
    >
      {cmsDatabases?.map((database) => {
        return (
          <Select.Option key={database.id} value={database.id}>
            {database.name}
          </Select.Option>
        );
      })}
    </Select>
  );
}

function PostgresConnectionStringImportButton(props: {
  form: FormInstance<ApiUpdateDataSourceRequest>;
  sourceMeta: DataSourceMeta;
  isDisabled?: boolean;
}) {
  const { form, sourceMeta, isDisabled } = props;
  return (
    <div className="mb-xlg flex justify-end">
      <Button
        type="link"
        disabled={isDisabled}
        onClick={async () => {
          const connectionString = await reactPrompt({
            message: "What's the connection string?",
            actionText: "Import",
            placeholder: "Connection string",
          });
          if (!connectionString) {
            return;
          }
          const connectionOptions = parse(connectionString);

          form.setFieldsValue({
            credentials: {
              password: connectionOptions.password,
            },
            settings: {
              host: connectionOptions.host,
              port: connectionOptions.port ?? sourceMeta.settings.port?.default,
              name: connectionOptions.database,
              user: connectionOptions.user,
              connectionOptions: JSON.stringify(
                Object.entries(connectionOptions)
                  .filter(
                    ([key, _]) =>
                      !(
                        key in sourceMeta.credentials ||
                        key in sourceMeta.settings ||
                        ["database"].includes(key)
                      )
                  )
                  .reduce((acum, [key, value]) => {
                    const stringValue = JSON.stringify(value);
                    if (stringValue !== "") {
                      acum[key] = stringValue;
                    }
                    return acum;
                  }, {})
              ),
            },
          });
        }}
        data-test-id={`postgres-connection-string`}
      >
        Import from connection string
      </Button>
    </div>
  );
}

function StringDictEditor(props: {
  value?: string | Record<string, string>;
  defaultValue?: string | Record<string, string>;
  onChange?: (v: string | null) => void;
  disabled?: boolean;
}) {
  const { value, defaultValue, onChange, disabled } = props;
  const parseValue = (v: any) => {
    return Object.entries(typeof v === "string" ? JSON.parse(v) : v).map(
      ([key, val]) => ({
        key,
        value: typeof val === "object" ? JSON.stringify(val) : (val as string),
      })
    );
  };
  const [currentValues, setCurrentValues] = React.useState<
    { key: string; value: string }[]
  >(
    value !== undefined
      ? parseValue(value)
      : defaultValue !== undefined
      ? parseValue(defaultValue)
      : []
  );

  React.useEffect(() => {
    if (!value) {
      return;
    }
    const currentVal = parseValue(value);
    if (!isEqual(currentVal, currentValues)) {
      setCurrentValues(currentVal);
    }
  }, [value]);

  const handleChange = (idx: number, newVal: { key: string; value: any }) => {
    const newCurrentValues = [...currentValues];
    newCurrentValues[idx] = newVal;
    const newObject = currentValues.reduce((acc, cur, curIdx) => {
      const [curKey, curValue] =
        curIdx === idx ? [newVal.key, newVal.value] : [cur.key, cur.value];
      if (curKey) {
        acc[curKey] = curValue;
      }
      return acc;
    }, {}) as Record<string, any>;

    setCurrentValues(newCurrentValues);
    onChange?.(JSON.stringify(newObject));
  };

  return (
    <ListBox
      appendPrepend="append"
      addNode={
        <div style={{ color: "blue" }}>
          <PlusIcon /> Add new
        </div>
      }
      onAdd={() => {
        setCurrentValues([...currentValues, { key: "", value: "" }]);
      }}
      disabled={disabled}
    >
      {currentValues.map(({ key, value: val }, idx) => {
        return (
          <ListBoxItem
            mainContent={
              <div className="flex gap-sm">
                <Input
                  style={{ maxWidth: "40%" }}
                  value={key}
                  onChange={(ev) => {
                    const newVal = ev.target.value;
                    handleChange(idx, { key: newVal, value: val });
                  }}
                  placeholder="Name"
                  disabled={disabled}
                />
                <Input
                  value={val}
                  onChange={(ev) => {
                    const newVal = ev.target.value;
                    handleChange(idx, { key: key, value: newVal });
                  }}
                  placeholder="Value"
                  disabled={disabled}
                />
              </div>
            }
            disabled={disabled}
            index={idx}
            onRemove={() => {
              handleChange(idx, { key: key, value: undefined });
              setCurrentValues(currentValues.filter((_, i) => i != idx));
            }}
            showGrip={false}
          />
        );
      })}
    </ListBox>
  );
}
