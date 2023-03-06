import { usePlasmicDataSourceContext } from "@plasmicapp/data-sources-context";
import React from "react";

// https://stackoverflow.com/a/2117523
function uuidv4() {
  // @ts-ignore
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

async function triggerLogin(appId: string, authorizeEndpoint: string) {
  async function sha256(text: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  const continueTo = window.location.href;
  const state = JSON.stringify({ continueTo });
  const code_verifier = uuidv4();
  localStorage.setItem("code_verifier", code_verifier);
  const code_challenge = await sha256(code_verifier);

  const params = new URLSearchParams();
  params.set("client_id", appId);
  params.set("state", state);
  params.set("response_type", "code");
  params.set("code_challenge", code_challenge);
  params.set("code_challenge_method", "S256");

  const url = `${authorizeEndpoint}?${params.toString()}`;
  window.location.href = url;
}

interface PlasmicPageGuardProps {
  appId: string;
  authorizeEndpoint: string;
  minRole?: string;
  canTriggerLogin: boolean;
  children: React.ReactNode;
}

export function PlasmicPageGuard(props: PlasmicPageGuardProps) {
  const {
    appId,
    authorizeEndpoint,
    minRole,
    canTriggerLogin,
    children,
  } = props;

  const dataSourceCtxValue = usePlasmicDataSourceContext();

  React.useEffect(() => {
    if (canTriggerLogin) {
      if (
        minRole &&
        dataSourceCtxValue &&
        "isUserLoading" in dataSourceCtxValue &&
        !dataSourceCtxValue.isUserLoading &&
        !dataSourceCtxValue.user
      ) {
        triggerLogin(appId, authorizeEndpoint);
      }
    }
  }, [dataSourceCtxValue, appId, authorizeEndpoint, canTriggerLogin, minRole]);

  function canUserViewPage() {
    if (!minRole) {
      return true;
    }
    if (!dataSourceCtxValue) {
      return false;
    }
    if (!dataSourceCtxValue.user) {
      return false;
    }
    if (!("roleIds" in dataSourceCtxValue.user)) {
      return false;
    }
    if (!Array.isArray(dataSourceCtxValue.user.roleIds)) {
      return false;
    }
    return dataSourceCtxValue.user.roleIds.includes(minRole);
  }

  if (
    !dataSourceCtxValue ||
    dataSourceCtxValue.isUserLoading ||
    (!dataSourceCtxValue.user && canTriggerLogin)
  ) {
    return null;
  }

  if (!canUserViewPage()) {
    return <div>You don't have access to this page</div>;
  }

  return children;
}
