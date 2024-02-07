import {
  DefaultTrustedHostProps,
  PlasmicTrustedHost,
} from "@/wab/client/plasmic/plasmic_kit_user_settings/PlasmicTrustedHost";
import { ApiTrustedHost } from "@/wab/shared/ApiSchema";
import * as React from "react";

interface TrustedHostProps extends DefaultTrustedHostProps {
  host: ApiTrustedHost;
  onDelete: () => void;
}

function TrustedHost(props: TrustedHostProps) {
  const { host, onDelete } = props;
  return (
    <PlasmicTrustedHost url={host.hostUrl} deleteBtn={{ onClick: onDelete }} />
  );
}

export default TrustedHost;
