import * as plasmicQuery from "@plasmicapp/query";
import * as React from "react";

export const PlasmicHeadContext = React.createContext<
  React.ComponentType<any> | undefined
>(undefined);

export function PlasmicHead(props: plasmicQuery.HeadMetadata) {
  const Head = React.useContext(PlasmicHeadContext);
  const headMetadata =
    // Check if `HeadMetadataContext` is exported for backward compatibility
    "HeadMetadataContext" in plasmicQuery
      ? React.useContext(plasmicQuery.HeadMetadataContext)
      : undefined;

  if (headMetadata) {
    // If we have the Head metadata object specified, mutate it so to ensure it
    // stores the data that should go in the <head>.
    if (props.image) {
      headMetadata.image = props.image;
    }
    if (props.title) {
      headMetadata.title = props.title;
    }
    if (props.description) {
      headMetadata.description = props.description;
    }
    if (props.canonical) {
      headMetadata.canonical = props.canonical;
    }
  }

  if (!Head) {
    console.warn(
      `Plasmic: Head meta tags are being ignored. To make them work, pass a Head component into PlasmicRootProvider.`
    );
    // TODO: Link to doc about Head.
    return null;
  }

  // Helmet does not support React.Fragments, so we need to use `[<meta />,
  // <meta />]` instead of `<><meta /><meta /></>`.
  return (
    <Head>
      {props.image ? (
        [
          <meta
            key="twitter:card"
            name="twitter:card"
            content="summary_large_image"
          />,
          <meta key="og:image" property="og:image" content={props.image} />,
          <meta
            key="twitter:image"
            name="twitter:image"
            content={props.image}
          />,
        ]
      ) : (
        <meta key="twitter:card" name="twitter:card" content="summary" />
      )}
      {props.title && [
        <title key="title">{props.title}</title>,
        <meta key="og:title" property="og:title" content={props.title} />,
        <meta
          key="twitter:title"
          property="twitter:title"
          content={props.title}
        />,
      ]}
      {props.description && [
        <meta
          key="description"
          name="description"
          content={props.description}
        />,
        <meta
          key="og:description"
          property="og:description"
          content={props.description}
        />,
        <meta
          key="twitter:description"
          name="twitter:description"
          content={props.description}
        />,
      ]}
      {props.canonical && (
        <link key="canonical" rel="canonical" href={props.canonical} />
      )}
    </Head>
  );
}

export const plasmicHeadMeta = {
  name: "hostless-plasmic-head",
  displayName: "Page Metadata Override",
  description: "Set page metadata (HTML <head />) to dynamic values.",
  importName: "PlasmicHead",
  importPath: "@plasmicapp/react-web",
  isRepeatable: false,
  styleSections: false,
  props: {
    title: {
      type: "string",
      displayName: "Title",
    },
    description: {
      type: "string",
      displayName: "Description",
    },
    image: {
      type: "imageUrl",
      displayName: "Image",
    },
    canonical: {
      type: "string",
      displayName: "Canonical URL",
    },
  },
};
