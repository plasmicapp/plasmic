/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

export type OrderCardFragment = Pick<
  StorefrontAPI.Order,
  'id' | 'orderNumber' | 'processedAt' | 'financialStatus' | 'fulfillmentStatus'
> & {
  currentTotalPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  lineItems: {
    edges: Array<{
      node: Pick<StorefrontAPI.OrderLineItem, 'title'> & {
        variant?: StorefrontAPI.Maybe<{
          image?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText' | 'height' | 'width'>
          >;
        }>;
      };
    }>;
  };
};

type Media_ExternalVideo_Fragment = {__typename: 'ExternalVideo'} & Pick<
  StorefrontAPI.ExternalVideo,
  'id' | 'embedUrl' | 'host' | 'mediaContentType' | 'alt'
> & {previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>};

type Media_MediaImage_Fragment = {__typename: 'MediaImage'} & Pick<
  StorefrontAPI.MediaImage,
  'id' | 'mediaContentType' | 'alt'
> & {
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'width' | 'height'>
    >;
    previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
  };

type Media_Model3d_Fragment = {__typename: 'Model3d'} & Pick<
  StorefrontAPI.Model3d,
  'id' | 'mediaContentType' | 'alt'
> & {
    sources: Array<Pick<StorefrontAPI.Model3dSource, 'mimeType' | 'url'>>;
    previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
  };

type Media_Video_Fragment = {__typename: 'Video'} & Pick<
  StorefrontAPI.Video,
  'id' | 'mediaContentType' | 'alt'
> & {
    sources: Array<Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>>;
    previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
  };

export type MediaFragment =
  | Media_ExternalVideo_Fragment
  | Media_MediaImage_Fragment
  | Media_Model3d_Fragment
  | Media_Video_Fragment;

export type ProductCardFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'title' | 'publishedAt' | 'handle' | 'vendor'
> & {
  variants: {
    nodes: Array<
      Pick<StorefrontAPI.ProductVariant, 'id'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
      }
    >;
  };
};

export type FeaturedCollectionDetailsFragment = Pick<
  StorefrontAPI.Collection,
  'id' | 'title' | 'handle'
> & {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'altText' | 'width' | 'height' | 'url'>
  >;
};

export type LayoutQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  headerMenuHandle: StorefrontAPI.Scalars['String'];
  footerMenuHandle: StorefrontAPI.Scalars['String'];
}>;

export type LayoutQuery = {
  shop: Pick<StorefrontAPI.Shop, 'id' | 'name' | 'description'> & {
    primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
    brand?: StorefrontAPI.Maybe<{
      logo?: StorefrontAPI.Maybe<{
        image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
      }>;
    }>;
  };
  headerMenu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
  footerMenu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type ShopFragment = Pick<
  StorefrontAPI.Shop,
  'id' | 'name' | 'description'
> & {
  primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
  brand?: StorefrontAPI.Maybe<{
    logo?: StorefrontAPI.Maybe<{
      image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
    }>;
  }>;
};

export type MenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ChildMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ParentMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    >
  >;
};

export type MenuFragment = Pick<StorefrontAPI.Menu, 'id'> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    > & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        >
      >;
    }
  >;
};

export type CartQueryQueryVariables = StorefrontAPI.Exact<{
  cartId: StorefrontAPI.Scalars['ID'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CartQueryQuery = {
  cart?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Cart,
      'id' | 'checkoutUrl' | 'totalQuantity' | 'note'
    > & {
      buyerIdentity: Pick<
        StorefrontAPI.CartBuyerIdentity,
        'countryCode' | 'email' | 'phone'
      > & {
        customer?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Customer,
            'id' | 'email' | 'firstName' | 'lastName' | 'displayName'
          >
        >;
      };
      lines: {
        edges: Array<{
          node: Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
            attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
            cost: {
              totalAmount: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
              amountPerQuantity: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
              compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
            };
            merchandise: Pick<
              StorefrontAPI.ProductVariant,
              'id' | 'availableForSale' | 'requiresShipping' | 'title'
            > & {
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'id' | 'url' | 'altText' | 'width' | 'height'
                >
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id'>;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
            };
          };
        }>;
      };
      cost: {
        subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
        totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
        totalDutyAmount?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
        totalTaxAmount?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
      };
      attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
      discountCodes: Array<Pick<StorefrontAPI.CartDiscountCode, 'code'>>;
    }
  >;
};

export type CartFragmentFragment = Pick<
  StorefrontAPI.Cart,
  'id' | 'checkoutUrl' | 'totalQuantity' | 'note'
> & {
  buyerIdentity: Pick<
    StorefrontAPI.CartBuyerIdentity,
    'countryCode' | 'email' | 'phone'
  > & {
    customer?: StorefrontAPI.Maybe<
      Pick<
        StorefrontAPI.Customer,
        'id' | 'email' | 'firstName' | 'lastName' | 'displayName'
      >
    >;
  };
  lines: {
    edges: Array<{
      node: Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
        attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
        cost: {
          totalAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          amountPerQuantity: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        merchandise: Pick<
          StorefrontAPI.ProductVariant,
          'id' | 'availableForSale' | 'requiresShipping' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
          image?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
        };
      };
    }>;
  };
  cost: {
    subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalDutyAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    totalTaxAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  discountCodes: Array<Pick<StorefrontAPI.CartDiscountCode, 'code'>>;
};

export type MoneyFragmentFragment = Pick<
  StorefrontAPI.MoneyV2,
  'currencyCode' | 'amount'
>;

export type ImageFragmentFragment = Pick<
  StorefrontAPI.Image,
  'id' | 'url' | 'altText' | 'width' | 'height'
>;

export type GetShopPrimaryDomainQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type GetShopPrimaryDomainQuery = {
  shop: {primaryDomain: Pick<StorefrontAPI.Domain, 'url'>};
};

export type CollectionContentFragment = Pick<
  StorefrontAPI.Collection,
  'id' | 'handle' | 'title' | 'descriptionHtml'
> & {
  heading?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  byline?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  cta?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  spread?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<
      | ({__typename: 'MediaImage'} & Pick<
          StorefrontAPI.MediaImage,
          'id' | 'mediaContentType' | 'alt'
        > & {
            image?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'id' | 'url' | 'width' | 'height'>
            >;
            previewImage?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'url'>
            >;
          })
      | ({__typename: 'Video'} & Pick<
          StorefrontAPI.Video,
          'id' | 'mediaContentType' | 'alt'
        > & {
            sources: Array<Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>>;
            previewImage?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'url'>
            >;
          })
    >;
  }>;
  spreadSecondary?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<
      | ({__typename: 'MediaImage'} & Pick<
          StorefrontAPI.MediaImage,
          'id' | 'mediaContentType' | 'alt'
        > & {
            image?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'id' | 'url' | 'width' | 'height'>
            >;
            previewImage?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'url'>
            >;
          })
      | ({__typename: 'Video'} & Pick<
          StorefrontAPI.Video,
          'id' | 'mediaContentType' | 'alt'
        > & {
            sources: Array<Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>>;
            previewImage?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'url'>
            >;
          })
    >;
  }>;
};

export type SeoCollectionContentQueryVariables = StorefrontAPI.Exact<{
  handle?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type SeoCollectionContentQuery = {
  hero?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Collection,
      'id' | 'handle' | 'title' | 'descriptionHtml'
    > & {
      heading?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      byline?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      cta?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      spread?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<
          | ({__typename: 'MediaImage'} & Pick<
              StorefrontAPI.MediaImage,
              'id' | 'mediaContentType' | 'alt'
            > & {
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'id' | 'url' | 'width' | 'height'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
          | ({__typename: 'Video'} & Pick<
              StorefrontAPI.Video,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<
                  Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
        >;
      }>;
      spreadSecondary?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<
          | ({__typename: 'MediaImage'} & Pick<
              StorefrontAPI.MediaImage,
              'id' | 'mediaContentType' | 'alt'
            > & {
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'id' | 'url' | 'width' | 'height'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
          | ({__typename: 'Video'} & Pick<
              StorefrontAPI.Video,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<
                  Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
        >;
      }>;
    }
  >;
  shop: Pick<StorefrontAPI.Shop, 'name' | 'description'>;
};

export type HeroCollectionContentQueryVariables = StorefrontAPI.Exact<{
  handle?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type HeroCollectionContentQuery = {
  hero?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Collection,
      'id' | 'handle' | 'title' | 'descriptionHtml'
    > & {
      heading?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      byline?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      cta?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      spread?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<
          | ({__typename: 'MediaImage'} & Pick<
              StorefrontAPI.MediaImage,
              'id' | 'mediaContentType' | 'alt'
            > & {
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'id' | 'url' | 'width' | 'height'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
          | ({__typename: 'Video'} & Pick<
              StorefrontAPI.Video,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<
                  Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
        >;
      }>;
      spreadSecondary?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<
          | ({__typename: 'MediaImage'} & Pick<
              StorefrontAPI.MediaImage,
              'id' | 'mediaContentType' | 'alt'
            > & {
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'id' | 'url' | 'width' | 'height'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
          | ({__typename: 'Video'} & Pick<
              StorefrontAPI.Video,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<
                  Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
        >;
      }>;
    }
  >;
};

export type HomepageFeaturedProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type HomepageFeaturedProductsQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'publishedAt' | 'handle' | 'vendor'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
  };
};

export type HomepageFeaturedCollectionsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type HomepageFeaturedCollectionsQuery = {
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'altText' | 'width' | 'height' | 'url'>
        >;
      }
    >;
  };
};

export type CustomerActivateMutationVariables = StorefrontAPI.Exact<{
  id: StorefrontAPI.Scalars['ID'];
  input: StorefrontAPI.CustomerActivateInput;
}>;

export type CustomerActivateMutation = {
  customerActivate?: StorefrontAPI.Maybe<{
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAddressUpdateMutationVariables = StorefrontAPI.Exact<{
  address: StorefrontAPI.MailingAddressInput;
  customerAccessToken: StorefrontAPI.Scalars['String'];
  id: StorefrontAPI.Scalars['ID'];
}>;

export type CustomerAddressUpdateMutation = {
  customerAddressUpdate?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAddressDeleteMutationVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String'];
  id: StorefrontAPI.Scalars['ID'];
}>;

export type CustomerAddressDeleteMutation = {
  customerAddressDelete?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.CustomerAddressDeletePayload,
      'deletedCustomerAddressId'
    > & {
      customerUserErrors: Array<
        Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
      >;
    }
  >;
};

export type CustomerDefaultAddressUpdateMutationVariables =
  StorefrontAPI.Exact<{
    addressId: StorefrontAPI.Scalars['ID'];
    customerAccessToken: StorefrontAPI.Scalars['String'];
  }>;

export type CustomerDefaultAddressUpdateMutation = {
  customerDefaultAddressUpdate?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAddressCreateMutationVariables = StorefrontAPI.Exact<{
  address: StorefrontAPI.MailingAddressInput;
  customerAccessToken: StorefrontAPI.Scalars['String'];
}>;

export type CustomerAddressCreateMutation = {
  customerAddressCreate?: StorefrontAPI.Maybe<{
    customerAddress?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MailingAddress, 'id'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerUpdateMutationVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String'];
  customer: StorefrontAPI.CustomerUpdateInput;
}>;

export type CustomerUpdateMutation = {
  customerUpdate?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAccessTokenCreateMutationVariables = StorefrontAPI.Exact<{
  input: StorefrontAPI.CustomerAccessTokenCreateInput;
}>;

export type CustomerAccessTokenCreateMutation = {
  customerAccessTokenCreate?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
  }>;
};

export type MoneyFragment = Pick<
  StorefrontAPI.MoneyV2,
  'amount' | 'currencyCode'
>;

export type AddressFullFragment = Pick<
  StorefrontAPI.MailingAddress,
  | 'address1'
  | 'address2'
  | 'city'
  | 'company'
  | 'country'
  | 'countryCodeV2'
  | 'firstName'
  | 'formatted'
  | 'id'
  | 'lastName'
  | 'name'
  | 'phone'
  | 'province'
  | 'provinceCode'
  | 'zip'
>;

export type DiscountApplicationFragment = {
  value:
    | ({__typename: 'MoneyV2'} & Pick<
        StorefrontAPI.MoneyV2,
        'amount' | 'currencyCode'
      >)
    | ({__typename: 'PricingPercentageValue'} & Pick<
        StorefrontAPI.PricingPercentageValue,
        'percentage'
      >);
};

export type ImageFragment = Pick<
  StorefrontAPI.Image,
  'altText' | 'height' | 'id' | 'width'
> & {src: StorefrontAPI.Image['url']};

export type ProductVariantFragment = Pick<
  StorefrontAPI.ProductVariant,
  'id' | 'sku' | 'title'
> & {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'altText' | 'height' | 'id' | 'width'> & {
      src: StorefrontAPI.Image['url'];
    }
  >;
  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  product: Pick<StorefrontAPI.Product, 'handle'>;
};

export type LineItemFullFragment = Pick<
  StorefrontAPI.OrderLineItem,
  'title' | 'quantity'
> & {
  discountAllocations: Array<{
    allocatedAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    discountApplication: {
      value:
        | ({__typename: 'MoneyV2'} & Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >)
        | ({__typename: 'PricingPercentageValue'} & Pick<
            StorefrontAPI.PricingPercentageValue,
            'percentage'
          >);
    };
  }>;
  originalTotalPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  discountedTotalPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  variant?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.ProductVariant, 'id' | 'sku' | 'title'> & {
      image?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Image, 'altText' | 'height' | 'id' | 'width'> & {
          src: StorefrontAPI.Image['url'];
        }
      >;
      price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      product: Pick<StorefrontAPI.Product, 'handle'>;
    }
  >;
};

export type CustomerOrderQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  orderId: StorefrontAPI.Scalars['ID'];
}>;

export type CustomerOrderQuery = {
  node?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Order,
      'id' | 'name' | 'orderNumber' | 'processedAt' | 'fulfillmentStatus'
    > & {
      totalTaxV2?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      totalPriceV2: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      subtotalPriceV2?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      shippingAddress?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.MailingAddress,
          | 'address1'
          | 'address2'
          | 'city'
          | 'company'
          | 'country'
          | 'countryCodeV2'
          | 'firstName'
          | 'formatted'
          | 'id'
          | 'lastName'
          | 'name'
          | 'phone'
          | 'province'
          | 'provinceCode'
          | 'zip'
        >
      >;
      discountApplications: {
        nodes: Array<{
          value:
            | ({__typename: 'MoneyV2'} & Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >)
            | ({__typename: 'PricingPercentageValue'} & Pick<
                StorefrontAPI.PricingPercentageValue,
                'percentage'
              >);
        }>;
      };
      lineItems: {
        nodes: Array<
          Pick<StorefrontAPI.OrderLineItem, 'title' | 'quantity'> & {
            discountAllocations: Array<{
              allocatedAmount: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
              discountApplication: {
                value:
                  | ({__typename: 'MoneyV2'} & Pick<
                      StorefrontAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >)
                  | ({__typename: 'PricingPercentageValue'} & Pick<
                      StorefrontAPI.PricingPercentageValue,
                      'percentage'
                    >);
              };
            }>;
            originalTotalPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            discountedTotalPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            variant?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'sku' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'altText' | 'height' | 'id' | 'width'
                  > & {src: StorefrontAPI.Image['url']}
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                product: Pick<StorefrontAPI.Product, 'handle'>;
              }
            >;
          }
        >;
      };
    }
  >;
};

export type CustomerRecoverMutationVariables = StorefrontAPI.Exact<{
  email: StorefrontAPI.Scalars['String'];
}>;

export type CustomerRecoverMutation = {
  customerRecover?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerCreateMutationVariables = StorefrontAPI.Exact<{
  input: StorefrontAPI.CustomerCreateInput;
}>;

export type CustomerCreateMutation = {
  customerCreate?: StorefrontAPI.Maybe<{
    customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id'>>;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerResetMutationVariables = StorefrontAPI.Exact<{
  id: StorefrontAPI.Scalars['ID'];
  input: StorefrontAPI.CustomerResetInput;
}>;

export type CustomerResetMutation = {
  customerReset?: StorefrontAPI.Maybe<{
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerDetailsQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CustomerDetailsQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Customer,
      'firstName' | 'lastName' | 'phone' | 'email'
    > & {
      defaultAddress?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.MailingAddress,
          | 'id'
          | 'formatted'
          | 'firstName'
          | 'lastName'
          | 'company'
          | 'address1'
          | 'address2'
          | 'country'
          | 'province'
          | 'city'
          | 'zip'
          | 'phone'
        >
      >;
      addresses: {
        edges: Array<{
          node: Pick<
            StorefrontAPI.MailingAddress,
            | 'id'
            | 'formatted'
            | 'firstName'
            | 'lastName'
            | 'company'
            | 'address1'
            | 'address2'
            | 'country'
            | 'province'
            | 'city'
            | 'zip'
            | 'phone'
          >;
        }>;
      };
      orders: {
        edges: Array<{
          node: Pick<
            StorefrontAPI.Order,
            | 'id'
            | 'orderNumber'
            | 'processedAt'
            | 'financialStatus'
            | 'fulfillmentStatus'
          > & {
            currentTotalPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            lineItems: {
              edges: Array<{
                node: Pick<StorefrontAPI.OrderLineItem, 'title'> & {
                  variant?: StorefrontAPI.Maybe<{
                    image?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.Image,
                        'url' | 'altText' | 'height' | 'width'
                      >
                    >;
                  }>;
                };
              }>;
            };
          };
        }>;
      };
    }
  >;
};

export type AddressPartialFragment = Pick<
  StorefrontAPI.MailingAddress,
  | 'id'
  | 'formatted'
  | 'firstName'
  | 'lastName'
  | 'company'
  | 'address1'
  | 'address2'
  | 'country'
  | 'province'
  | 'city'
  | 'zip'
  | 'phone'
>;

export type CustomerDetailsFragment = Pick<
  StorefrontAPI.Customer,
  'firstName' | 'lastName' | 'phone' | 'email'
> & {
  defaultAddress?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.MailingAddress,
      | 'id'
      | 'formatted'
      | 'firstName'
      | 'lastName'
      | 'company'
      | 'address1'
      | 'address2'
      | 'country'
      | 'province'
      | 'city'
      | 'zip'
      | 'phone'
    >
  >;
  addresses: {
    edges: Array<{
      node: Pick<
        StorefrontAPI.MailingAddress,
        | 'id'
        | 'formatted'
        | 'firstName'
        | 'lastName'
        | 'company'
        | 'address1'
        | 'address2'
        | 'country'
        | 'province'
        | 'city'
        | 'zip'
        | 'phone'
      >;
    }>;
  };
  orders: {
    edges: Array<{
      node: Pick<
        StorefrontAPI.Order,
        | 'id'
        | 'orderNumber'
        | 'processedAt'
        | 'financialStatus'
        | 'fulfillmentStatus'
      > & {
        currentTotalPrice: Pick<
          StorefrontAPI.MoneyV2,
          'amount' | 'currencyCode'
        >;
        lineItems: {
          edges: Array<{
            node: Pick<StorefrontAPI.OrderLineItem, 'title'> & {
              variant?: StorefrontAPI.Maybe<{
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'height' | 'width'
                  >
                >;
              }>;
            };
          }>;
        };
      };
    }>;
  };
};

export type ApiAllProductsQueryVariables = StorefrontAPI.Exact<{
  query?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
  count?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.ProductSortKeys>;
}>;

export type ApiAllProductsQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'publishedAt' | 'handle' | 'vendor'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
  };
};

export type ErrorFragmentFragment = Pick<
  StorefrontAPI.CartUserError,
  'message' | 'field' | 'code'
>;

export type CartLinesFragmentFragment = Pick<
  StorefrontAPI.Cart,
  'id' | 'totalQuantity'
>;

export type CartDiscountCodesUpdateMutationVariables = StorefrontAPI.Exact<{
  cartId: StorefrontAPI.Scalars['ID'];
  discountCodes?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.Scalars['String']> | StorefrontAPI.Scalars['String']
  >;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
}>;

export type CartDiscountCodesUpdateMutation = {
  cartDiscountCodesUpdate?: StorefrontAPI.Maybe<{
    cart?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Cart, 'id'> & {
        discountCodes: Array<Pick<StorefrontAPI.CartDiscountCode, 'code'>>;
      }
    >;
    errors: Array<Pick<StorefrontAPI.CartUserError, 'field' | 'message'>>;
  }>;
};

export type CollectionDetailsQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  filters?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.ProductFilter> | StorefrontAPI.ProductFilter
  >;
  sortKey: StorefrontAPI.ProductCollectionSortKeys;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  startCursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
  endCursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
}>;

export type CollectionDetailsQuery = {
  collection?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Collection,
      'id' | 'handle' | 'title' | 'description'
    > & {
      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
      image?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Image, 'id' | 'url' | 'width' | 'height' | 'altText'>
      >;
      products: {
        filters: Array<
          Pick<StorefrontAPI.Filter, 'id' | 'label' | 'type'> & {
            values: Array<
              Pick<
                StorefrontAPI.FilterValue,
                'id' | 'label' | 'count' | 'input'
              >
            >;
          }
        >;
        nodes: Array<
          Pick<
            StorefrontAPI.Product,
            'id' | 'title' | 'publishedAt' | 'handle' | 'vendor'
          > & {
            variants: {
              nodes: Array<
                Pick<StorefrontAPI.ProductVariant, 'id'> & {
                  image?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<
                    Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                  >;
                  product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
                }
              >;
            };
          }
        >;
        pageInfo: Pick<
          StorefrontAPI.PageInfo,
          'hasPreviousPage' | 'hasNextPage' | 'endCursor'
        >;
      };
    }
  >;
  collections: {
    edges: Array<{node: Pick<StorefrontAPI.Collection, 'title' | 'handle'>}>;
  };
};

export type CollectionsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  startCursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
  endCursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
}>;

export type CollectionsQuery = {
  collections: {
    nodes: Array<
      Pick<
        StorefrontAPI.Collection,
        'id' | 'title' | 'description' | 'handle'
      > & {
        seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'width' | 'height' | 'altText'
          >
        >;
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
    >;
  };
};

export type FeaturedItemsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  pageBy?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
}>;

export type FeaturedItemsQuery = {
  featuredCollections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'altText' | 'width' | 'height' | 'url'>
        >;
      }
    >;
  };
  featuredProducts: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'publishedAt' | 'handle' | 'vendor'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
  };
};

export type ArticleDetailsQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  blogHandle: StorefrontAPI.Scalars['String'];
  articleHandle: StorefrontAPI.Scalars['String'];
}>;

export type ArticleDetailsQuery = {
  blog?: StorefrontAPI.Maybe<{
    articleByHandle?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Article, 'title' | 'contentHtml' | 'publishedAt'> & {
        author?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ArticleAuthor, 'name'>>;
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        seo?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Seo, 'description' | 'title'>
        >;
      }
    >;
  }>;
};

export type BlogQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  blogHandle: StorefrontAPI.Scalars['String'];
  pageBy: StorefrontAPI.Scalars['Int'];
  cursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
}>;

export type BlogQuery = {
  blog?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Blog, 'title'> & {
      seo?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Seo, 'title' | 'description'>
      >;
      articles: {
        edges: Array<{
          node: Pick<
            StorefrontAPI.Article,
            'contentHtml' | 'handle' | 'id' | 'publishedAt' | 'title'
          > & {
            author?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ArticleAuthor, 'name'>
            >;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'altText' | 'url' | 'width' | 'height'
              >
            >;
          };
        }>;
      };
    }
  >;
};

export type ArticleFragment = Pick<
  StorefrontAPI.Article,
  'contentHtml' | 'handle' | 'id' | 'publishedAt' | 'title'
> & {
  author?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ArticleAuthor, 'name'>>;
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
};

export type PageDetailsQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  handle: StorefrontAPI.Scalars['String'];
}>;

export type PageDetailsQuery = {
  page?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Page, 'id' | 'title' | 'body'> & {
      seo?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Seo, 'description' | 'title'>
      >;
    }
  >;
};

export type PolicyHandleFragment = Pick<
  StorefrontAPI.ShopPolicy,
  'body' | 'handle' | 'id' | 'title' | 'url'
>;

export type PoliciesHandleQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  privacyPolicy: StorefrontAPI.Scalars['Boolean'];
  shippingPolicy: StorefrontAPI.Scalars['Boolean'];
  termsOfService: StorefrontAPI.Scalars['Boolean'];
  refundPolicy: StorefrontAPI.Scalars['Boolean'];
}>;

export type PoliciesHandleQuery = {
  shop: {
    privacyPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    shippingPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    termsOfService?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    refundPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
  };
};

export type PolicyIndexFragment = Pick<
  StorefrontAPI.ShopPolicy,
  'id' | 'title' | 'handle'
>;

export type PoliciesIndexQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type PoliciesIndexQuery = {
  shop: {
    privacyPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    shippingPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    termsOfService?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    refundPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    subscriptionPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicyWithDefault, 'id' | 'title' | 'handle'>
    >;
  };
};

export type ProductVariantFragmentFragment = Pick<
  StorefrontAPI.ProductVariant,
  'id' | 'availableForSale' | 'sku' | 'title'
> & {
  selectedOptions: Array<Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>>;
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  compareAtPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  unitPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
};

export type ProductQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  handle: StorefrontAPI.Scalars['String'];
  selectedOptions:
    | Array<StorefrontAPI.SelectedOptionInput>
    | StorefrontAPI.SelectedOptionInput;
}>;

export type ProductQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Product,
      'id' | 'title' | 'vendor' | 'handle' | 'descriptionHtml' | 'description'
    > & {
      options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>;
      selectedVariant?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.ProductVariant,
          'id' | 'availableForSale' | 'sku' | 'title'
        > & {
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          image?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
        }
      >;
      media: {
        nodes: Array<
          | ({__typename: 'ExternalVideo'} & Pick<
              StorefrontAPI.ExternalVideo,
              'id' | 'embedUrl' | 'host' | 'mediaContentType' | 'alt'
            > & {
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
          | ({__typename: 'MediaImage'} & Pick<
              StorefrontAPI.MediaImage,
              'id' | 'mediaContentType' | 'alt'
            > & {
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'id' | 'url' | 'width' | 'height'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
          | ({__typename: 'Model3d'} & Pick<
              StorefrontAPI.Model3d,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<
                  Pick<StorefrontAPI.Model3dSource, 'mimeType' | 'url'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
          | ({__typename: 'Video'} & Pick<
              StorefrontAPI.Video,
              'id' | 'mediaContentType' | 'alt'
            > & {
                sources: Array<
                  Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>
                >;
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              })
        >;
      };
      variants: {
        nodes: Array<
          Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'availableForSale' | 'sku' | 'title'
          > & {
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            unitPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
          }
        >;
      };
      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
    }
  >;
  shop: Pick<StorefrontAPI.Shop, 'name'> & {
    primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
    shippingPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle'>
    >;
    refundPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle'>
    >;
  };
};

export type ProductRecommendationsQueryVariables = StorefrontAPI.Exact<{
  productId: StorefrontAPI.Scalars['ID'];
  count?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type ProductRecommendationsQuery = {
  recommended?: StorefrontAPI.Maybe<
    Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'publishedAt' | 'handle' | 'vendor'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >
  >;
  additional: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'publishedAt' | 'handle' | 'vendor'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
  };
};

export type AllProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  startCursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
  endCursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
}>;

export type AllProductsQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'publishedAt' | 'handle' | 'vendor'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
    >;
  };
};

export type PaginatedProductsSearchQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  endCursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  searchTerm?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
  startCursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']>;
}>;

export type PaginatedProductsSearchQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'publishedAt' | 'handle' | 'vendor'
      > & {
        variants: {
          nodes: Array<
            Pick<StorefrontAPI.ProductVariant, 'id'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              product: Pick<StorefrontAPI.Product, 'handle' | 'title'>;
            }
          >;
        };
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'startCursor' | 'endCursor' | 'hasNextPage' | 'hasPreviousPage'
    >;
  };
};

export type SitemapsQueryVariables = StorefrontAPI.Exact<{
  urlLimits?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type SitemapsQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        'updatedAt' | 'handle' | 'onlineStoreUrl' | 'title'
      > & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText'>
        >;
      }
    >;
  };
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'updatedAt' | 'handle' | 'onlineStoreUrl'>
    >;
  };
  pages: {
    nodes: Array<
      Pick<StorefrontAPI.Page, 'updatedAt' | 'handle' | 'onlineStoreUrl'>
    >;
  };
};

interface GeneratedQueryTypes {
  '#graphql\n  query layout(\n    $language: LanguageCode\n    $headerMenuHandle: String!\n    $footerMenuHandle: String!\n  ) @inContext(language: $language) {\n    shop {\n      ...Shop\n    }\n    headerMenu: menu(handle: $headerMenuHandle) {\n      ...Menu\n    }\n    footerMenu: menu(handle: $footerMenuHandle) {\n      ...Menu\n    }\n  }\n  fragment Shop on Shop {\n    id\n    name\n    description\n    primaryDomain {\n      url\n    }\n    brand {\n      logo {\n        image {\n          url\n        }\n      }\n    }\n  }\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n': {
    return: LayoutQuery;
    variables: LayoutQueryVariables;
  };
  '#graphql\n  query cartQuery($cartId: ID!, $country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    cart(id: $cartId) {\n      ...CartFragment\n    }\n  }\n  fragment CartFragment on Cart {\n    id\n    checkoutUrl\n    totalQuantity\n    buyerIdentity {\n      countryCode\n      customer {\n        id\n        email\n        firstName\n        lastName\n        displayName\n      }\n      email\n      phone\n    }\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n          attributes {\n            key\n            value\n          }\n          cost {\n            totalAmount {\n              amount\n              currencyCode\n            }\n            amountPerQuantity {\n              amount\n              currencyCode\n            }\n            compareAtAmountPerQuantity {\n              amount\n              currencyCode\n            }\n          }\n          merchandise {\n            ... on ProductVariant {\n              id\n              availableForSale\n              compareAtPrice {\n                ...MoneyFragment\n              }\n              price {\n                ...MoneyFragment\n              }\n              requiresShipping\n              title\n              image {\n                ...ImageFragment\n              }\n              product {\n                handle\n                title\n                id\n              }\n              selectedOptions {\n                name\n                value\n              }\n            }\n          }\n        }\n      }\n    }\n    cost {\n      subtotalAmount {\n        ...MoneyFragment\n      }\n      totalAmount {\n        ...MoneyFragment\n      }\n      totalDutyAmount {\n        ...MoneyFragment\n      }\n      totalTaxAmount {\n        ...MoneyFragment\n      }\n    }\n    note\n    attributes {\n      key\n      value\n    }\n    discountCodes {\n      code\n    }\n  }\n\n  fragment MoneyFragment on MoneyV2 {\n    currencyCode\n    amount\n  }\n\n  fragment ImageFragment on Image {\n    id\n    url\n    altText\n    width\n    height\n  }\n': {
    return: CartQueryQuery;
    variables: CartQueryQueryVariables;
  };
  '#graphql\n      query getShopPrimaryDomain { shop { primaryDomain { url } } }\n    ': {
    return: GetShopPrimaryDomainQuery;
    variables: GetShopPrimaryDomainQueryVariables;
  };
  '#graphql\n  query seoCollectionContent($handle: String, $country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    hero: collection(handle: $handle) {\n      ...CollectionContent\n    }\n    shop {\n      name\n      description\n    }\n  }\n  #graphql\n  fragment CollectionContent on Collection {\n    id\n    handle\n    title\n    descriptionHtml\n    heading: metafield(namespace: "hero", key: "title") {\n      value\n    }\n    byline: metafield(namespace: "hero", key: "byline") {\n      value\n    }\n    cta: metafield(namespace: "hero", key: "cta") {\n      value\n    }\n    spread: metafield(namespace: "hero", key: "spread") {\n      reference {\n        ...Media\n      }\n    }\n    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {\n      reference {\n        ...Media\n      }\n    }\n  }\n  #graphql\n  fragment Media on Media {\n    __typename\n    mediaContentType\n    alt\n    previewImage {\n      url\n    }\n    ... on MediaImage {\n      id\n      image {\n        id\n        url\n        width\n        height\n      }\n    }\n    ... on Video {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on Model3d {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on ExternalVideo {\n      id\n      embedUrl\n      host\n    }\n  }\n\n\n': {
    return: SeoCollectionContentQuery;
    variables: SeoCollectionContentQueryVariables;
  };
  '#graphql\n  query heroCollectionContent($handle: String, $country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    hero: collection(handle: $handle) {\n      ...CollectionContent\n    }\n  }\n  #graphql\n  fragment CollectionContent on Collection {\n    id\n    handle\n    title\n    descriptionHtml\n    heading: metafield(namespace: "hero", key: "title") {\n      value\n    }\n    byline: metafield(namespace: "hero", key: "byline") {\n      value\n    }\n    cta: metafield(namespace: "hero", key: "cta") {\n      value\n    }\n    spread: metafield(namespace: "hero", key: "spread") {\n      reference {\n        ...Media\n      }\n    }\n    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {\n      reference {\n        ...Media\n      }\n    }\n  }\n  #graphql\n  fragment Media on Media {\n    __typename\n    mediaContentType\n    alt\n    previewImage {\n      url\n    }\n    ... on MediaImage {\n      id\n      image {\n        id\n        url\n        width\n        height\n      }\n    }\n    ... on Video {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on Model3d {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on ExternalVideo {\n      id\n      embedUrl\n      host\n    }\n  }\n\n\n': {
    return: HeroCollectionContentQuery;
    variables: HeroCollectionContentQueryVariables;
  };
  '#graphql\n  query homepageFeaturedProducts($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    products(first: 8) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    vendor\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: HomepageFeaturedProductsQuery;
    variables: HomepageFeaturedProductsQueryVariables;
  };
  '#graphql\n  query homepageFeaturedCollections($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    collections(\n      first: 4,\n      sortKey: UPDATED_AT\n    ) {\n      nodes {\n        id\n        title\n        handle\n        image {\n          altText\n          width\n          height\n          url\n        }\n      }\n    }\n  }\n': {
    return: HomepageFeaturedCollectionsQuery;
    variables: HomepageFeaturedCollectionsQueryVariables;
  };
  '#graphql\n  fragment Money on MoneyV2 {\n    amount\n    currencyCode\n  }\n  fragment AddressFull on MailingAddress {\n    address1\n    address2\n    city\n    company\n    country\n    countryCodeV2\n    firstName\n    formatted\n    id\n    lastName\n    name\n    phone\n    province\n    provinceCode\n    zip\n  }\n  fragment DiscountApplication on DiscountApplication {\n    value {\n      __typename\n      ... on MoneyV2 {\n        amount\n        currencyCode\n      }\n      ... on PricingPercentageValue {\n        percentage\n      }\n    }\n  }\n  fragment Image on Image {\n    altText\n    height\n    src: url(transform: {crop: CENTER, maxHeight: 96, maxWidth: 96, scale: 2})\n    id\n    width\n  }\n  fragment ProductVariant on ProductVariant {\n    id\n    image {\n      ...Image\n    }\n    price {\n      ...Money\n    }\n    product {\n      handle\n    }\n    sku\n    title\n  }\n  fragment LineItemFull on OrderLineItem {\n    title\n    quantity\n    discountAllocations {\n      allocatedAmount {\n        ...Money\n      }\n      discountApplication {\n        ...DiscountApplication\n      }\n    }\n    originalTotalPrice {\n      ...Money\n    }\n    discountedTotalPrice {\n      ...Money\n    }\n    variant {\n      ...ProductVariant\n    }\n  }\n\n  query CustomerOrder(\n    $country: CountryCode\n    $language: LanguageCode\n    $orderId: ID!\n  ) @inContext(country: $country, language: $language) {\n    node(id: $orderId) {\n      ... on Order {\n        id\n        name\n        orderNumber\n        processedAt\n        fulfillmentStatus\n        totalTaxV2 {\n          ...Money\n        }\n        totalPriceV2 {\n          ...Money\n        }\n        subtotalPriceV2 {\n          ...Money\n        }\n        shippingAddress {\n          ...AddressFull\n        }\n        discountApplications(first: 100) {\n          nodes {\n            ...DiscountApplication\n          }\n        }\n        lineItems(first: 100) {\n          nodes {\n            ...LineItemFull\n          }\n        }\n      }\n    }\n  }\n': {
    return: CustomerOrderQuery;
    variables: CustomerOrderQueryVariables;
  };
  '#graphql\n  query CustomerDetails(\n    $customerAccessToken: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customer(customerAccessToken: $customerAccessToken) {\n      ...CustomerDetails\n    }\n  }\n\n  fragment AddressPartial on MailingAddress {\n    id\n    formatted\n    firstName\n    lastName\n    company\n    address1\n    address2\n    country\n    province\n    city\n    zip\n    phone\n  }\n\n  fragment CustomerDetails on Customer {\n    firstName\n    lastName\n    phone\n    email\n    defaultAddress {\n      ...AddressPartial\n    }\n    addresses(first: 6) {\n      edges {\n        node {\n          ...AddressPartial\n        }\n      }\n    }\n    orders(first: 250, sortKey: PROCESSED_AT, reverse: true) {\n      edges {\n        node {\n          ...OrderCard\n        }\n      }\n    }\n  }\n\n  #graphql\n  fragment OrderCard on Order {\n    id\n    orderNumber\n    processedAt\n    financialStatus\n    fulfillmentStatus\n    currentTotalPrice {\n      amount\n      currencyCode\n    }\n    lineItems(first: 2) {\n      edges {\n        node {\n          variant {\n            image {\n              url\n              altText\n              height\n              width\n            }\n          }\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: CustomerDetailsQuery;
    variables: CustomerDetailsQueryVariables;
  };
  '#graphql\n  query ApiAllProducts(\n    $query: String\n    $count: Int\n    $reverse: Boolean\n    $country: CountryCode\n    $language: LanguageCode\n    $sortKey: ProductSortKeys\n  ) @inContext(country: $country, language: $language) {\n    products(first: $count, sortKey: $sortKey, reverse: $reverse, query: $query) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    vendor\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: ApiAllProductsQuery;
    variables: ApiAllProductsQueryVariables;
  };
  '#graphql\n  query CollectionDetails(\n    $handle: String!\n    $country: CountryCode\n    $language: LanguageCode\n    $filters: [ProductFilter!]\n    $sortKey: ProductCollectionSortKeys!\n    $reverse: Boolean\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      description\n      seo {\n        description\n        title\n      }\n      image {\n        id\n        url\n        width\n        height\n        altText\n      }\n      products(\n        first: $first,\n        last: $last,\n        before: $startCursor,\n        after: $endCursor,\n        filters: $filters,\n        sortKey: $sortKey,\n        reverse: $reverse\n      ) {\n        filters {\n          id\n          label\n          type\n          values {\n            id\n            label\n            count\n            input\n          }\n        }\n        nodes {\n          ...ProductCard\n        }\n        pageInfo {\n          hasPreviousPage\n          hasNextPage\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n    collections(first: 100) {\n      edges {\n        node {\n          title\n          handle\n        }\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    vendor\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: CollectionDetailsQuery;
    variables: CollectionDetailsQueryVariables;
  };
  '#graphql\n  query Collections(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collections(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n      nodes {\n        id\n        title\n        description\n        handle\n        seo {\n          description\n          title\n        }\n        image {\n          id\n          url\n          width\n          height\n          altText\n        }\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n': {
    return: CollectionsQuery;
    variables: CollectionsQueryVariables;
  };
  '#graphql\n  query FeaturedItems(\n    $country: CountryCode\n    $language: LanguageCode\n    $pageBy: Int = 12\n  ) @inContext(country: $country, language: $language) {\n    featuredCollections: collections(first: 3, sortKey: UPDATED_AT) {\n      nodes {\n        ...FeaturedCollectionDetails\n      }\n    }\n    featuredProducts: products(first: $pageBy) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    vendor\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n  #graphql\n  fragment FeaturedCollectionDetails on Collection {\n    id\n    title\n    handle\n    image {\n      altText\n      width\n      height\n      url\n    }\n  }\n\n': {
    return: FeaturedItemsQuery;
    variables: FeaturedItemsQueryVariables;
  };
  '#graphql\n  query ArticleDetails(\n    $language: LanguageCode\n    $blogHandle: String!\n    $articleHandle: String!\n  ) @inContext(language: $language) {\n    blog(handle: $blogHandle) {\n      articleByHandle(handle: $articleHandle) {\n        title\n        contentHtml\n        publishedAt\n        author: authorV2 {\n          name\n        }\n        image {\n          id\n          altText\n          url\n          width\n          height\n        }\n        seo {\n          description\n          title\n        }\n      }\n    }\n  }\n': {
    return: ArticleDetailsQuery;
    variables: ArticleDetailsQueryVariables;
  };
  '#graphql\nquery Blog(\n  $language: LanguageCode\n  $blogHandle: String!\n  $pageBy: Int!\n  $cursor: String\n) @inContext(language: $language) {\n  blog(handle: $blogHandle) {\n    title\n    seo {\n      title\n      description\n    }\n    articles(first: $pageBy, after: $cursor) {\n      edges {\n        node {\n          ...Article\n        }\n      }\n    }\n  }\n}\n\nfragment Article on Article {\n  author: authorV2 {\n    name\n  }\n  contentHtml\n  handle\n  id\n  image {\n    id\n    altText\n    url\n    width\n    height\n  }\n  publishedAt\n  title\n}\n': {
    return: BlogQuery;
    variables: BlogQueryVariables;
  };
  '#graphql\n  query PageDetails($language: LanguageCode, $handle: String!)\n  @inContext(language: $language) {\n    page(handle: $handle) {\n      id\n      title\n      body\n      seo {\n        description\n        title\n      }\n    }\n  }\n': {
    return: PageDetailsQuery;
    variables: PageDetailsQueryVariables;
  };
  '#graphql\n  fragment PolicyHandle on ShopPolicy {\n    body\n    handle\n    id\n    title\n    url\n  }\n\n  query PoliciesHandle(\n    $language: LanguageCode\n    $privacyPolicy: Boolean!\n    $shippingPolicy: Boolean!\n    $termsOfService: Boolean!\n    $refundPolicy: Boolean!\n  ) @inContext(language: $language) {\n    shop {\n      privacyPolicy @include(if: $privacyPolicy) {\n        ...PolicyHandle\n      }\n      shippingPolicy @include(if: $shippingPolicy) {\n        ...PolicyHandle\n      }\n      termsOfService @include(if: $termsOfService) {\n        ...PolicyHandle\n      }\n      refundPolicy @include(if: $refundPolicy) {\n        ...PolicyHandle\n      }\n    }\n  }\n': {
    return: PoliciesHandleQuery;
    variables: PoliciesHandleQueryVariables;
  };
  '#graphql\n  fragment PolicyIndex on ShopPolicy {\n    id\n    title\n    handle\n  }\n\n  query PoliciesIndex {\n    shop {\n      privacyPolicy {\n        ...PolicyIndex\n      }\n      shippingPolicy {\n        ...PolicyIndex\n      }\n      termsOfService {\n        ...PolicyIndex\n      }\n      refundPolicy {\n        ...PolicyIndex\n      }\n      subscriptionPolicy {\n        id\n        title\n        handle\n      }\n    }\n  }\n': {
    return: PoliciesIndexQuery;
    variables: PoliciesIndexQueryVariables;
  };
  '#graphql\n  query Product(\n    $country: CountryCode\n    $language: LanguageCode\n    $handle: String!\n    $selectedOptions: [SelectedOptionInput!]!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      id\n      title\n      vendor\n      handle\n      descriptionHtml\n      description\n      options {\n        name\n        values\n      }\n      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {\n        ...ProductVariantFragment\n      }\n      media(first: 7) {\n        nodes {\n          ...Media\n        }\n      }\n      variants(first: 1) {\n        nodes {\n          ...ProductVariantFragment\n        }\n      }\n      seo {\n        description\n        title\n      }\n    }\n    shop {\n      name\n      primaryDomain {\n        url\n      }\n      shippingPolicy {\n        body\n        handle\n      }\n      refundPolicy {\n        body\n        handle\n      }\n    }\n  }\n  #graphql\n  fragment Media on Media {\n    __typename\n    mediaContentType\n    alt\n    previewImage {\n      url\n    }\n    ... on MediaImage {\n      id\n      image {\n        id\n        url\n        width\n        height\n      }\n    }\n    ... on Video {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on Model3d {\n      id\n      sources {\n        mimeType\n        url\n      }\n    }\n    ... on ExternalVideo {\n      id\n      embedUrl\n      host\n    }\n  }\n\n  #graphql\n  fragment ProductVariantFragment on ProductVariant {\n    id\n    availableForSale\n    selectedOptions {\n      name\n      value\n    }\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n': {
    return: ProductQuery;
    variables: ProductQueryVariables;
  };
  '#graphql\n  query productRecommendations(\n    $productId: ID!\n    $count: Int\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    recommended: productRecommendations(productId: $productId) {\n      ...ProductCard\n    }\n    additional: products(first: $count, sortKey: BEST_SELLING) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    vendor\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: ProductRecommendationsQuery;
    variables: ProductRecommendationsQueryVariables;
  };
  '#graphql\n  query AllProducts(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n      nodes {\n        ...ProductCard\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    vendor\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: AllProductsQuery;
    variables: AllProductsQueryVariables;
  };
  '#graphql\n  query PaginatedProductsSearch(\n    $country: CountryCode\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $searchTerm: String\n    $startCursor: String\n  ) @inContext(country: $country, language: $language) {\n    products(\n      first: $first,\n      last: $last,\n      before: $startCursor,\n      after: $endCursor,\n      sortKey: RELEVANCE,\n      query: $searchTerm\n    ) {\n      nodes {\n        ...ProductCard\n      }\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n    }\n  }\n\n  #graphql\n  fragment ProductCard on Product {\n    id\n    title\n    publishedAt\n    handle\n    vendor\n    variants(first: 1) {\n      nodes {\n        id\n        image {\n          url\n          altText\n          width\n          height\n        }\n        price {\n          amount\n          currencyCode\n        }\n        compareAtPrice {\n          amount\n          currencyCode\n        }\n        selectedOptions {\n          name\n          value\n        }\n        product {\n          handle\n          title\n        }\n      }\n    }\n  }\n\n': {
    return: PaginatedProductsSearchQuery;
    variables: PaginatedProductsSearchQueryVariables;
  };
  '#graphql\n  query sitemaps($urlLimits: Int, $language: LanguageCode)\n  @inContext(language: $language) {\n    products(\n      first: $urlLimits\n      query: "published_status:\'online_store:visible\'"\n    ) {\n      nodes {\n        updatedAt\n        handle\n        onlineStoreUrl\n        title\n        featuredImage {\n          url\n          altText\n        }\n      }\n    }\n    collections(\n      first: $urlLimits\n      query: "published_status:\'online_store:visible\'"\n    ) {\n      nodes {\n        updatedAt\n        handle\n        onlineStoreUrl\n      }\n    }\n    pages(first: $urlLimits, query: "published_status:\'published\'") {\n      nodes {\n        updatedAt\n        handle\n        onlineStoreUrl\n      }\n    }\n  }\n': {
    return: SitemapsQuery;
    variables: SitemapsQueryVariables;
  };
}

interface GeneratedMutationTypes {
  '#graphql\n  mutation customerActivate($id: ID!, $input: CustomerActivateInput!) {\n    customerActivate(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerActivateMutation;
    variables: CustomerActivateMutationVariables;
  };
  '#graphql\n  mutation customerAddressUpdate(\n    $address: MailingAddressInput!\n    $customerAccessToken: String!\n    $id: ID!\n  ) {\n    customerAddressUpdate(\n      address: $address\n      customerAccessToken: $customerAccessToken\n      id: $id\n    ) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerAddressUpdateMutation;
    variables: CustomerAddressUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {\n    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n      deletedCustomerAddressId\n    }\n  }\n': {
    return: CustomerAddressDeleteMutation;
    variables: CustomerAddressDeleteMutationVariables;
  };
  '#graphql\n  mutation customerDefaultAddressUpdate(\n    $addressId: ID!\n    $customerAccessToken: String!\n  ) {\n    customerDefaultAddressUpdate(\n      addressId: $addressId\n      customerAccessToken: $customerAccessToken\n    ) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerDefaultAddressUpdateMutation;
    variables: CustomerDefaultAddressUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAddressCreate(\n    $address: MailingAddressInput!\n    $customerAccessToken: String!\n  ) {\n    customerAddressCreate(\n      address: $address\n      customerAccessToken: $customerAccessToken\n    ) {\n      customerAddress {\n        id\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerAddressCreateMutation;
    variables: CustomerAddressCreateMutationVariables;
  };
  '#graphql\n  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {\n    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n  ': {
    return: CustomerUpdateMutation;
    variables: CustomerUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {\n    customerAccessTokenCreate(input: $input) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n    }\n  }\n': {
    return: CustomerAccessTokenCreateMutation;
    variables: CustomerAccessTokenCreateMutationVariables;
  };
  '#graphql\n  mutation customerRecover($email: String!) {\n    customerRecover(email: $email) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerRecoverMutation;
    variables: CustomerRecoverMutationVariables;
  };
  '#graphql\n  mutation customerCreate($input: CustomerCreateInput!) {\n    customerCreate(input: $input) {\n      customer {\n        id\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerCreateMutation;
    variables: CustomerCreateMutationVariables;
  };
  '#graphql\n  mutation customerReset($id: ID!, $input: CustomerResetInput!) {\n    customerReset(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerResetMutation;
    variables: CustomerResetMutationVariables;
  };
  '#graphql\n  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!], $country: CountryCode = ZZ)\n    @inContext(country: $country) {\n    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {\n      cart {\n        id\n        discountCodes {\n          code\n        }\n      }\n      errors: userErrors {\n        field\n        message\n      }\n    }\n  }\n': {
    return: CartDiscountCodesUpdateMutation;
    variables: CartDiscountCodesUpdateMutationVariables;
  };
}

declare module '@shopify/hydrogen' {
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
