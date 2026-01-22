import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import { GlobalContextMeta } from "@plasmicapp/host/registerGlobalContext";
import { usePlasmicQueryData } from "@plasmicapp/query";
import isArray from "lodash/isArray";
import React, { useContext } from "react";

import { Image, ProductElement, ReviewResponse } from "./types";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-yotpo";

interface YotpoProps {
  appKey: string;
  uToken: string;
}

const CredentialsContext = React.createContext<YotpoProps | undefined>(
  undefined
);

export const YotpoCredentialsProviderMeta: GlobalContextMeta<YotpoProps> = {
  name: "Yotpo",
  displayName: "Yotpo Credentials Provider",
  description:
    "Your app key is sometimes referred to as your Store ID.[get your App Key](https://support.yotpo.com/en/article/finding-your-yotpo-app-key-and-secret-key).",
  importName: "Yotpo",
  importPath: modulePath,
  props: {
    appKey: {
      type: "string",
      displayName: "App Key",
      description: "App Key of your Yotpo Store ",
    },
    uToken: {
      type: "string",
      displayName: "UToken",
      description:
        "Utoken is required in non-public API calls to ensure private account data is accessible only by authorized users.",
    },
  },
};

export function YotpoCredentialsProvider({
  appKey,
  uToken,
  children,
}: React.PropsWithChildren<YotpoProps>) {
  return (
    <CredentialsContext.Provider value={{ appKey, uToken }}>
      {children}
    </CredentialsContext.Provider>
  );
}

interface YotpoReviewsProps {
  reviewId?: string;
  productPrice?: string;
  currency?: string;
  setControlContextData?: (data: {
    reviews?: { name: string; id: number }[];
  }) => void;
  className?: string;
}

export const YotpoReviewsMeta: CodeComponentMeta<YotpoReviewsProps> = {
  name: "hostless-yotpo-star-reviews",
  displayName: "Yotpo Reviews",
  importName: "YotpoReviews",
  importPath: modulePath,
  providesData: true,
  description: "Yotpo Reviews for your product pages ",
  defaultStyles: {
    width: "400px",
    height: "600px",
  },
  props: {
    reviewId: {
      type: "choice",
      options: (props, ctx) =>
        ctx?.reviews?.map((item: any) => ({
          label: item?.name,
          value: item?.id,
        })) ?? [],
      displayName: "Review",
      description: "Review Widget which to be displayed",
    },
    productPrice: {
      type: "string",
      displayName: "Price",
      description: "Price of the Product",
    },
    currency: {
      type: "string",
      displayName: "Currency",
      description: "Currency",
    },
  },
};

export function YotpoReviews({
  reviewId,
  setControlContextData,
  productPrice,
  currency,
  className,
}: YotpoReviewsProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    creds,
    reviewId,
  });
  React.useEffect(() => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `(function e(){var e=document.createElement("script");e.type="text/javascript",e.async=true,e.src="//staticw2.yotpo.com/${creds.appKey}/widget.js";var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t)})();`;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [creds]);

  const { data: reviewsData } = usePlasmicQueryData<any | null>(
    `${cacheKey}/reviews`,
    async () => {
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
      };

      const res = await fetch(
        `https://api.yotpo.com/v1/apps/${creds.appKey}/reviews?utoken=${creds.uToken}`,
        options
      );
      return res.json();
    }
  );

  const { data: reviewData } = usePlasmicQueryData<ReviewResponse | null>(
    `${cacheKey}/review`,
    async () => {
      if (!reviewId) {
        return undefined;
      }
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
      };

      const res = await fetch(
        `https://api.yotpo.com/reviews/${reviewId}?utoken=${creds.uToken}`,
        options
      );
      return res.json();
    }
  );

  if (!reviewsData) {
    return (
      <div>
        Please configure the Yotpo Credentials provider with valid AppKey.
      </div>
    );
  }
  const data = Object.values(reviewsData).map((item: any) => item);

  setControlContextData?.({
    reviews: data[0] || [],
  });

  if (!creds.uToken || !creds.appKey) {
    return <div>Please specify a valid API Credentials: uToken,appKey</div>;
  }

  if (!reviewData) {
    return <div>Please choose the reviewId</div>;
  }

  if (!productPrice || !currency) {
    return <div> Please enter Product price and Currency</div>;
  }

  const review = Object.values(reviewsData).flatMap((item: any) =>
    (isArray(item) ? item : [item]).filter((r: any) => r.id === reviewId)
  );

  const renderedData = reviewData?.response.review.products.map(
    (item: ProductElement) => {
      const imageUrl = item?.Product.images.map((image: Image) => {
        return image.image_url;
      });
      return (
        <div
          key={item.Product.id}
          className="yotpo yotpo-main-widget"
          data-product-id={review[0]?.sku}
          data-price={productPrice}
          data-currency={currency}
          data-name={item?.Product.name}
          data-url={item?.Product.shorten_url}
          data-image-url={imageUrl}
        ></div>
      );
    }
  );
  return <div className={className}>{renderedData}</div>;
}

interface YotpoStarRatingProps {
  productId: string;
  className?: string;
  setControlContextData?: (data: {
    reviews?: { name: string; id: number }[];
  }) => void;
}

export const YotpoStarRatingMeta: CodeComponentMeta<YotpoStarRatingProps> = {
  name: "hostless-yotpo-star-rating",
  displayName: "Yotpo Star Rating",
  importName: "YotpoStarRating",
  importPath: modulePath,
  providesData: true,
  description: "Yotpo Star Rating for your product pages ",
  props: {
    productId: {
      type: "choice",
      options: (props, ctx) =>
        ctx?.reviews?.map((item: any) => ({
          label: item?.name,
          value: item?.id,
        })) ?? [],
      displayName: "Product",
      description: "Product which you want to show rating",
    },
  },
};

export function YotpoStarRating({
  productId,
  className,
  setControlContextData,
}: YotpoStarRatingProps) {
  const creds = ensure(useContext(CredentialsContext));
  const cacheKey = JSON.stringify({
    creds,
    productId,
  });
  React.useEffect(() => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `(function e(){var e=document.createElement("script");e.type="text/javascript",e.async=true,e.src="//staticw2.yotpo.com/${creds.appKey}/widget.js";var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t)})();`;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [creds]);

  const { data: reviews } = usePlasmicQueryData<any | null>(
    `${cacheKey}/starReviews`,
    async () => {
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
      };

      const res = await fetch(
        `https://api.yotpo.com/v1/apps/${creds.appKey}/reviews?utoken=${creds.uToken}`,
        options
      );
      return res.json();
    }
  );
  const { data: review } = usePlasmicQueryData<ReviewResponse | null>(
    `${cacheKey}/starReview`,
    async () => {
      if (!productId) {
        return undefined;
      }
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
      };

      const res = await fetch(
        `https://api.yotpo.com/reviews/${productId}?utoken=${creds.uToken}`,
        options
      );
      return res.json();
    }
  );

  if (!creds.uToken || !creds.appKey) {
    return <div>Please specify a valid API Credentials: uToken,appKey</div>;
  }

  if (!reviews) {
    return (
      <div>
        Please configure the Yotpo Credentials provider with valid AppKey.
      </div>
    );
  }

  const data = Object.values(reviews).map((item: any) => item);

  setControlContextData?.({
    reviews: data[0] || [],
  });

  if (!review) {
    return (
      <div>
        Please configure the Yotpo Credentials provider with valid AppKey.
      </div>
    );
  }
  const product = Object.values(reviews).flatMap((item: any) =>
    (isArray(item) ? item : [item]).filter((r: any) => r.id === productId)
  );

  const renderedData = review?.response.review.products.map(
    (item: ProductElement) => (
      <div
        className="yotpo bottomLine"
        data-product-id={product[0]?.sku}
        data-url={item.Product.product_url}
      />
    )
  );

  return <div className={className}>{renderedData}</div>;
}
