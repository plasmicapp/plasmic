import { graphql } from "../graphql/gen";

export const seoFragment = graphql(`
  fragment seo on SEO {
    description
    title
  }
`);
