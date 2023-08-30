import React from "react";
import { v4 as uuid } from "uuid";

const TAG_ID = `EB_SCRIPT_${uuid()}`;
const SCRIPT_URL = "https://www.eventbrite.com/static/widgets/eb_widgets.js";

interface Props {
    eventId?: string;
    modal?: boolean;
    onOrderComplete: () => void;
    promoCode?: string;
    iFrameHeight?: string;
    iFrameAutoAdapt?: string;
}
type Widget = {
    widgetType?: string;
    eventId?: string;
    onOrderComplete: () => void;
    modal?: boolean;
    modalTriggerElementId?: string;
    promoCode?: string;
    iframeContainerId?: string;
}
const useEventbrite = ({
    eventId,
    modal,
    onOrderComplete,
    promoCode,
}: Props) => {
    const id = `EB_${uuid()}`;
    const [isLoaded, setLoaded] = React.useState(false);
    const onLoad = React.useCallback(() => setLoaded(true), [setLoaded]);
    const onErr = React.useCallback(
        (e:any) => {
            console.error(`Failed to load Eventbrite script from ${SCRIPT_URL}`);
            console.error(e);

            setLoaded(false);
        },
        [setLoaded]
    );

    React.useEffect(() => {
        //@ts-ignore
        if (globalThis.window?.EBWidgets) {
            setLoaded(true);
            return;
        }
        const existing = document.getElementById(TAG_ID);
        if (existing) {
            existing.remove();
        }
        const script = document.createElement("script");
        script.id = TAG_ID;
        script.async = true;
        script.src = SCRIPT_URL;
        script.addEventListener("load", onLoad);
        script.addEventListener("error", onErr);
        script.addEventListener("abort", onErr);
        document.head.appendChild(script);

        return () => {
            script.removeEventListener("load", onLoad);
            script.removeEventListener("error", onErr);
            script.removeEventListener("abort", onErr);
            script.remove();
            setLoaded(false);
        };
    }, [setLoaded, onLoad, onErr]);

    React.useEffect(() => {
        if (!isLoaded) {
            return;
        }

        const config: Widget = {
            widgetType: "checkout",
            eventId,
            onOrderComplete,
            modal,
        };

        if (modal) {
            config.modalTriggerElementId = id;
        } else {
            config.iframeContainerId = id;
        }

        if (promoCode) {
            config.promoCode = promoCode;
        }
        //@ts-ignore
        globalThis.window?.EBWidgets.createWidget(config);
    }, [isLoaded]);

    return isLoaded ? { id } : null;
};

export default useEventbrite;
