import {
  cartCookie,
  localCommerceData,
} from "../../src/wab/client/test-helpers/test-commerce";
import { VERT_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { justType, removeCurrentProject } from "../support/util";

describe("hostless-commerce", function () {
  const products = localCommerceData.products;
  const pathToProductInstanceTreeLabel = [
    "root",
    "Product Collection",
    'Slot: "children"',
    "Product Container",
  ];

  afterEach(() => {
    removeCurrentProject();
  });

  it("can add product components and cart components", function () {
    cy.setupProjectWithHostlessPackages({
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
    }).then(() => {
      cy.withinStudioIframe(() => {
        cy.switchToTreeTab();
        cy.createNewPage("Collection Page").then((framed) => {
          cy.focusFrameRoot(framed);

          // Adding Cart components
          cy.selectTreeNode(["root"]);
          cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
          cy.renameTreeNode("Cart Container", { programatically: true });
          cy.addHtmlAttribute("id", "cart-container");
          cy.insertFromAddDrawer("plasmic-commerce-cart");
          cy.renameTreeNode("Cart Size", { programatically: true });
          cy.selectDataPlasmicProp("field", "Size");
          cy.insertFromAddDrawer("plasmic-commerce-cart");
          cy.renameTreeNode("Cart Total Price", { programatically: true });
          cy.selectDataPlasmicProp("field", "Total Price");

          // Adding Product components
          cy.selectTreeNode(["root"]);

          cy.insertFromAddDrawer("plasmic-commerce-product-collection");
          justType("{enter}{enter}");
          cy.renameTreeNode("Product Container", { programatically: true });

          cy.selectTreeNode(pathToProductInstanceTreeLabel).click();
          cy.addHtmlAttribute("className", "product-container");
          cy.selectTreeNode([
            ...pathToProductInstanceTreeLabel,
            "Product Text Field",
          ]).renameTreeNode("Product Name", { programatically: true });
          cy.insertFromAddDrawer(
            "plasmic-commerce-product-text-field"
          ).renameTreeNode("Product Slug", { programatically: true });
          cy.selectDataPlasmicProp("field", "slug");
          cy.insertFromAddDrawer("plasmic-commerce-product-price");
          cy.insertFromAddDrawer("plasmic-commerce-product-quantity");
          cy.insertFromAddDrawer("plasmic-commerce-product-variant-picker");
          cy.insertFromAddDrawer("plasmic-commerce-add-to-cart-button");

          cy.insertFromAddDrawer("plasmic-commerce-product-link");
          cy.setDataPlasmicProp("linkDest", "/products/{{}slug}");
          cy.selectTreeNode([
            ...pathToProductInstanceTreeLabel,
            "Product Link",
            'Slot: "children"',
          ]);
          cy.insertFromAddDrawer("Text");
          cy.getSelectedElt().dblclick({ force: true });
          framed.enterIntoTplTextBlock("Click here!");

          cy.focusFrameRoot(framed);

          test_ProductComponent_InCanvas("Product Name", products[0].name);
          test_ProductComponent_InCanvas(
            "Product Text Field",
            products[0].slug,
            "Product Slug"
          );
          test_ProductComponent_InCanvas(
            "Product Price",
            products[0].price.value
          );
          test_ProductComponent_InCanvas(
            "Product Media",
            products[0].images[0].url
          );
          test_ProductComponent_InCanvas(
            "Product Variant Picker",
            products[0].variants.find(
              (v: any) => v.price === products[0].price.value
            ).id
          );
          test_ProductComponent_InCanvas("Product Quantity", "1");
          test_ProductComponent_InCanvas("Add To Cart Button", "Add To Cart");

          test_CartComponent_InCanvas("Cart", "0", "Cart Size");
          test_CartComponent_InCanvas("Cart", "$0.00", "Cart Total Price");

          test_ProductLink(0);
          test_ProductLink(2);

          cy.withinLiveMode(async () => {
            test_CommerceCartData(0, 0);

            cy.get(".product-container").each(($product, i) => {
              const product = products[i];
              cy.wrap($product).contains(product.name).should("be.visible");
              cy.wrap($product).contains(product.slug).should("be.visible");
              cy.wrap($product)
                .contains(product.price.value)
                .should("be.visible");
              cy.wrap($product)
                .find("img")
                .should("be.visible")
                .should("have.attr", "src", product.images[0].url);
            });

            test_AddToCart_OneProduct(0);
            test_AddToCart_OneProduct(1);
            test_AddToCart_SameProductTwice(0);
            test_AddToCart_SameProductTwice(1);
            test_AddToCart_DifferentProducts([0, 3, 2]);
            test_AddToCart_DifferentProducts([1, 4, 6]);
            test_AddToCart_OneProductModifyingQuantity(0, 10);
            test_AddToCart_OneProductModifyingQuantity(1, 7);
            test_AddToCart_OneProductDifferentVariants(0);
            test_AddToCart_OneProductDifferentVariants(1);

            test_UpdateProductPrice_After_Chaging_ProductVariant(0);
          });
        });

        // Ensure no errors happened
        cy.checkNoErrors();
      });
    });
  });

  it("can use context to data bind", function () {
    cy.setupProjectWithHostlessPackages({
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
    }).then(() => {
      cy.withinStudioIframe(() => {
        cy.switchToTreeTab();
        cy.createNewPage("Collection Page").then((framed) => {
          cy.focusFrameRoot(framed);

          // Adding Product components
          cy.selectTreeNode(["root"]);

          cy.insertFromAddDrawer("plasmic-commerce-product-collection");
          justType("{enter}{enter}");
          cy.renameTreeNode("Product Container", { programatically: true });

          // Binding name and image
          cy.selectTreeNode(pathToProductInstanceTreeLabel)
            .click()
            .justType("{del}");
          cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
          cy.addHtmlAttribute("className", "product-container");
          cy.insertFromAddDrawer("Text").renameTreeNode("Product Name", {
            programatically: true,
          });
          cy.get(`[data-test-id="text-content"] label`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.selectPathInDataPicker(["currentProduct", "name"]);
          cy.insertFromAddDrawer("Image");
          cy.get(`[data-test-id="image-picker"]`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.selectPathInDataPicker(["currentProduct", "images", "0", "url"]);

          cy.withinLiveMode(async () => {
            cy.get(".product-container").each(($product, i) => {
              const product = products[i];
              cy.wrap($product).contains(product.name).should("be.visible");
              cy.wrap($product)
                .find("img")
                .should("be.visible")
                .should("have.attr", "src", product.images[0].url);
            });
          });
        });

        // Ensure no errors happened
        cy.checkNoErrors();
      });
    });
  });

  const getProductWithinLiveMode = (index: number) => {
    return cy.get(".product-container").eq(index);
  };

  const test_CartComponent_InCanvas = (
    componentName: string,
    value: string,
    tplTreeName?: string
  ) => {
    cy.selectTreeNode(["root", "Cart Container", tplTreeName ?? componentName])
      .getSelectedElt()
      .should("be.visible")
      .should("contain.text", value);
  };

  const test_ProductLink = (index: number) => {
    cy.withinLiveMode(() => {
      getProductWithinLiveMode(index).contains("Click here!").click();
      cy.contains("Page not found").should("be.visible");
      cy.contains(`products/${products[index].slug}`).should("be.visible");
    });
  };

  const test_ProductComponent_InCanvas = (
    componentName: string,
    value: string,
    tplTreeName?: string
  ) => {
    if (componentName === "Product Media") {
      cy.selectTreeNode([
        ...pathToProductInstanceTreeLabel,
        tplTreeName ?? componentName,
      ])
        .getSelectedElt()
        .should("be.visible")
        .should("have.attr", "src", value);
    } else if (componentName === "Product Quantity") {
      cy.selectTreeNode([
        ...pathToProductInstanceTreeLabel,
        tplTreeName ?? componentName,
      ])
        .getSelectedElt()
        .find("input")
        .should("be.visible")
        .should("have.attr", "value", value);
    } else if (componentName === "Add To Cart Button") {
      cy.selectTreeNode([
        ...pathToProductInstanceTreeLabel,
        tplTreeName ?? componentName,
      ])
        .getSelectedElt()
        .parent()
        .find("button")
        .should("be.visible")
        .contains(value);
    } else if (componentName === "Product Variant Picker") {
      cy.selectTreeNode([
        ...pathToProductInstanceTreeLabel,
        tplTreeName ?? componentName,
      ])
        .getSelectedElt()
        .parent()
        .find("select")
        .should("be.visible")
        .should("have.value", value);
    } else {
      cy.selectTreeNode([
        ...pathToProductInstanceTreeLabel,
        tplTreeName ?? componentName,
      ])
        .getSelectedElt()
        .should("be.visible")
        .should("contain.text", value);
    }
  };

  const test_AddToCart_OneProduct = (index: number) => {
    cy.clearCookie(cartCookie);
    getProductWithinLiveMode(index).within(() => {
      cy.get("button").click();
    });
    test_CommerceCartData(1, products[index].price.value);
  };

  const test_AddToCart_SameProductTwice = (index: number) => {
    cy.clearCookie(cartCookie);
    getProductWithinLiveMode(index).within(() => {
      cy.get("button").click();
      cy.get("button").click();
    });
    test_CommerceCartData(1, products[index].price.value * 2);
  };

  const test_AddToCart_DifferentProducts = (index: number[]) => {
    cy.clearCookie(cartCookie);
    index.forEach((i) => {
      getProductWithinLiveMode(i).within(() => {
        cy.get("button").click();
      });
    });
    test_CommerceCartData(
      index.length,
      index.reduce((acc: number, i: number) => acc + products[i].price.value, 0)
    );
  };

  const test_AddToCart_OneProductModifyingQuantity = (
    index: number,
    quantity: number
  ) => {
    cy.clearCookie(cartCookie);
    getProductWithinLiveMode(index).within(() => {
      cy.get("input").clear({ force: true }).type(`${quantity}`);
      cy.get("button").click();
      cy.get("input").clear({ force: true }).type("1");
    });
    test_CommerceCartData(1, products[index].price.value * quantity);
  };

  const test_AddToCart_OneProductDifferentVariants = (index: number) => {
    cy.clearCookie(cartCookie);
    getProductWithinLiveMode(index).within(() => {
      cy.get("select").select(products[index].variants[0].id, { force: true });
      cy.get("button").click();
      cy.get("select").select(products[index].variants[1].id, { force: true });
      cy.get("button").click();
    });
    test_CommerceCartData(
      2,
      products[index].variants[0].price + products[index].variants[1].price
    );
  };

  const test_CommerceCartData = (
    expectedSize: number,
    expectedTotalPrice: number
  ) => {
    cy.get("#cart-container")
      .children()
      .eq(0)
      .should(($el) => expect($el.text()).be.eq(`${expectedSize}`));

    cy.get("#cart-container")
      .children()
      .eq(1)
      .should(($el) =>
        expect($el.text()).be.eq(`$${expectedTotalPrice.toFixed(2)}`)
      );
  };

  const test_UpdateProductPrice_After_Chaging_ProductVariant = (
    index: number
  ) => {
    getProductWithinLiveMode(index).within(() => {
      for (const variant of products[index].variants) {
        cy.get("select").select(variant.id, { force: true });
        cy.contains(`$${variant.price}`);
      }
    });
  };
});
