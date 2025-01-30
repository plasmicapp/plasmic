import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import {
  SupabaseMutation,
  SupabaseQuery,
  SupabaseUserLogIn,
  SupabaseUserLogOut,
  SupabaseUserSignUp,
} from "./components/CodeComponents/DatabaseComponents";
import { SupabaseUserSession } from './components/CodeComponents/GlobalContexts';
import { RedirectIf } from "./components/CodeComponents/LogicComponents";
import dbSchema from '@/databaseSchema.json';
import _ from "lodash";

const plasmicProjectId = process.env.PLASMIC_PROJECT_ID ?? "";
const plasmicApiToken = process.env.PLASMIC_API_TOKEN ?? "";

const tableNameProp = {
  type: 'choice' as const,
  multiSelect: false,
  options: dbSchema.map((table) => table.name) || [],
};

const columnProp = {
  type: 'choice' as const,
  options: (props: any) => {
    const table = dbSchema.find((t) => t.name === props.tableName);
    return table?.columns?.map((column) => column.name) ?? [];
  },
};

const filtersProp = {
  type: 'array' as const,
  nameFunc: (item: any) => item.name || item.key,
  itemType: {
    type: 'object' as const,
    fields: {
      name: {
        type: 'choice' as const,
        options: ['eq', 'match']
      },
      args: {
        type: 'array' as const,
        itemType: {
          type: 'object' as const,
          fields: {
            column: columnProp,
            value: 'string' as const
          }
        }
      }
    }
  }
}

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
  name: 'SupabaseUserSession',
  importPath: './components/CodeComponents/GlobalContexts',
  providesData: true,
  props: { staticToken: "string" },
})

PLASMIC.registerComponent(SupabaseQuery, {
  name: "SupabaseQuery",
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
  importPath: "./components/CodeComponents/DatabaseComponents",
});

PLASMIC.registerComponent(SupabaseUserLogOut, {
  name: "SupabaseUserLogOut",
  props: {
    children: "slot",
    redirectOnSuccess: "string",
  },
  importPath: "./components/CodeComponents/DatabaseComponents",
});

PLASMIC.registerComponent(SupabaseUserLogIn, {
  name: "SupabaseUserLogIn",
  providesData: true,
  refActions: {
    login: {
      description: 'Log in the user',
      displayName: 'Log in',
      argTypes: [
        {
          type: 'string',
          name: 'email',
          displayName: 'Email',
        },
        {
          type: 'string',
          displayName: 'Password',
          name: 'password',
        },
      ]
    }
  },
  props: {
    children: "slot",
  },
  importPath: "./components/CodeComponents/DatabaseComponents",
});

PLASMIC.registerComponent(SupabaseUserSignUp, {
  name: "SupabaseUserSignUp",
  providesData: true,
  refActions: {
    signup: {
      description: 'Register the user',
      displayName: 'Sign up',
      argTypes: [
        {
          type: 'string',
          name: 'email',
          displayName: 'Email',
        },
        {
          type: 'string',
          displayName: 'Password',
          name: 'password',
        },
      ]
    }
  },
  props: {
    children: "slot",
  },
  importPath: "./components/CodeComponents/DatabaseComponents",
});

PLASMIC.registerComponent(SupabaseMutation, {
  name: "SupabaseMutation",
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
    }
  },
  importPath: "./components/CodeComponents/DatabaseComponents",
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
  importPath: "./components/CodeComponents/LogicComponents",
});
