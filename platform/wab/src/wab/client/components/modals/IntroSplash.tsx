import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { spawn } from "@/wab/shared/common";
import { Button } from "antd";
import React, { useState } from "react";
import { Modal } from "@/wab/client/components/widgets/Modal";

export function IntroSplash() {
  const appCtx = useAppCtx();
  const [show, setShow] = useState(
    appCtx.appConfig.showIntroSplash &&
      appCtx.selfInfo &&
      appCtx.selfInfo.needsIntroSplash
  );
  async function onDone() {
    setShow(false);
    spawn(
      appCtx.api.updateSelfInfo({
        needsIntroSplash: false,
      })
    );
  }
  if (show) {
    return (
      <Modal
        title={"Welcome to Plasmic!"}
        open={true}
        footer={null}
        onCancel={onDone}
        width={640}
      >
        {show && (
          <div className={"flex-col flex-hcenter vlist-gap-lg"}>
            <iframe
              width="560"
              height="315"
              src={`https://www.youtube.com/embed/${appCtx.appConfig.introYoutubeId}?rel=0`}
              frameBorder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <Button type={"primary"} size={"large"} onClick={onDone}>
              Let's go!
            </Button>
            <span className={"text-xlg"}>
              (You can always watch this again by clicking Help.)
            </span>
          </div>
        )}
      </Modal>
    );
  } else {
    return null;
  }
}
