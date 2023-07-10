import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {flattenConnection, Image} from '@shopify/hydrogen';

import {Grid, PageHeader, Section, Link} from '~/components';
import {getImageLoadingPriority, PAGINATION_SIZE} from '~/lib/const';
import {seoPayload} from '~/lib/seo.server';
import {routeHeaders} from '~/data/cache';
import type {ArticleFragment} from 'storefrontapi.generated';

const BLOG_HANDLE = 'Journal';

export const headers = routeHeaders;

export const loader = async ({request, context: {storefront}}: LoaderArgs) => {
  const {language, country} = storefront.i18n;
  const {blog} = await storefront.query(BLOGS_QUERY, {
    variables: {
      blogHandle: BLOG_HANDLE,
      pageBy: PAGINATION_SIZE,
      language,
    },
  });

  if (!blog?.articles) {
    throw new Response('Not found', {status: 404});
  }

  const articles = flattenConnection(blog.articles).map((article) => {
    const {publishedAt} = article!;
    return {
      ...article,
      publishedAt: new Intl.DateTimeFormat(`${language}-${country}`, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(publishedAt!)),
    };
  });

  const seo = seoPayload.blog({blog, url: request.url});

  return json({articles, seo});
};

export default function Journals() {
  const {articles} = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading={BLOG_HANDLE} />
      <Section>
        <Grid as="ol" layout="blog">
          {articles.map((article, i) => (
            <ArticleCard
              blogHandle={BLOG_HANDLE.toLowerCase()}
              article={article}
              key={article.id}
              loading={getImageLoadingPriority(i, 2)}
            />
          ))}
        </Grid>
      </Section>
    </>
  );
}

function ArticleCard({
  blogHandle,
  article,
  loading,
}: {
  blogHandle: string;
  article: ArticleFragment;
  loading?: HTMLImageElement['loading'];
}) {
  return (
    <li key={article.id}>
      <Link to={`/${blogHandle}/${article.handle}`}>
        {article.image && (
          <div className="card-image aspect-[3/2]">
            <Image
              alt={article.image.altText || article.title}
              className="object-cover w-full"
              data={article.image}
              aspectRatio="3/2"
              loading={loading}
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        )}
        <h2 className="mt-4 font-medium">{article.title}</h2>
        <span className="block mt-1">{article.publishedAt}</span>
      </Link>
    </li>
  );
}

const BLOGS_QUERY = `#graphql
query Blog(
  $language: LanguageCode
  $blogHandle: String!
  $pageBy: Int!
  $cursor: String
) @inContext(language: $language) {
  blog(handle: $blogHandle) {
    title
    seo {
      title
      description
    }
    articles(first: $pageBy, after: $cursor) {
      edges {
        node {
          ...Article
        }
      }
    }
  }
}

fragment Article on Article {
  author: authorV2 {
    name
  }
  contentHtml
  handle
  id
  image {
    id
    altText
    url
    width
    height
  }
  publishedAt
  title
}
`;
