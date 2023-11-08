import * as React from "react";
import { ApiTrustedHost } from "../../shared/ApiSchema";
import {
  DefaultTrustedHostProps,
  PlasmicTrustedHost,
} from "../plasmic/plasmic_kit_user_settings/PlasmicTrustedHost";

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
