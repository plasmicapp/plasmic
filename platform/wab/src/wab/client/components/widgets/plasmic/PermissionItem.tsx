import TextWithInfo from "@/wab/client/components/TextWithInfo";
import PublishSpinner from "@/wab/client/components/widgets/PublishSpinner";
import Select from "@/wab/client/components/widgets/Select";
import PP__PermissionItem from "@/wab/client/components/widgets/plasmic/PlasmicPermissionItem";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { ApiFeatureTier } from "@/wab/shared/ApiSchema";
import { AccessLevel, GrantableAccessLevel } from "@/wab/shared/EntUtil";
import { Tooltip } from "antd";
import React, { ReactNode } from "react";

interface PermissionItemProps {
  email?: ReactNode;
  canEdit?: boolean;
  tier: ApiFeatureTier;
  onGrant: (value: GrantableAccessLevel) => Promise<void>;
  onRevoke: () => Promise<void>;
  accessLevel: AccessLevel;
}

export const designerRoleHelp = `Only organizations with at least the Scale plan can invite collaborators as designers.`;
export const contentRoleHelp = `Only organizations with at least the Scale plan can invite collaborators as content creators.`;

export const contentCreatorTooltip = (
  <Tooltip
    zIndex={200000}
    title="Can edit pages using existing components, and can update CMS content."
  >
    Content creator
  </Tooltip>
);
export const designerTooltip = (
  <Tooltip
    zIndex={200000}
    title="Can update Plasmic designs including all styling and layout. Can create design components."
  >
    Designer
  </Tooltip>
);
export const developerTooltip = (
  <Tooltip zIndex={200000} title="Can update anything including model schemas.">
    Developer
  </Tooltip>
);
export const commenterTooltip = (
  <Tooltip zIndex={200000} title="Can view and comment on content.">
    Commenter
  </Tooltip>
);
export const viewerTooltip = (
  <Tooltip zIndex={200000} title="Can view content.">
    Viewer
  </Tooltip>
);

function PermissionItem(props: PermissionItemProps) {
  const { accessLevel, onGrant, onRevoke, canEdit, tier } = props;
  const [loading, setLoading] = React.useState(false);
  const [temporary, setTemporary] = React.useState("");
  const appCtx = useAppCtx();
  return (
    <PP__PermissionItem
      email={props.email}
      role={props.accessLevel == "owner" ? "owner" : undefined}
      loading={loading}
      roleDropdown={{
        value: temporary || accessLevel,
        "aria-label": `Permission level for ${props.email}`,
        onChange: async (key) => {
          setLoading(true);
          setTemporary(key as GrantableAccessLevel);
          try {
            await onGrant(key as GrantableAccessLevel);
          } catch (e) {
            setTemporary("");
            throw e;
          } finally {
            setLoading(false);
          }
        },
        children: [
          <Select.Option value="viewer">{viewerTooltip}</Select.Option>,
          <Select.Option value="commenter">{commenterTooltip}</Select.Option>,
          <Select.Option
            value="content"
            style={{
              display: appCtx.appConfig.contentOnly ? undefined : "none",
            }}
            isDisabled={!tier.contentRole}
          >
            {tier.contentRole ? (
              contentCreatorTooltip
            ) : (
              <TextWithInfo tooltip={contentRoleHelp}>
                {contentCreatorTooltip}
              </TextWithInfo>
            )}
          </Select.Option>,
          <Select.Option
            value="designer"
            style={{
              display: appCtx.appConfig.contentOnly ? undefined : "none",
            }}
            isDisabled={!tier.designerRole}
          >
            {tier.designerRole ? (
              designerTooltip
            ) : (
              <TextWithInfo tooltip={designerRoleHelp}>
                {designerTooltip}
              </TextWithInfo>
            )}
          </Select.Option>,
          <Select.Option value="editor">{developerTooltip}</Select.Option>,
        ],
        isDisabled: !canEdit || loading,
      }}
      deleteBtn={
        props.accessLevel === "owner" || !canEdit
          ? { render: () => null }
          : {
              onClick: async () => {
                setLoading(true);
                try {
                  await onRevoke();
                } catch (e) {
                  setLoading(false);
                  throw e;
                }
              },
            }
      }
      root={{
        style: {
          flexShrink: 0,
        },
      }}
      spinner={<PublishSpinner />}
    />
  );
}

export default PermissionItem as React.FunctionComponent<PermissionItemProps>;
