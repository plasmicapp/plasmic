import AnonymousIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__UserSvg";
import { ApiUser } from "@/wab/shared/ApiSchema";
import { fullNameAndEmail, getUserEmail } from "@/wab/shared/ApiSchemaUtil";
import { nullToUndefined, simpleHash } from "@/wab/shared/common";
import { Side } from "@/wab/shared/geom";
import { Chroma } from "@/wab/shared/utils/color-utils";
import { Tooltip } from "antd";
import classNames from "classnames";
import React, { CSSProperties, ReactNode } from "react";

type AvatarSize = "small";

interface RawAvatarProps {
  name?: string;
  imgUrl?: string;
  children?: ReactNode;
  highlight?: boolean;
  initials?: string;
  className?: string;
  style?: CSSProperties;
  tooltipPlacement?: Side;
  size?: AvatarSize;
  onClick?: () => void;
  showToolTip?: boolean;
}

function getInitials(firstName: string, lastName: string, email: string) {
  return firstName || lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : email.slice(0, 2).toUpperCase();
}

export function RawAvatar({
  imgUrl,
  name,
  children,
  className,
  style,
  tooltipPlacement = "bottom",
  initials = "?",
  highlight = false,
  size,
  onClick,
  showToolTip = true,
}: RawAvatarProps) {
  const showInitials = !children && !imgUrl;
  const AvatarContent = (
    <div
      className={classNames(
        {
          Avatar: true,
          Avatar__Small: size === "small",
          Avatar__Highlight: highlight,
        },
        className
      )}
      style={{
        background: showInitials
          ? Chroma.hsl(simpleHash(name || "???") % 360, 0.8, 0.35).hex()
          : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
      {imgUrl && <img src={imgUrl} className={"Avatar__Img"} />}
      {showInitials && initials}
    </div>
  );
  return showToolTip ? (
    <Tooltip title={name} placement={tooltipPlacement}>
      {AvatarContent}
    </Tooltip>
  ) : (
    AvatarContent
  );
}

interface AvatarProps {
  user: ApiUser;
  className?: string;
  style?: CSSProperties;
  tooltipPlacement?: Side;
  size?: AvatarSize;
  onClick?: () => void;
  showToolTip?: boolean;
}

export function Avatar({
  user,
  className,
  style,
  tooltipPlacement,
  size,
  onClick,
  showToolTip = true,
}: AvatarProps) {
  return (
    <RawAvatar
      className={className}
      name={fullNameAndEmail(user)}
      initials={getInitials(
        user.firstName || "",
        user.lastName || "",
        getUserEmail(user)
      )}
      imgUrl={nullToUndefined(user.avatarUrl)}
      size={size}
      style={style}
      tooltipPlacement={tooltipPlacement}
      onClick={onClick}
      showToolTip={showToolTip}
    />
  );
}

export function AnonymousAvatar({
  className,
  style,
  tooltipPlacement,
  size,
  onClick,
}: Omit<AvatarProps, "user">) {
  return (
    <RawAvatar
      className={className}
      name={"Anonymous"}
      initials={"?"}
      size={size}
      style={style}
      tooltipPlacement={tooltipPlacement}
      onClick={onClick}
    >
      <AnonymousIcon className={"Avatar__Img"} />
    </RawAvatar>
  );
}

interface MoreUsersAvatarProps extends Omit<AvatarProps, "user"> {
  number?: number;
}

export function MoreUsersAvatar({
  className,
  number,
  style,
  tooltipPlacement,
  size,
}: MoreUsersAvatarProps) {
  return (
    <RawAvatar
      className={className}
      name={`+ ${number} users`}
      initials={`+${number}`}
      size={size}
      style={style}
      tooltipPlacement={tooltipPlacement}
    >
      <span style={{ fontSize: 8 }}>+{number}</span>
    </RawAvatar>
  );
}

export interface AvatarGalleryProps {
  users: ApiUser[];
}

export function AvatarGallery({ users }: AvatarGalleryProps) {
  return (
    <div className={"AvatarGallery"}>
      {users.map((user) => (
        <Avatar key={user.id} user={user} />
      ))}
    </div>
  );
}
