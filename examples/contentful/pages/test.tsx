import { ContentfulFetcher, ContentfulField } from "../components/contentful";
import { getAllPostsForHome } from "../lib/api";

export async function getStaticProps() {
  const data = await getAllPostsForHome(false);
  console.log("data", data);
  return {
    props: {
      data,
    },
  };
}
export default function Test() {
  return (
    <ContentfulFetcher>
      <ContentfulField path="featuredImage" />
      <ContentfulField path="title" />
      <ContentfulField path="description" />
    </ContentfulFetcher>
  );
  return <div></div>;
}
