import {
  CollectionExpr,
  isKnownEventHandler,
  isKnownFunctionType,
  isKnownRenderableType,
  NameArg,
  StrongFunctionArg,
} from "@/wab/classes";
import { assert, mkShortId } from "@/wab/common";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import { propTypeToWabType } from "@/wab/shared/code-components/code-components";
import { isRenderFuncType, typeFactory } from "@/wab/shared/core/model-util";
import { isGlobalAction } from "@/wab/states";
import { findExprsInComponent } from "@/wab/tpls";

const GLOBAL_ACTIONS_FOR_COMMERCE_COMPONENTS = {
  addItem: ["productId", "variantId", "quantity"],
  updateItem: ["lineItemId", "quantity"],
  removeItem: ["lineItemId"],
};

const COMPONENTS_WITH_GLOBAL_ACTIONS = {
  "plasmic-antd5-config-provider": {
    showNotification: [
      "type",
      "message",
      "description",
      "duration",
      "placement",
    ],
    hideNotifications: [],
  },
  "plasmic-commerce-commercetools-provider":
    GLOBAL_ACTIONS_FOR_COMMERCE_COMPONENTS,
  "plasmic-commerce-saleor-provider": GLOBAL_ACTIONS_FOR_COMMERCE_COMPONENTS,
  "plasmic-commerce-shopify-provider": GLOBAL_ACTIONS_FOR_COMMERCE_COMPONENTS,
  "plasmic-commerce-swell-provider": GLOBAL_ACTIONS_FOR_COMMERCE_COMPONENTS,
};

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  for (const component of site.components) {
    for (const { expr } of findExprsInComponent(component)) {
      if (!isKnownEventHandler(expr)) {
        continue;
      }
      for (const interaction of expr.interactions) {
        if (!isGlobalAction(interaction)) {
          continue;
        }
        const [componentName, actionName] = interaction.actionName.split(".");
        if (!(componentName in COMPONENTS_WITH_GLOBAL_ACTIONS)) {
          continue;
        }
        const actions = COMPONENTS_WITH_GLOBAL_ACTIONS[componentName];
        if (!(actionName in actions)) {
          continue;
        }

        const functionType = typeFactory.func(
          ...GLOBAL_ACTIONS_SNAPSHOT[componentName][actionName].parameters.map(
            (arg) => {
              const argType = propTypeToWabType(site, arg.type).match({
                success: (val) => val,
                failure: () => typeFactory.any(),
              });
              assert(
                !isKnownRenderableType(argType) && !isRenderFuncType(argType),
                () =>
                  `RenderableType and RenderFuncType should only be used for slots`
              );
              assert(
                !isKnownFunctionType(argType),
                () => `Can't have recursive FunctionType`
              );
              return typeFactory.arg(arg.name, argType, arg.displayName);
            }
          )
        );

        const parameters = actions[actionName] as string[];
        const newInteractionArgs = new CollectionExpr({
          exprs: parameters.map(() => undefined),
        });
        for (let i = 0; i < parameters.length; i++) {
          const arg = interaction.args.find(
            (iarg) => iarg.name === parameters[i]
          );
          if (!arg) {
            continue;
          }
          newInteractionArgs.exprs[i] = new StrongFunctionArg({
            argType: functionType.params[i],
            expr: arg.expr,
            uuid: mkShortId(),
          });
        }
        interaction.args = [
          new NameArg({
            name: "args",
            expr: newInteractionArgs,
          }),
        ];
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "225-release-global-actions"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";

const COMMERCE_ACTIONS_SNAPSHOT = {
  addItem: {
    displayName: "Add item to cart",
    parameters: [
      {
        name: "productId",
        displayName: "Product Id",
        type: "string",
      },
      {
        name: "variantId",
        displayName: "Variant Id",
        type: "string",
      },
      {
        name: "quantity",
        displayName: "Quantity",
        type: "number",
      },
    ],
  },
  updateItem: {
    displayName: "Update item in cart",
    parameters: [
      {
        name: "lineItemId",
        displayName: "Line Item Id",
        type: "string",
      },
      {
        name: "quantity",
        displayName: "New Quantity",
        type: "number",
      },
    ],
  },
  removeItem: {
    displayName: "Remove item from cart",
    parameters: [
      {
        name: "lineItemId",
        displayName: "Line Item Id",
        type: "string",
      },
    ],
  },
};

const GLOBAL_ACTIONS_SNAPSHOT = {
  "plasmic-antd5-config-provider": {
    showNotification: {
      displayName: "Show notification",
      parameters: [
        {
          name: "type",
          type: {
            type: "choice",
            options: ["success", "error", "info", "warning"],
            defaultValue: "info",
          },
        },
        {
          name: "message",
          type: {
            type: "string",
            defaultValue: "A message for you!",
          },
        },
        {
          name: "description",
          type: {
            type: "string",
            defaultValue: "Would you like to learn more?",
          },
        },
        {
          name: "duration",
          type: {
            type: "number",
            defaultValueHint: 5,
          },
        },
        {
          name: "placement",
          type: {
            type: "choice",
            options: [
              "top",
              "topLeft",
              "topRight",
              "bottom",
              "bottomLeft",
              "bottomRight",
            ],
            defaultValueHint: "topRight",
          },
        },
      ],
    },
    hideNotifications: {
      displayName: "Hide notifications",
      parameters: [],
    },
  },
  "plasmic-commerce-commercetools-provider": COMMERCE_ACTIONS_SNAPSHOT,
  "plasmic-commerce-saleor-provider": COMMERCE_ACTIONS_SNAPSHOT,
  "plasmic-commerce-shopify-provider": COMMERCE_ACTIONS_SNAPSHOT,
  "plasmic-commerce-swell-provider": COMMERCE_ACTIONS_SNAPSHOT,
};
