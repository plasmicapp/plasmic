import {
  CartType,
  MutationHook,
  MutationSchemaBase,
  SWRHook,
  SWRHookSchemaBase,
} from "@plasmicpkgs/commerce";
import Cookies from "js-cookie";
import nock from "nock";
import path from "path";
import { defaultAccessToken, defaultStoreDomain } from "../graphql-config";
import { getShopifyProvider } from "../provider";

const provider = getShopifyProvider(defaultStoreDomain, defaultAccessToken);

describe("shopify provider", () => {
  beforeAll(() => {
    nock.back.setMode("lockdown");
    nock.back.fixtures = path.join(__dirname, "__fixtures__");
  });

  beforeEach(() => {
    const cookieMap = new Map<string, string>();
    jest.spyOn(Cookies, "set").mockImplementation((name, value) => {
      cookieMap.set(name, value);
      return value;
    });
    jest.spyOn(Cookies, "get").mockImplementation(((name?: string) => {
      if (name) {
        return cookieMap.get(name);
      } else {
        return {};
      }
    }) as (typeof Cookies)["get"]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    nock.restore();
    expect(nock.back.currentMode === "lockdown");
  });

  test("useBrands", async () => {
    const { nockDone } = await nock.back("useBrands.json");
    const result = await testHook(provider.site.useBrands, {});
    nockDone();
    expect(result).toMatchSnapshot();
  });

  test("useCategories", async () => {
    const { nockDone } = await nock.back("useCategories.json");
    const result = await testHook(provider.site.useCategories, {});
    nockDone();
    expect(result).toMatchSnapshot();
  });

  test("useCategories with categoryId", async () => {
    const { nockDone } = await nock.back("useCategories-categoryId.json");
    const result = await testHook(provider.site.useCategories, {
      categoryId: "gid://shopify/Collection/271211167908",
    });
    nockDone();
    expect(result).toMatchSnapshot();
  });

  test("useSearch", async () => {
    const { nockDone } = await nock.back("useSearch.json");
    const result = await testHook(provider.products.useSearch, {});
    nockDone();
    expect(result).toMatchSnapshot();
  });

  test("useSearch with categoryId", async () => {
    const { nockDone } = await nock.back("useSearch-categoryId.json");
    const result = await testHook(provider.products.useSearch, {
      categoryId: "gid://shopify/Collection/271211167908",
    });
    nockDone();
    expect(result).toMatchSnapshot();
  });

  test("useProduct", async () => {
    expect(await testHook(provider.products.useProduct, {})).toBeNull();

    const { nockDone } = await nock.back("useProduct.json");
    const result = await testHook(provider.products.useProduct, {
      id: "gid://shopify/Product/5447324270756",
    });
    const resultBySlug = await testHook(provider.products.useProduct, {
      id: "bomber-jacket", // slug
    });
    nockDone();
    expect(result).toEqual(resultBySlug);
    expect(result).toMatchSnapshot();
  });

  test("useCart", async () => {
    expect(await testHook(provider.cart.useCart, {})).toBeNull();

    const { nockDone } = await nock.back("useCart.json");

    const cart1 = await testMutationHook(provider.cart.useAddItem, {
      productId: "gid://shopify/Product/5447324270756",
      variantId: "gid://shopify/ProductVariant/40046243905700",
      quantity: 1,
    });
    expect(cart1!.lineItems[0].quantity).toEqual(1);
    const cartId = cart1!.id;
    const itemId = cart1!.lineItems[0].id;
    const priceForOne = cart1!.subtotalPrice;

    const cart2 = await testMutationHook(provider.cart.useAddItem, {
      productId: "gid://shopify/Product/5447324270756",
      variantId: "gid://shopify/ProductVariant/40046243905700",
      quantity: 1,
    });
    expect(cart2!.lineItems[0].quantity).toEqual(2);
    expect(cart2!.subtotalPrice).toEqual(2 * priceForOne);

    const cart3 = await testMutationHook(provider.cart.useUpdateItem, {
      // @ts-expect-error useUpdateItem fetcher type is wrong
      itemId,
      item: {
        quantity: 3,
      } as CartType.LineItem,
    });
    expect(cart3!.lineItems[0].quantity).toEqual(3);
    expect(cart3!.subtotalPrice).toEqual(3 * priceForOne);

    const cart4 = await testHook(provider.cart.useCart, {
      cartId,
    });
    expect(cart4).toEqual(cart3);

    const cart5 = await testMutationHook(provider.cart.useRemoveItem, {
      // @ts-expect-error useRemoveItem fetcher type is wrong
      itemId,
    });
    expect(cart5!.subtotalPrice).toEqual(0);

    nockDone();
    expect({
      cart1,
      cart2,
      cart3,
      cart4,
      cart5,
    }).toMatchSnapshot();
  });
});

function testHook<H extends SWRHookSchemaBase>(
  hook: SWRHook<H>,
  input: H["input"]
) {
  return hook.fetcher!({
    input,
    options: hook.fetchOptions,
    fetch: provider.fetcher,
  });
}

function testMutationHook<H extends MutationSchemaBase>(
  hook: MutationHook<H>,
  input: H["input"]
) {
  return hook.fetcher!({
    input,
    options: hook.fetchOptions,
    fetch: provider.fetcher,
  });
}
