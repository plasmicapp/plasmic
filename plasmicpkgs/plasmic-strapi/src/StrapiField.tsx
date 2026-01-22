import { useSelector } from "@plasmicapp/host";
import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  _extractDisplayableFields,
  _getFieldValue,
  _getMediaAttributes,
  _isImage,
  _isStrapiItem,
  _isStrapiPrimitive,
} from "@plasmicpkgs/strapi";
import React from "react";
import { modulePath } from "./utils";

interface StrapiFieldProps {
  className?: string;
  path?: string;
  setControlContextData?: (data: {
    fields: string[];
    isImage: boolean;
  }) => void;
}

export const strapiFieldMeta: CodeComponentMeta<StrapiFieldProps> = {
  name: "StrapiField",
  displayName: "Strapi Field",
  importName: "StrapiField",
  importPath: modulePath,
  props: {
    path: {
      type: "choice",
      options: (_, ctx) => {
        return ctx?.fields ?? [];
      },
      displayName: "Field",
      description: "Field name",
    },
  },
};

export function StrapiField({
  className,
  path,
  setControlContextData,
}: StrapiFieldProps) {
  const item = useSelector("strapiItem");
  if (!item) {
    return <div>StrapiField must be used within a StrapiCollection</div>;
  }

  // Getting only fields that aren't objects
  const displayableFields = _extractDisplayableFields(item);

  setControlContextData?.({
    fields: displayableFields,
    isImage: false,
  });

  if (!path) {
    return <div>StrapiField must specify a field name.</div>;
  }

  const data = _getFieldValue(item, path);
  const mediaAttributes = _isStrapiItem(data)
    ? _getMediaAttributes(data)
    : null;

  setControlContextData?.({
    fields: displayableFields,
    isImage: mediaAttributes ? _isImage(mediaAttributes) : false,
  });

  if (data === undefined) {
    return <div>Please specify a valid field name.</div>;
  } else if (data === null) {
    return <div className={className}></div>;
  } else if (mediaAttributes && _isImage(mediaAttributes)) {
    // URL is already absolute after transformMediaUrls in queryStrapi
    return (
      <img
        className={className}
        src={mediaAttributes.absoluteUrl}
        width={300}
        height={(300 * mediaAttributes.height) / mediaAttributes.width}
      />
    );
  } else if (_isStrapiPrimitive(data)) {
    return <div className={className}>{data}</div>;
  } else {
    console.warn("Complex field value:", data);
    return (
      <div>
        Complex field value could not be displayed. See console for details.
      </div>
    );
  }
}
