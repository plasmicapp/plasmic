import React from 'react'
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {
  YotpoCredentialsProvider,
  YotpoCredentialsProviderMeta,
  YotpoReviewsMeta,
  YotpoReviews,
  YotpoStarRating,
  YotpoStarRatingMeta
} from "./yotpo";

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
}) {
  const _registerComponent = <T extends React.ComponentType<any>>(
    Component: T,
    defaultMeta: ComponentMeta<React.ComponentProps<T>>
  ) => {
    if (loader) {
      loader.registerComponent(Component, defaultMeta);
    } else {
      registerComponent(Component, defaultMeta);
    }
  };

  if (loader) {
    loader.registerGlobalContext(
      YotpoCredentialsProvider,
      YotpoCredentialsProviderMeta
    );
  } else {
    registerGlobalContext(
      YotpoCredentialsProvider,
      YotpoCredentialsProviderMeta
    );
  }

  _registerComponent(YotpoReviews, YotpoReviewsMeta);
  _registerComponent(YotpoStarRating, YotpoStarRatingMeta);

}

export * from "./yotpo";
