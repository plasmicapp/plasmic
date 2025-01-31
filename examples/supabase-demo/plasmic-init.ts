import dbSchema from "@/databaseSchema.json";
import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import { SupabaseDataProvider } from "./components/CodeComponents/DatabaseComponents/SupabaseDataProvider";
import { SupabaseForm } from "./components/CodeComponents/DatabaseComponents/SupabaseForm";
import { SupabaseUserLogIn } from "./components/CodeComponents/DatabaseComponents/SupabaseUserLogIn";
import { SupabaseUserLogOut } from "./components/CodeComponents/DatabaseComponents/SupabaseUserLogOut";
import { SupabaseUserSignUp } from "./components/CodeComponents/DatabaseComponents/SupabaseUserSignUp";
import { SupabaseUserSession } from "./components/CodeComponents/GlobalContexts/SupabaseUserSession";
import { RedirectIf } from "./components/CodeComponents/LogicComponents";

const plasmicProjectId = process.env.PLASMIC_PROJECT_ID ?? "";
const plasmicApiToken = process.env.PLASMIC_API_TOKEN ?? "";

const tableNameProp = {
  type: "choice" as const,
  multiSelect: false,
  options: dbSchema.map((table) => table.name) || [],
};

const columnProp = {
  type: "choice" as const,
  options: (props: any) => {
    const table = dbSchema.find((t) => t.name === props.tableName);
    return table?.columns?.map((column) => column.name) ?? [];
  },
};

const filtersProp = {
  type: "array" as const,
  nameFunc: (item: any) => item.name || item.key,
  itemType: {
    type: "object" as const,
    fields: {
      name: {
        type: "choice" as const,
        options: ["eq", "match"],
      },
      args: {
        type: "array" as const,
        itemType: {
          type: "object" as const,
          fields: {
            column: columnProp,
            value: "string" as const,
          },
        },
      },
    },
  },
};

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: plasmicProjectId,
      token: plasmicApiToken,
    },
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
});

PLASMIC.registerGlobalContext(SupabaseUserSession, {
  name: "SupabaseUserSession",
  importPath: "./components/CodeComponents/GlobalContexts",
  providesData: true,
  props: { staticToken: "string" },
});

PLASMIC.registerComponent(SupabaseDataProvider, {
  name: "SupabaseDataProvider",
  providesData: true,
  props: {
    children: "slot",
    tableName: tableNameProp,
    columns: {
      ...columnProp,
      multiSelect: true,
    },
    filters: filtersProp,
    single: "boolean",
  },
});

PLASMIC.registerComponent(SupabaseUserLogOut, {
  name: "SupabaseUserLogOut",
  props: {
    children: "slot",
    onSuccess: {
      type: "eventHandler",
      argTypes: [],
    },
  },
});

PLASMIC.registerComponent(SupabaseUserLogIn, {
  name: "SupabaseUserLogIn",
  providesData: true,
  refActions: {
    login: {
      description: "Log in the user",
      displayName: "Log in",
      argTypes: [
        {
          type: "string",
          name: "email",
          displayName: "Email",
        },
        {
          type: "string",
          displayName: "Password",
          name: "password",
        },
      ],
    },
  },
  props: {
    children: "slot",
  },
});

PLASMIC.registerComponent(SupabaseUserSignUp, {
  name: "SupabaseUserSignUp",
  providesData: true,
  refActions: {
    signup: {
      description: "Register the user",
      displayName: "Sign up",
      argTypes: [
        {
          type: "string",
          name: "email",
          displayName: "Email",
        },
        {
          type: "string",
          displayName: "Password",
          name: "password",
        },
      ],
    },
  },
  props: {
    children: "slot",
  },
});

PLASMIC.registerComponent(SupabaseForm, {
  name: "SupabaseForm",
  props: {
    children: "slot",
    tableName: tableNameProp,
    filters: filtersProp,
    method: {
      type: "choice",
      options: ["upsert", "insert", "update", "delete"],
    },
    data: "exprEditor",
    onSuccess: {
      type: "eventHandler",
      argTypes: [],
    },
  },
});

PLASMIC.registerComponent(RedirectIf, {
  name: "RedirectIf",
  props: {
    children: "slot",
    operator: {
      type: "choice",
      options: ["FALSY", "TRUTHY", "EQUAL", "LESS_THAN", "GREATER_THAN"],
    },
    redirectUrl: "string",
    leftExpression: "string",
    rightExpression: "string",
    testCondition: {
      type: "choice",
      options: [
        { label: "TRUTHY", value: true },
        { label: "FALSY", value: false },
      ],
    },
    forcePreview: "boolean",
  },
});
