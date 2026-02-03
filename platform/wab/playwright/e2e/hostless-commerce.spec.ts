import { BrowserContext, expect, FrameLocator, Page } from "@playwright/test";
import {
  cartCookie,
  localCommerceData,
} from "../../src/wab/client/test-helpers/test-commerce";
import { VERT_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { PageModels, test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("hostless-commerce", () => {
  let projectId: string;
  const products = localCommerceData.products;
  const pathToProductInstanceTreeLabel = [
    "vertical stack",
    "Product Collection",
    'Slot: "children"',
    "Product Container",
  ];

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProjectAfterTest(
        projectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    }
  });

  test("can add product components and cart components", async ({
    page,
    apiClient,
    models,
    context,
  }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "commerce",
          npmPkg: ["@plasmicpkgs/commerce"],
        },
        {
          name: "commerce-local",
          npmPkg: ["@plasmicpkgs/commerce-local"],
          deps: ["commerce"],
        },
      ],
    });

    await goToProject(page, `/projects/${projectId}`);

    await models.studio.leftPanel.switchToTreeTab();

    await models.studio.leftPanel.createNewPage("Collection Page");

    const frameCount = await models.studio.frames.count();
    const framed = models.studio.frames.nth(frameCount - 1);
    await framed.waitFor({ state: "visible", timeout: 10000 });
    await models.studio.focusFrameRoot(framed);

    await models.studio.leftPanel.insertNode(VERT_CONTAINER_CAP);

    await models.studio.renameTreeNode("Cart Container");

    await page.waitForTimeout(500);
    await models.studio.rightPanel.addHtmlAttribute("id", "cart-container");

    await page.waitForTimeout(1000);

    await models.studio.leftPanel.insertNode("plasmic-commerce-cart");
    await models.studio.renameTreeNode("Cart Size");

    await models.studio.rightPanel.setSelectByLabel("field", "Size");
    await page.waitForTimeout(500);

    await models.studio.leftPanel.insertNode("plasmic-commerce-cart");
    await page.waitForTimeout(500);

    await models.studio.renameTreeNode("Cart Total Price");

    await models.studio.rightPanel.setSelectByLabel("field", "Total Price");

    await models.studio.leftPanel.selectTreeNode(["vertical stack"]);

    await models.studio.leftPanel.insertNode(
      "plasmic-commerce-product-collection"
    );
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    await models.studio.renameTreeNode("Product Container");

    await page.waitForTimeout(500);
    await models.studio.rightPanel.addHtmlAttribute(
      "className",
      "product-container"
    );

    await models.studio.leftPanel.treeLabels
      .filter({ hasText: "Product Text Field" })
      .first()
      .click();
    await page.waitForTimeout(500);
    await models.studio.renameTreeNode("Product Name");

    await page.waitForTimeout(500);

    await models.studio.leftPanel.insertNode(
      "plasmic-commerce-product-text-field"
    );
    await page.waitForTimeout(500);
    await models.studio.renameTreeNode("Product Slug");

    await page.waitForTimeout(300);
    await models.studio.rightPanel.setSelectByLabel("field", "slug");
    await page.waitForTimeout(500);

    await page.waitForTimeout(500);
    await models.studio.leftPanel.insertNode("plasmic-commerce-product-price");
    await models.studio.leftPanel.insertNode(
      "plasmic-commerce-product-quantity"
    );
    await models.studio.leftPanel.insertNode(
      "plasmic-commerce-product-variant-picker"
    );
    await models.studio.leftPanel.insertNode(
      "plasmic-commerce-add-to-cart-button"
    );
    await models.studio.leftPanel.insertNode("plasmic-commerce-product-link");
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp(
      "linkDest",
      "/products/{slug}",
      { reset: true }
    );

    await models.studio.leftPanel.treeLabels
      .filter({ hasText: `Slot: "children"` })
      .nth(3)
      .click();
    await page.waitForTimeout(500);
    await models.studio.leftPanel.insertNode("Text");
    await models.studio.editText("Click here!");

    await models.studio.focusFrameRoot(framed);

    await page.waitForTimeout(1000);

    await test_ProductComponent_InCanvas(
      models,
      page,
      "Product Name",
      products[0].name
    );
    await test_ProductComponent_InCanvas(
      models,
      page,
      "Product Text Field",
      products[0].slug,
      "Product Slug"
    );
    await test_ProductComponent_InCanvas(
      models,
      page,
      "Product Price",
      products[0].price.value
    );
    await test_ProductComponent_InCanvas(
      models,
      page,
      "Product Media",
      products[0].images[0].url
    );
    await test_ProductComponent_InCanvas(
      models,
      page,
      "Product Variant Picker",
      products[0].variants.find((v: any) => v.price === products[0].price.value)
        .id
    );
    await test_ProductComponent_InCanvas(models, page, "Product Quantity", "1");
    await test_ProductComponent_InCanvas(
      models,
      page,
      "Add To Cart Button",
      "Add To Cart"
    );

    await test_CartComponent_InCanvas(models, "Cart", "0", "Cart Size");
    await test_CartComponent_InCanvas(
      models,
      "Cart",
      "$0.00",
      "Cart Total Price"
    );

    await test_ProductLink(models, page, 0);
    await test_ProductLink(models, page, 2);

    await models.studio.frame
      .locator('[data-test-id="live-frame"]')
      .contentFrame()
      .locator(".product-container")
      .nth(2)
      .getByText("Sticker");

    await models.studio.withinLiveMode(async (liveFrame) => {
      await test_CommerceCartData(liveFrame, 0, 0);

      const productContainers = liveFrame.locator(".product-container");
      const count = await productContainers.count();
      for (let i = 0; i < count; i++) {
        const product = products[i];
        const productContainer = productContainers.nth(i);
        await expect(
          productContainer.getByText(product.name, { exact: true })
        ).toBeVisible();
        await expect(
          productContainer.getByText(product.slug, { exact: true })
        ).toBeVisible();
        await expect(
          productContainer.getByText(product.price.value)
        ).toBeVisible();
        const img = productContainer.locator("img");
        await expect(img).toBeVisible();
        await expect(img).toHaveAttribute("src", product.images[0].url);
      }

      await test_AddToCart_OneProduct(context, liveFrame, 0);
      await test_AddToCart_OneProduct(context, liveFrame, 1);
      await test_AddToCart_SameProductTwice(context, liveFrame, 0);
      await test_AddToCart_SameProductTwice(context, liveFrame, 1);
      await test_AddToCart_DifferentProducts(context, liveFrame, [0, 3, 2]);
      await test_AddToCart_DifferentProducts(context, liveFrame, [1, 4, 6]);
      await test_AddToCart_OneProductModifyingQuantity(
        context,
        liveFrame,
        0,
        10
      );
      await test_AddToCart_OneProductModifyingQuantity(
        context,
        liveFrame,
        1,
        7
      );
      await test_AddToCart_OneProductDifferentVariants(context, liveFrame, 0);
      await test_AddToCart_OneProductDifferentVariants(context, liveFrame, 1);

      await test_UpdateProductPrice_After_Chaging_ProductVariant(liveFrame, 0);
    });

    await models.studio.rightPanel.checkNoErrors();
  });

  test("can use context to data bind", async ({ page, apiClient, models }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "commerce",
          npmPkg: ["@plasmicpkgs/commerce"],
        },
        {
          name: "commerce-local",
          npmPkg: ["@plasmicpkgs/commerce-local"],
          deps: ["commerce"],
        },
      ],
    });

    await goToProject(page, `/projects/${projectId}`);

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.createNewPage("Collection Page");
    await page.waitForTimeout(1000);

    const frameCount = await models.studio.frames.count();
    const framed = models.studio.frames.nth(frameCount - 1);
    await framed.waitFor({ state: "visible", timeout: 10000 });
    await models.studio.focusFrameRoot(framed);

    const rootLabel = models.studio.leftPanel.treeLabels
      .filter({ hasText: "vertical stack" })
      .first();
    await rootLabel.waitFor({ state: "visible", timeout: 30000 });

    await models.studio.leftPanel.selectTreeNode(["vertical stack"]);

    const collectionFrame = models.studio.getComponentFrameByIndex(0);
    await models.studio.focusFrameRoot(collectionFrame);

    await models.studio.leftPanel.insertNode(
      "plasmic-commerce-product-collection"
    );
    await page.waitForTimeout(2000);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    await page.keyboard.press("Control+r");
    await page.waitForTimeout(200);
    await page.keyboard.type("Product Container");
    await page.keyboard.press("Enter");

    await models.studio.leftPanel.treeLabels
      .filter({
        hasText:
          pathToProductInstanceTreeLabel[
            pathToProductInstanceTreeLabel.length - 1
          ],
      })
      .first()
      .click();
    await page.keyboard.press("Delete");
    await models.studio.leftPanel.insertNode("Vertical stack");
    await models.studio.rightPanel.addHtmlAttribute(
      "className",
      "product-container"
    );
    await models.studio.leftPanel.treeLabels
      .filter({ hasText: "vertical stack" })
      .nth(1)
      .click();
    await models.studio.leftPanel.insertNode("Text");

    await page.keyboard.press("Control+r");
    await page.waitForTimeout(200);
    await page.keyboard.type("Product Name");
    await page.keyboard.press("Enter");
    const textContentLabel = models.studio.rightPanel.frame.locator(
      '[data-test-id="text-content"] label'
    );
    await textContentLabel.click({ button: "right" });
    await models.studio.frame.getByText("Use dynamic value").click();
    await models.studio.rightPanel.selectPathInDataPicker([
      "currentProduct",
      "name",
    ]);
    await models.studio.leftPanel.insertNode("Image");
    const imagePicker = models.studio.rightPanel.frame.locator(
      '[data-test-id="image-picker"]'
    );
    await imagePicker.click({ button: "right" });
    await models.studio.frame.getByText("Use dynamic value").click();
    await models.studio.rightPanel.selectPathInDataPicker([
      "currentProduct",
      "images",
      "0",
      "url",
    ]);

    await models.studio.withinLiveMode(async (liveFrame) => {
      const productContainers = liveFrame.locator(".product-container");
      const count = await productContainers.count();
      for (let i = 0; i < count; i++) {
        const product = products[i];
        const productContainer = productContainers.nth(i);
        await expect(productContainer.getByText(product.name)).toBeVisible();
        const img = productContainer.locator("img");
        await expect(img).toBeVisible();
        await expect(img).toHaveAttribute("src", product.images[0].url);
      }
    });

    await models.studio.rightPanel.checkNoErrors();
  });

  const getProductWithinLiveMode = (liveFrame: FrameLocator, index: number) => {
    return liveFrame.locator('[class*="productContainer"]').nth(index);
  };

  const test_CartComponent_InCanvas = async (
    models: PageModels,
    componentName: string,
    value: string,
    tplTreeName?: string
  ) => {
    const treeLabel = models.studio.leftPanel.treeLabels
      .filter({ hasText: tplTreeName ?? componentName })
      .first();

    await treeLabel.waitFor({ state: "visible", timeout: 15000 });
    await treeLabel.click({ force: true });

    const canvasFrame = models.studio.componentFrame;

    const textElement = canvasFrame
      .locator(`span:has-text("${value}")`)
      .first();
    await expect(textElement).toBeVisible({ timeout: 10000 });
  };

  const test_ProductLink = async (
    models: PageModels,
    page: Page,
    index: number
  ) => {
    await models.studio.withinLiveMode(async (liveFrame: FrameLocator) => {
      const clickHereLink = liveFrame.getByText("Click here!").nth(index);

      await clickHereLink.waitFor({ state: "visible", timeout: 10000 });
      await clickHereLink.scrollIntoViewIfNeeded();
      await clickHereLink.click();

      await page.waitForTimeout(2000);

      await expect(liveFrame.getByText("Page not found")).toBeVisible({
        timeout: 20000,
      });
      await expect(
        liveFrame.getByText(`products/${products[index].slug}`)
      ).toBeVisible({ timeout: 15000 });
    });
  };

  const test_ProductComponent_InCanvas = async (
    models: PageModels,
    page: Page,
    componentName: string,
    value: string,
    tplTreeName?: string
  ) => {
    await models.studio.leftPanel.treeLabels
      .filter({ hasText: tplTreeName ?? componentName })
      .first()
      .click();
    await page.waitForTimeout(500);

    const canvasFrame = models.studio.componentFrame;

    if (componentName === "Product Media") {
      const img = canvasFrame.locator(`img[src="${value}"]`).first();
      await expect(img).toBeVisible({ timeout: 10000 });
      await expect(img).toHaveAttribute("src", value);
    } else if (componentName === "Product Quantity") {
      const input = canvasFrame
        .locator('input[name="ProductQuantity"]')
        .first();
      await expect(input).toBeVisible({ timeout: 10000 });
      await expect(input).toHaveAttribute("value", value);
    } else if (componentName === "Add To Cart Button") {
      const button = canvasFrame
        .locator("button:has-text('Add To Cart')")
        .first();
      await expect(button).toBeVisible({ timeout: 10000 });
    } else if (componentName === "Product Variant Picker") {
      const select = canvasFrame
        .locator('select[name="ProductVariant"]')
        .first();
      await expect(select).toBeVisible({ timeout: 10000 });
      await expect(select).toHaveValue(value);
    } else {
      const textElement = canvasFrame
        .locator(`span.__wab_instance:has-text("${value}")`)
        .first();
      await expect(textElement).toBeVisible({ timeout: 10000 });
    }
  };

  const test_AddToCart_OneProduct = async (
    context: BrowserContext,
    liveFrame: FrameLocator,
    index: number
  ) => {
    await context.clearCookies({ name: cartCookie });
    const product = getProductWithinLiveMode(liveFrame, index);
    await product.locator("button").click();
    await test_CommerceCartData(liveFrame, 1, products[index].price.value);
  };

  const test_AddToCart_SameProductTwice = async (
    context: BrowserContext,
    liveFrame: FrameLocator,
    index: number
  ) => {
    await context.clearCookies({ name: cartCookie });
    const product = getProductWithinLiveMode(liveFrame, index);
    await product.locator("button").click();
    await product.locator("button").click();
    await test_CommerceCartData(liveFrame, 1, products[index].price.value * 2);
  };

  const test_AddToCart_DifferentProducts = async (
    context: BrowserContext,
    liveFrame: FrameLocator,
    indices: number[]
  ) => {
    await context.clearCookies({ name: cartCookie });
    for (const i of indices) {
      const product = getProductWithinLiveMode(liveFrame, i);
      await product.locator("button").click();
    }
    await test_CommerceCartData(
      liveFrame,
      indices.length,
      indices.reduce(
        (acc: number, i: number) => acc + products[i].price.value,
        0
      )
    );
  };

  const test_AddToCart_OneProductModifyingQuantity = async (
    context: BrowserContext,
    liveFrame: FrameLocator,
    index: number,
    quantity: number
  ) => {
    await context.clearCookies({ name: cartCookie });
    const product = getProductWithinLiveMode(liveFrame, index);
    const input = product.locator("input");
    await input.clear({ force: true });
    await input.fill(`${quantity}`);
    await product.locator("button").click();
    await input.clear({ force: true });
    await input.fill("1");
    await test_CommerceCartData(
      liveFrame,
      1,
      products[index].price.value * quantity
    );
  };

  const test_AddToCart_OneProductDifferentVariants = async (
    context: BrowserContext,
    liveFrame: FrameLocator,
    index: number
  ) => {
    await context.clearCookies({ name: cartCookie });
    const product = getProductWithinLiveMode(liveFrame, index);
    const select = product.locator("select");
    await select.selectOption(products[index].variants[0].id);
    await product.locator("button").click();
    await select.selectOption(products[index].variants[1].id);
    await product.locator("button").click();
    await test_CommerceCartData(
      liveFrame,
      2,
      products[index].variants[0].price + products[index].variants[1].price
    );
  };

  const test_CommerceCartData = async (
    liveFrame: FrameLocator,
    expectedSize: number,
    expectedTotalPrice: number
  ) => {
    const cartContainer = liveFrame.locator("#cart-container");
    await cartContainer.waitFor({ state: "visible", timeout: 10000 });

    await cartContainer
      .locator("> span")
      .first()
      .waitFor({ state: "attached", timeout: 10000 });

    await expect(cartContainer.locator("> span").first()).toHaveText(
      `${expectedSize}`,
      { timeout: 10000 }
    );
    await expect(cartContainer.locator("> span").last()).toHaveText(
      `$${expectedTotalPrice.toFixed(2)}`,
      { timeout: 10000 }
    );
  };

  const test_UpdateProductPrice_After_Chaging_ProductVariant = async (
    liveFrame: FrameLocator,
    index: number
  ) => {
    const product = getProductWithinLiveMode(liveFrame, index);
    for (const variant of products[index].variants) {
      const select = product.locator("select");
      await select.selectOption(variant.id);
      await expect(product.getByText(`$${variant.price}`)).toBeVisible();
    }
  };
});
