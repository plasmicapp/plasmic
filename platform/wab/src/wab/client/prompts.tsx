// Returns 'changed', 'unchanged', 'conflict'.  Case-insensitive.
import { promptChooseItems } from "@/wab/client/components/modals/ChooseItemsModal";
import {
  reactPrompt,
  showTemporaryPrompt,
} from "@/wab/client/components/quick-modals";
import Button from "@/wab/client/components/widgets/Button";
import { Modal } from "@/wab/client/components/widgets/Modal";
import NewComponentModal, {
  NewComponentInfo,
} from "@/wab/client/components/widgets/NewComponentModal";
import NewPageModal, {
  NewPageInfo,
} from "@/wab/client/components/widgets/NewPageModal";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { maybe, nullToUndefined } from "@/wab/shared/common";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { Site } from "@/wab/shared/model/classes";
import { Form, notification, Select } from "antd";
import L, { orderBy } from "lodash";
import React from "react";
const { Option } = Select;

export interface HasName {
  name?: string | null;
}

export function uniqueNameWith<T>(
  newName: string,
  existingItems: T[],
  typeLabel: string,
  getName: (item: T) => string | undefined
) {
  newName = newName.trim().toLowerCase();
  if (
    existingItems.some(
      (item) => maybe(getName(item), (name) => name.toLowerCase()) === newName
    )
  ) {
    notification.error({
      description: `Another ${typeLabel} with same name already exists`,
      message: `Please enter a different name.`,
    });
    return false;
  }
  return true;
}

// Returns true if unique.  Case-insensitive.
export function uniqueName(name: string, xs: HasName[], typeLabel) {
  return uniqueNameWith(name, xs, typeLabel, (item) =>
    nullToUndefined(item.name)
  );
}

export function uniqueRenameWith<T>(
  newName: string,
  curItem: T,
  allItems: T[],
  typeLabel: string,
  getName: (item: T) => string | undefined
): "unchanged" | "conflict" | "changed" {
  if (newName === getName(curItem)) {
    return "unchanged";
  }
  if (
    !uniqueNameWith(newName, L.without(allItems, curItem), typeLabel, getName)
  ) {
    return "conflict";
  }
  return "changed";
}

export function uniqueRename(
  newName: string,
  curItem: HasName,
  allItems: HasName[],
  typeLabel: string
) {
  return uniqueRenameWith(newName, curItem, allItems, typeLabel, (item) =>
    nullToUndefined(item.name)
  );
}

export async function promptComponentName(
  opts: {
    message?: string;
    default?: string;
  } = {}
) {
  return await reactPrompt({
    message: opts.message ?? "What's the name for the new component?",
    actionText: "Create",
    placeholder: "New component name",
    defaultValue: opts.default,
  });
}

export async function promptPageName(
  opts: {
    message?: string;
    default?: string;
  } = {}
) {
  return await reactPrompt({
    message: opts.message ?? "What's the name for the new page?",
    actionText: "Create",
    placeholder: "New page name",
    defaultValue: opts.default,
  });
}

export async function promptComponentTemplate(studioCtx: StudioCtx) {
  return await showTemporaryPrompt<NewComponentInfo>((onSubmit, onCancel) => (
    <Modal
      visible={true}
      onCancel={onCancel}
      style={{
        top: 32,
      }}
      modalRender={() => (
        <NewComponentModal
          className="ant-modal-content"
          onSubmit={onSubmit}
          onCancel={onCancel}
          studioCtx={studioCtx}
        />
      )}
    />
  ));
}

export async function promptPageTemplate(studioCtx: StudioCtx) {
  return await showTemporaryPrompt<NewPageInfo>((onSubmit, onCancel) => (
    <Modal
      width={775}
      visible={true}
      style={{
        top: 32,
      }}
      onCancel={onCancel}
      modalRender={() => (
        <NewPageModal
          className="ant-modal-content"
          onSubmit={onSubmit}
          onCancel={onCancel}
          studioCtx={studioCtx}
        />
      )}
    />
  ));
}

export async function promptChooseInstallableDependencies(
  studioCtx: StudioCtx,
  site: Site
) {
  const res = await promptChooseItems({
    title: "Choose additional dependencies",
    description:
      "This package comes with additional (optional) dependencies. Please choose the ones you would like to install.",
    group: orderBy(
      site.projectDependencies.map((dep) => {
        const isAlreadyInstalled =
          studioCtx.projectDependencyManager.containsPkgId(dep.pkgId);
        const isRequired = isHostLessPackage(dep.site);
        let label = dep.name;
        if (isAlreadyInstalled) {
          label += ` (installed)`;
        } else if (isRequired) {
          label += ` (required)`;
        }
        return {
          value: dep.name,
          label,
          item: dep,
          defaultChecked: isAlreadyInstalled || isRequired,
          disabled: isAlreadyInstalled || isRequired,
        };
      }),
      ["disabled", "value"],
      ["desc", "asc"]
    ),
  });
  return res?.map((i) => i.item);
}

interface DescAndTags {
  desc: string | undefined;
  tags: string[];
}

export async function promptTagsAndDesc(
  currDesc: string | undefined,
  currTags: string[],
  studioCtx: StudioCtx
) {
  const projectReleases = await studioCtx.getProjectReleases();
  const previousTags = [
    ...new Set(projectReleases.map((release) => release.tags).flat()),
  ];
  const previousTagsOptions = previousTags.map((tag) => {
    return <Option key={tag}>{tag}</Option>;
  });

  return showTemporaryPrompt<DescAndTags>((onSubmit, onCancel) => (
    <Modal
      title={null}
      visible={true}
      footer={null}
      onCancel={onCancel}
      closable={false}
      wrapClassName="prompt-modal"
    >
      <Form
        onFinish={(e) => {
          onSubmit({ desc: e.desc, tags: e.tags });
        }}
        initialValues={{ ["desc"]: currDesc, ["tags"]: currTags }}
        data-test-id="prompt-form"
        layout="vertical"
      >
        <Form.Item name="desc" label={"Enter a new description"}>
          <Textbox
            name="desc"
            placeholder={"Description"}
            styleType={["bordered"]}
            autoFocus
            data-test-id="promptDesc"
          />
        </Form.Item>
        {DEVFLAGS.publishWithTags ? (
          <Form.Item name="tags" label={"Enter the new tags"}>
            <Select
              mode="tags"
              style={{ width: "100%" }}
              placeholder="Tags"
              tokenSeparators={[","]}
              autoFocus
              data-test-id="promptTags"
            >
              {previousTagsOptions}
            </Select>
          </Form.Item>
        ) : null}
        <Form.Item style={{ margin: 0 }}>
          <Button
            className="mr-sm"
            type="primary"
            htmlType="submit"
            data-test-id="prompt-submit"
          >
            {"Submit"}
          </Button>
          <Button onClick={() => onCancel()}>Cancel</Button>
        </Form.Item>
      </Form>
    </Modal>
  ));
}
