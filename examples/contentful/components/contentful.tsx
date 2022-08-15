import { DataProvider, repeatedElement, useSelector } from "@plasmicapp/host";
import { usePlasmicQueryData } from "@plasmicapp/query";
import L from "lodash";
import { ReactNode } from "react";
import { getAllPostsForHome } from "../lib/api";

export function ContentfulFetcher({
  type,
  children,
  className,
}: {
  type?: string;
  children?: ReactNode;
  className?: string;
}) {
  const data = usePlasmicQueryData<any[] | null>(
    JSON.stringify({ type }),
    async () => {
      return getAllPostsForHome(false);
    }
  );
  console.log("!", data);
  if (!data?.data) {
    return <div>Please specify a collection.</div>;
  }
  return (
    <div className={className}>
      {data?.data.map((item, index) => (
        <DataProvider key={item.slug} name={"contenfulItem"} data={item}>
          {repeatedElement(index, children)}
        </DataProvider>
      ))}
    </div>
  );
}

export function ContentfulField({
  className,
  path,
  setControlContextData,
}: {
  className?: string;
  path?: string;
  setControlContextData: (data: any) => void;
}) {
  const item = useSelector("contenfulItem");
  if (!item) {
    return <div>ContentfulField must be used within a ContentfulFetcher</div>;
  }
  setControlContextData?.({ fields: Object.keys(item) });
  if (!path) {
    return <div>ContentfulField must specify a path.</div>;
  }
  const data = L.get(item, path);
  if (data?.url) {
    return <img src={data.url} />;
  } else {
    return <div className={className}>{data}</div>;
  }
}
