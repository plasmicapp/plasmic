import { DataProvider, repeatedElement, useSelector } from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import sanityClient from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import L from "lodash";
import { ReactNode } from "react";

const sanity = sanityClient({
  projectId: "zp7mbokg",
  dataset: "production",
  useCdn: true,
});

const imageBuilder = imageUrlBuilder(sanity);

export function SanityFetcher({
  groq,
  children,
  className,
}: {
  groq?: string;
  children?: ReactNode;
  className?: string;
}) {
  const data = usePlasmicQueryData<any[] | null>(
    JSON.stringify({ groq }),
    async () => {
      if (!groq) {
        return null;
      }
      const resp = await sanity.fetch(groq);
      return resp;
    }
  );
  if (!data?.data) {
    return <div>Please specify a GROQ query.</div>;
  }
  return (
    <div className={className}>
      {data?.data.map((item, index) => (
        <DataProvider key={item._id} name={"sanityItem"} data={item}>
          {repeatedElement(index, children)}
        </DataProvider>
      ))}
    </div>
  );
}

export function SanityField({
  className,
  path,
}: {
  className?: string;
  path?: string;
}) {
  const item = useSelector("sanityItem");
  if (!item) {
    return <div>SanityField must be used within a SanityFetcher</div>;
  }
  if (!path) {
    return <div>SanityField must specify a path.</div>;
  }
  const data = L.get(item, path);
  if (data?._type === "image") {
    return (
      <img
        src={imageBuilder.image(data).ignoreImageParams().width(300).toString()}
      />
    );
  } else {
    return <div className={className}>{data}</div>;
  }
}
