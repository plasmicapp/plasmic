import React, { useCallback, useEffect, useRef, useState } from "react";
import { Registerable, registerComponentHelper } from "./lib/utils";

import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import getMetadata, { isValidUrl, Metadata } from "./lib/html-metadata-parser";

export type LinkPreviewProps = {
  url: string;
  children: React.ReactNode;
  loadingMessage: React.ReactNode;
  noPreviewMessage: React.ReactNode;
  showLoading: boolean;
  showNoPreview: boolean;
};

export const LinkPreview: React.FC<LinkPreviewProps> = ({
  url,
  children,
  loadingMessage,
  noPreviewMessage,
  showLoading,
  showNoPreview,
}) => {
  const _isMounted = useRef(true);
  const [metadata, setMetadata] = useState<Metadata>({});
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!usePlasmicCanvasContext();

  const resetMetadata = useCallback(() => {
    setMetadata({
      title: "",
      description: "",
      image: "",
      siteName: "",
      hostname: "",
    });
  }, []);

  useEffect(() => {
    _isMounted.current = true;
    if (!url) return;

    setIsLoading(true);
    resetMetadata();
    getMetadata(url)
      .then((res) => {
        if (_isMounted.current) {
          setMetadata(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        console.error("No metadata could be found for the given URL.");
        if (_isMounted.current) {
          resetMetadata();
          setIsLoading(false);
        }
      });
    return () => {
      _isMounted.current = false;
    };
  }, [resetMetadata, url]);

  const showLoadingProp = isEditMode ? showLoading : false;
  const showNoPreviewProp = isEditMode ? showNoPreview : false;
  const hasChildren = (children as any)?.props.children;
  const hasMetadata =
    metadata?.title?.length && !metadata.title.startsWith("Origin DNS error");
  const body = hasChildren ? <>{children}</> : <p>{metadata.title}</p>;
  const hidePreview =
    isLoading || showLoadingProp || showNoPreviewProp || !hasMetadata;
  const hasNoPreview = !isLoading && !hasMetadata;

  return (
    <div>
      <DataProvider name="metadata" data={metadata}>
        {/* We want the metadata to always be available to the elements inside children slot. So we use CSS to hide it */}
        <div style={hidePreview ? { display: "none" } : {}}>{body}</div>
        {(hasNoPreview || showNoPreviewProp) && noPreviewMessage}
        {(isLoading || showLoadingProp) && loadingMessage}
      </DataProvider>
    </div>
  );
};

export const rlpComponentName = "plasmic-link-preview";

export function registerLinkPreview(loader?: Registerable) {
  registerComponentHelper(loader, LinkPreview, {
    name: rlpComponentName,
    providesData: true,
    displayName: "Link Preview",
    props: {
      url: {
        type: "string",
        displayName: "URL",
        defaultValue: "https://plasmic.app",
        defaultValueHint: "https://example.com",
        validator: (value) => {
          if (isValidUrl(value)) return true;
          return "Invalid URL";
        },
        description: "The URL for which you want to generate the link preview.",
      },
      children: {
        type: "slot",
        hidePlaceholder: true,
      },
      noPreviewMessage: {
        type: "slot",
        displayName: "'No Preview' Message",
        hidePlaceholder: true,
        defaultValue: [
          {
            type: "text",
            value: "no preview...",
          },
        ],
      },
      showLoading: {
        type: "boolean",
        description:
          "You can enable this prop to show the loading message, so you can easily customize it. This prop has no effect in the live app.",
      },
      showNoPreview: {
        type: "boolean",
        description:
          "You can enable this prop to show the 'No Preview' message, so you can easily customize it. This prop has no effect in the live app.",
      },
      loadingMessage: {
        type: "slot",
        displayName: "Loading Message",
        hidePlaceholder: true,
        defaultValue: [
          {
            type: "text",
            value: "loading preview...",
          },
        ],
      },
    },
    importPath: "@plasmicpkgs/plasmic-link-preview",
    importName: "LinkPreview",
  });
}
