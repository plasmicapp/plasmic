import { useRRouteMatch } from "@/wab/client/cli-routes";
import { PublicLink } from "@/wab/client/components/PublicLink";
import {
  UniqueFieldStatus,
  getRowIdentifierText,
} from "@/wab/client/components/cms/CmsEntryDetails";
import {
  useCmsRows,
  useCmsTableMaybe,
} from "@/wab/client/components/cms/cms-contexts";
import { isCmsTextLike } from "@/wab/client/components/cms/utils";
import Combobox from "@/wab/client/components/plexus/Combobox";
import MenuItem from "@/wab/client/components/plexus/MenuItem";
import { FileUploader, Spinner } from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import "@/wab/client/components/widgets/ColorPicker/Pickr.overrides.scss";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import Select from "@/wab/client/components/widgets/Select";
import { Switch, SwitchProps } from "@/wab/client/components/widgets/Switch";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import Trash2Icon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Trash2";
import ArrowDownSvg from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ArrowDownSvg";
import ArrowUpSvg from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ArrowUpSvg";
import {
  ApiCmsDatabase,
  CmsDatabaseId,
  CmsFieldMeta,
  CmsMetaType,
  CmsTypeMeta,
  CmsTypeName,
  CmsTypeObject,
  CmsUploadedFile,
} from "@/wab/shared/ApiSchema";
import { assert, ensure, ensureType } from "@/wab/shared/common";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { naturalSort } from "@/wab/shared/sort";
import { PlasmicImg } from "@plasmicapp/react-web";
import Pickr from "@simonwep/pickr";
import "@simonwep/pickr/dist/themes/nano.min.css";
import {
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  notification,
} from "antd";
import { FormItemProps } from "antd/lib/form";
import TextArea from "antd/lib/input/TextArea";
import { upperFirst } from "lodash";
import moment from "moment";
import * as React from "react";
import { ReactElement, ReactNode, createContext, useContext } from "react";
import { useHover } from "react-aria";
import { GrNewWindow } from "react-icons/all";
import { useHistory } from "react-router";
const LazyRichTextEditor = React.lazy(
  () => import("@/wab/client/components/RichTextEditor")
);

type NamePathz = (string | number)[];

interface ContentEntryFormContextValue {
  disabled: boolean;
  typeMeta: CmsTypeMeta;
  database: ApiCmsDatabase;
  name: NamePathz;
  directlyInsideList?: boolean;
}

export const ContentEntryFormContext = createContext<
  undefined | ContentEntryFormContextValue
>(undefined);

export function useContentEntryFormContext(): ContentEntryFormContextValue {
  return ensure(
    useContext(ContentEntryFormContext),
    "ContentEntryFormContext is unset"
  );
}

export function ValueSwitch(
  props: SwitchProps & { disabled?: boolean; value?: boolean }
) {
  return (
    <Switch {...props} isDisabled={props.disabled} isChecked={props.value} />
  );
}

// TODO make sure this is in the local timezone
export function StringDateTimePicker(props: any) {
  return (
    <DatePicker
      showTime
      format="YYYY-MM-DDTHH:mm:ss"
      {...props}
      value={props.value ? moment(new Date(props.value)) : undefined}
      onChange={
        props.onChange
          ? (date: moment.Moment | null) => {
              const curDate = date?.toDate();
              curDate?.setMilliseconds(0);
              return props.onChange(curDate?.toISOString());
            }
          : undefined
      }
    />
  );
}

export function CmsRefInput(props: any) {
  const { disabled, typeMeta, database } = useContentEntryFormContext();
  assert(typeMeta.type === CmsMetaType.REF, "");
  const maybeTable = useCmsTableMaybe(database.id, typeMeta.tableId);
  const table = maybeTable?.table;
  const { rows, error } = useCmsRows(database.id, typeMeta.tableId);
  const isDisabled =
    disabled || !typeMeta.tableId || error || !maybeTable || !maybeTable.table;

  const placeholder =
    !typeMeta.tableId || error || (maybeTable && !maybeTable.table)
      ? "Please configure a model type for this field"
      : undefined;

  // Convert rows to MenuItem components
  const menuItems =
    !typeMeta.tableId || error || !table
      ? null
      : naturalSort(
          (rows ?? []).map((row) => {
            const { identifier, placeholder: rowPlaceholder } =
              getRowIdentifierText(table, row);
            const label = identifier || rowPlaceholder || "Untitled entry";
            return { label, rowId: row.id };
          }),
          (rowData) => rowData.label
        ).map((rowData) => (
          <MenuItem
            key={rowData.rowId}
            value={rowData.rowId}
            label={rowData.label}
          />
        ));

  // Get the display value for the selected row
  const selectedRow =
    table && props.value ? rows?.find((row) => row.id === props.value) : null;
  const inputDisplayValue =
    selectedRow && table
      ? (() => {
          // TypeScript: table is guaranteed to be defined here due to the check above
          const { identifier, placeholder: rowPlaceholder } =
            getRowIdentifierText(table!, selectedRow);
          return identifier || rowPlaceholder || "Untitled entry";
        })()
      : undefined;

  return (
    <Combobox
      value={props.value}
      onChange={props.onChange}
      placeholder={placeholder}
      disabled={isDisabled}
      inputDisplayValue={inputDisplayValue}
      showLabel={false}
      items={menuItems}
    />
  );
}

function CmsListItemHeader({
  index,
  itemCount,
  disabled,
  onMove,
  onRemove,
}: {
  index: number;
  itemCount: number;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}) {
  const hoverRef = React.useRef<HTMLDivElement>(null);
  const { hoverProps, isHovered } = useHover({});

  const moveBy = (delta: number) => {
    onMove(index, index + delta);
  };

  return (
    <div
      ref={hoverRef}
      {...hoverProps}
      className="flex flex-vcenter"
      style={{ maxHeight: "18px" }}
    >
      <div className="flex flex-vcenter" style={{ gap: "8px" }}>
        <EditableLabel
          value={String(index + 1)}
          disabled={disabled}
          onEdit={(newVal) => {
            const targetIndexOneBased = parseInt(newVal);
            if (!isNaN(targetIndexOneBased)) {
              const targetIndex = targetIndexOneBased - 1;
              if (
                targetIndex >= 0 &&
                targetIndex < itemCount &&
                targetIndex !== index
              ) {
                onMove(index, targetIndex);
              }
            }
          }}
          inputBoxFactory={(inputProps) => (
            <input
              {...inputProps}
              autoFocus
              type="number"
              min="1"
              style={{ width: 50 }}
            />
          )}
        >
          {`# ${index + 1}`}
        </EditableLabel>
        {!disabled && isHovered && itemCount >= 2 && (
          <div className="flex flex-col">
            <IconButton
              size="small"
              type="clear"
              onClick={(e) => {
                e.stopPropagation();
                moveBy(-1);
              }}
              disabled={index === 0}
            >
              <Icon icon={ArrowUpSvg} />
            </IconButton>
            <IconButton
              size="small"
              type="clear"
              onClick={(e) => {
                e.stopPropagation();
                moveBy(1);
              }}
              disabled={index === itemCount - 1}
            >
              <Icon icon={ArrowDownSvg} />
            </IconButton>
          </div>
        )}
      </div>
      {!disabled && isHovered && (
        <div className="flex flex-vcenter flush-right">
          <IconButton
            size="small"
            type="clear"
            withRedBackgroundHover
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
          >
            <Icon icon={Trash2Icon} />
          </IconButton>
        </div>
      )}
    </div>
  );
}

export function CmsListInput(props: any) {
  const {
    disabled,
    typeMeta,
    database,
    name: baseName,
  } = useContentEntryFormContext();
  const { label } = ensure(
    useContext(FormNameContext),
    "Must have form name available"
  );
  const form = Form.useFormInstance();
  const [expandedKeys, setExpandedKeys] = React.useState<string[] | string>([]);
  assert(typeMeta.type === CmsMetaType.LIST, "Must be rendering a list");
  return (
    <Form.List name={[...baseName]}>
      {(items, handles) => {
        return (
          <>
            {!disabled && (
              <Form.Item label={label}>
                <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                  <Button
                    withIcons={"startIcon"}
                    startIcon={<Icon icon={PlusIcon} />}
                    onClick={() => {
                      handles.add(ensureType<{}>({}));
                    }}
                  >
                    Add item
                  </Button>
                  {items.length > 1 && (
                    <>
                      <Button
                        onClick={() => {
                          setExpandedKeys(
                            items.map((item) => String(item.key))
                          );
                        }}
                        type="secondary"
                      >
                        Expand all
                      </Button>
                      <Button
                        onClick={() => {
                          setExpandedKeys([]);
                        }}
                        type="secondary"
                      >
                        Collapse all
                      </Button>
                    </>
                  )}
                </div>
                <Collapse
                  activeKey={expandedKeys}
                  onChange={(keys) => setExpandedKeys(keys)}
                >
                  {items.map(({ key, name, ...restField }) => {
                    const subtype: CmsTypeObject = {
                      type: CmsMetaType.OBJECT,
                      fields: typeMeta.fields,
                    };
                    return (
                      <Collapse.Panel
                        key={key}
                        header={
                          <CmsListItemHeader
                            index={name}
                            itemCount={items.length}
                            disabled={disabled}
                            onMove={handles.move}
                            onRemove={handles.remove}
                          />
                        }
                      >
                        <ContentEntryFormContext.Provider
                          value={{
                            disabled,
                            typeMeta: subtype,
                            database,
                            name: [name],
                            directlyInsideList: true,
                          }}
                        >
                          <Form.Item noStyle name={[name]} {...restField}>
                            <CmsObjectInput />
                          </Form.Item>
                        </ContentEntryFormContext.Provider>
                      </Collapse.Panel>
                    );
                  })}
                </Collapse>
              </Form.Item>
            )}
          </>
        );
      }}
    </Form.List>
  );
}

const FormNameContext = createContext<
  { name: NamePathz; label: ReactNode } | undefined
>(undefined);

function MaybeFormItem({
  typeName,
  name,
  label,
  maxChars,
  minChars,
  uniqueStatus,
  ...props
}: Omit<FormItemProps, "name"> & {
  typeName: CmsTypeName;
  name: NamePathz;
  maxChars?: number;
  minChars?: number;
  uniqueStatus?: UniqueFieldStatus;
}) {
  const history = useHistory();
  const match = useRRouteMatch(APP_ROUTES.cmsEntry);
  const commonRules = [
    { required: props.required, message: "Field is required" },
    {
      warningOnly: true,
      validator: () => {
        if (
          uniqueStatus &&
          uniqueStatus.status === "violation" &&
          uniqueStatus.conflictRowId
        ) {
          const conflictingRowRoute = fillRoute(APP_ROUTES.cmsEntry, {
            ...match!.params,
            rowId: uniqueStatus.conflictRowId,
          });
          return Promise.reject(
            <>
              This unique field value conflicts with the published version of{" "}
              <a
                onClick={() => {
                  history.push(conflictingRowRoute);
                }}
              >
                this entry
              </a>
              .
            </>
          );
        }
        return Promise.resolve();
      },
    },
  ];
  const typeSpecificRules =
    [CmsMetaType.TEXT, CmsMetaType.RICH_TEXT].includes(typeName) &&
    (minChars !== undefined || maxChars !== undefined)
      ? [{ max: maxChars }, { min: minChars }]
      : [];

  const rules = [...commonRules, ...typeSpecificRules];

  return typeName === CmsMetaType.LIST ? (
    <FormNameContext.Provider value={{ name, label }}>
      {props.children as any}
    </FormNameContext.Provider>
  ) : (
    <Form.Item name={name} label={label} {...props} rules={rules} />
  );
}

export function CmsObjectInput(props: any) {
  const {
    disabled,
    typeMeta,
    database,
    name,
    directlyInsideList = false,
  } = useContentEntryFormContext();
  assert(typeMeta.type === CmsMetaType.OBJECT, "Must be rendering an object");
  const form = Form.useFormInstance();

  return (
    <div
      style={
        directlyInsideList
          ? {}
          : { padding: "8px 0 8px 8px", borderLeft: "8px solid #eef" }
      }
      className={"vlist-gap-xlg"}
    >
      {typeMeta.fields?.map((field) => (
        <ContentEntryFormContext.Provider
          key={field.identifier}
          value={{
            disabled,
            typeMeta: field,
            database,
            name: [...name, field.identifier],
          }}
        >
          <MaybeFormItem
            typeName={field.type}
            name={[...name, field.identifier]}
            {...deriveFormItemPropsFromField(field)}
          >
            {renderEntryField(field.type)}
          </MaybeFormItem>
        </ContentEntryFormContext.Provider>
      ))}
    </div>
  );
}
export function CmsTextInput(props: any) {
  const { disabled } = useContentEntryFormContext();
  return <Input disabled={disabled} {...props} />;
}
export function CmsLongTextInput(props: any) {
  const { disabled } = useContentEntryFormContext();
  return <TextArea autoSize={{ minRows: 3 }} disabled={disabled} {...props} />;
}

export function CmsNumberInput(props: any) {
  const { disabled } = useContentEntryFormContext();
  return <InputNumber disabled={disabled} {...props} />;
}

export function CmsBooleanInput(props: any) {
  const { disabled } = useContentEntryFormContext();
  return <ValueSwitch disabled={disabled} {...props} />;
}

export function CmsDateTimeInput(props: any) {
  const { disabled } = useContentEntryFormContext();
  return <StringDateTimePicker disabled={disabled} {...props} />;
}

export function CmsImageInput(props: {
  value?: CmsUploadedFile | undefined;
  onChange?: (value: CmsUploadedFile | undefined) => void;
}) {
  const appCtx = useAppCtx();
  const { value, onChange } = props;
  const [isUploading, setUploading] = React.useState(false);
  const { disabled } = useContentEntryFormContext();
  return (
    <div className="flex flex-vcenter" style={{ gap: 32 }}>
      {value && value.imageMeta && (
        <div>
          <PlasmicImg
            src={{
              src: value.url,
              fullHeight: value.imageMeta.height,
              fullWidth: value.imageMeta.width,
            }}
            displayWidth={128}
            displayHeight={64}
            style={{
              objectFit: "cover",
            }}
          />
        </div>
      )}
      {!disabled && (
        <FileUploader
          style={{
            alignSelf: "auto",
            width: 100,
          }}
          onChange={async (fileList: FileList | null) => {
            if (!fileList || fileList.length === 0) {
              return;
            }

            const file = fileList[0];
            setUploading(true);
            const result = await appCtx.api.cmsFileUpload(file);
            setUploading(false);
            onChange?.(result.files[0]);
          }}
          accept={".gif,.jpg,.jpeg,.png,.avif,.tif,.svg,.webp"}
        />
      )}
      {isUploading && <em>Uploading...</em>}
    </div>
  );
}

export function CmsFileInput(props: {
  value?: CmsUploadedFile | undefined;
  onChange?: (value: CmsUploadedFile | undefined) => void;
}) {
  const appCtx = useAppCtx();
  const { value, onChange } = props;
  const [isUploading, setUploading] = React.useState(false);
  const { disabled } = useContentEntryFormContext();
  const fileSizeLimit = 8;
  return (
    <div
      className="flex-col flex-vcenter flex-align-start"
      style={{ gap: 16, paddingTop: 8 }}
    >
      {value && (
        <a href={value.url} target="_blank">
          {value.name}
        </a>
      )}
      {!disabled && (
        <FileUploader
          style={{
            alignSelf: "auto",
            width: 100,
          }}
          onChange={async (fileList: FileList | null) => {
            if (!fileList || fileList.length === 0) {
              return;
            }

            const file = fileList[0];
            if (file.size > fileSizeLimit * 1024 * 1024) {
              notification.error({
                message: `This file is too big, you can only upload files up to ${fileSizeLimit}MB`,
              });
              return;
            }
            setUploading(true);
            const result = await appCtx.api.cmsFileUpload(file);
            setUploading(false);
            onChange?.(result.files[0]);
          }}
        />
      )}
      {isUploading && <em>Uploading...</em>}
    </div>
  );
}

export function CmsColorInput(props: {
  value?: string | undefined;
  onChange?: (value: string | undefined) => void;
}) {
  const { disabled } = useContentEntryFormContext();
  const { value, onChange } = props;
  const colorPickerRef = React.useRef<HTMLDivElement>(null);
  const [pickr, setPickr] = React.useState<Pickr | null>(null);

  React.useLayoutEffect(() => {
    const _pickr = Pickr.create({
      el: colorPickerRef.current!,
      container: colorPickerRef.current!,
      showAlways: !disabled,
      inline: !disabled,
      theme: "nano",
      default: value ?? "#ffffff",
      components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
          clear: false,
          save: false,
          input: true,
          hex: false,
          rgba: false,
          hsla: false,
        },
      },
    }).on("change", (val) => {
      onChange?.(val.toHEXA().toString());
    });
    if (value) {
      _pickr.setColor(value);
    }
    setPickr(_pickr);
  }, []);

  return (
    <div className="flex justify-between flex-vcenter">
      <div ref={colorPickerRef}></div>
      {disabled ? (
        <>
          <div
            style={{
              backgroundColor: value,
              width: 32,
              height: 32,
            }}
          ></div>
          <span>{value}</span>
        </>
      ) : null}
    </div>
  );
}

export function CmsRichTextInput({
  value,
  onChange,
}: {
  value?: string | undefined;
  onChange?: (value: string | undefined) => void;
}) {
  const { disabled } = useContentEntryFormContext();
  return (
    <React.Suspense fallback={<Spinner />}>
      <LazyRichTextEditor
        value={value ?? ""}
        onChange={ensure(
          onChange,
          "Rich text editor requires onChange callback"
        )}
        readOnly={disabled}
      />
    </React.Suspense>
  );
}

export function CmsEnumInput(props: any) {
  const { typeMeta } = useContentEntryFormContext();

  if (typeMeta.type !== CmsMetaType.ENUM) {
    return null;
  }

  return (
    <Select {...props} type={"bordered"}>
      <Select.Option value={undefined}>Unset</Select.Option>
      {typeMeta?.options?.map((row) => (
        <Select.Option key={row} value={row}>
          {row}
        </Select.Option>
      ))}
    </Select>
  );
}

export function renderEntryField(type: CmsTypeName): ReactElement {
  switch (type as CmsTypeName) {
    case CmsMetaType.REF:
      return <CmsRefInput />;
    case CmsMetaType.LIST:
      return <CmsListInput />;
    case CmsMetaType.OBJECT:
      return <CmsObjectInput />;
    case CmsMetaType.TEXT:
      return <CmsTextInput />;
    case CmsMetaType.LONG_TEXT:
      return <CmsLongTextInput />;
    case CmsMetaType.NUMBER:
      return <CmsNumberInput />;
    case CmsMetaType.BOOLEAN:
      return <CmsBooleanInput />;
    case CmsMetaType.DATE_TIME:
      return <CmsDateTimeInput />;
    case CmsMetaType.IMAGE:
      return <CmsImageInput />;
    case CmsMetaType.FILE:
      return <CmsFileInput />;
    case CmsMetaType.COLOR:
      return <CmsColorInput />;
    case CmsMetaType.RICH_TEXT:
      return <CmsRichTextInput />;
    case CmsMetaType.ENUM:
      return <CmsEnumInput />;
  }
}

interface MaybeLocalizedInputProps {
  databaseId: CmsDatabaseId;
  required?: boolean;
  fieldPath: string[];
  localized: boolean;
  locales: string[];
  children: React.ReactNode;
  fieldPathSuffix: string[];
  formItemProps: FormItemProps;
  typeName: CmsTypeName;
  uniqueStatus?: UniqueFieldStatus;
}

export function renderMaybeLocalizedInput({
  databaseId,
  fieldPath,
  localized,
  locales,
  children,
  fieldPathSuffix,
  formItemProps,
  typeName,
  required,
  uniqueStatus,
}: MaybeLocalizedInputProps) {
  return (
    <ContentEntryFormContext.Consumer>
      {(ctx_) => {
        const ctx = {
          ...ensure(ctx_, "ContentEntryFormContext must be set"),
          directlyInsideList: false,
        };
        const { maxChars, minChars } = isCmsTextLike(ctx.typeMeta)
          ? ctx.typeMeta
          : { maxChars: undefined, minChars: undefined };

        return !localized ? (
          <ContentEntryFormContext.Provider
            value={{
              ...ctx,
              name: [...fieldPath, "", ...fieldPathSuffix],
            }}
          >
            <MaybeFormItem
              maxChars={maxChars}
              minChars={minChars}
              required={required}
              typeName={typeName}
              {...formItemProps}
              uniqueStatus={uniqueStatus}
              name={[...fieldPath, "", ...fieldPathSuffix]}
            >
              {children}
            </MaybeFormItem>
          </ContentEntryFormContext.Provider>
        ) : (
          <Form.Item
            {...formItemProps}
            style={{ marginBottom: "2" }}
            rules={[
              { required: required, message: "Field is required" },
              { max: maxChars },
              { min: minChars },
            ]}
          >
            <div
              style={{ padding: "8px 0 8px 8px", borderLeft: "8px solid #eef" }}
              className={"vlist-gap-xlg"}
            >
              {["", ...locales].map((locale) => (
                <div>
                  <div style={{ fontWeight: 600, color: "#888" }}>
                    {locale || "Locale: Default"}
                  </div>
                  <ContentEntryFormContext.Provider
                    value={{
                      ...ctx,
                      name: [...fieldPath, locale, ...fieldPathSuffix],
                    }}
                  >
                    <MaybeFormItem
                      maxChars={maxChars}
                      minChars={minChars}
                      required={required}
                      uniqueStatus={uniqueStatus}
                      typeName={typeName}
                      name={[...fieldPath, locale, ...fieldPathSuffix]}
                      noStyle
                    >
                      {children}
                    </MaybeFormItem>
                  </ContentEntryFormContext.Provider>
                </div>
              ))}
              <div>
                <PublicLink
                  href={fillRoute(APP_ROUTES.cmsSettings, { databaseId })}
                  target={"_blank"}
                >
                  Setup locales <GrNewWindow />
                </PublicLink>
              </div>
            </div>
          </Form.Item>
        );
      }}
    </ContentEntryFormContext.Consumer>
  );
}

function deriveFieldLabel(field: CmsFieldMeta) {
  return field.label || upperFirst(field.identifier);
}

export function deriveFormItemPropsFromField(field: CmsFieldMeta) {
  return {
    label: <strong>{deriveFieldLabel(field)}</strong>,
    help: field.helperText || undefined,
  };
}
