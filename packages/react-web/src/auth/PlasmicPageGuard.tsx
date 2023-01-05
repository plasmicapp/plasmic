import { PlasmicDataSourceContextValue } from "@plasmicapp/data-sources-context";
import React from "react";

export function PlasmicPageGuard(props: {
  children: React.ReactNode;
  dataSourceCtxValue: PlasmicDataSourceContextValue | undefined;
  validRoles: string[];
}) {
  const { children, dataSourceCtxValue, validRoles } = props;
  if (!dataSourceCtxValue || dataSourceCtxValue.isUserLoading) {
    return null;
  }

  function canUserViewPage() {
    if (!dataSourceCtxValue) {
      return false;
    }
    if (!dataSourceCtxValue.user) {
      return false;
    }
    if (!("roleId" in dataSourceCtxValue.user)) {
      return false;
    }
    return validRoles.includes(dataSourceCtxValue.user.roleId);
  }

  if (!canUserViewPage()) {
    return <div>You don't have access to this page</div>;
  }

  return children;
}
