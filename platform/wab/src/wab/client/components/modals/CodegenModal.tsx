import { usePersonalApiTokens } from "@/wab/client/components/pages/UserSettingsPage";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, spawn } from "@/wab/shared/common";
import { isFrameComponent } from "@/wab/shared/core/components";
import { Spin } from "antd";
import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";
import { Modal } from "@/wab/client/components/widgets/Modal";

export const CodegenModal = observer(function CodegenModal(props: {
  onCancel: () => void;
  studioCtx: StudioCtx;
}) {
  const { onCancel, studioCtx } = props;
  const [tokensReady, setTokensReady] = useState(false);
  const appOps = ensure(studioCtx.appCtx.ops);
  const tokens = usePersonalApiTokens();

  function tokenStr() {
    if (!tokens.value) {
      return "null";
    }
    return encodeURIComponent(
      JSON.stringify(tokens.value.map((tokenData) => tokenData.token))
    );
  }

  const noComponents =
    studioCtx.site.components.filter((c) => !isFrameComponent(c)).length === 0
      ? "true"
      : "false";

  useEffect(() => {
    const createApiToken = async () => {
      if (tokens.value && tokens.value.length === 0) {
        await appOps.createPersonalApiToken();
      }
      setTokensReady(true);
    };
    spawn(createApiToken());
  }, [tokens.value, appOps, setTokensReady]);

  return (
    <Modal
      title={null}
      footer={null}
      visible={true}
      onCancel={onCancel}
      width={800}
      closable={false}
    >
      {tokensReady && tokens.value ? (
        <iframe
          className={"CodegenPanel"}
          src={`https://plasmic.app/app-content/codegen#projectId=${
            studioCtx.siteInfo.id
          }&noComponents=${noComponents}&tokens=${tokenStr()}`}
        />
      ) : (
        <Spin />
      )}
    </Modal>
  );
});
