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

const plasmicProjectId = process.env.PLASMIC_PROJECT_ID ?? "";
const plasmicApiToken = process.env.PLASMIC_API_TOKEN ?? "";
export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      version: "updated-auth",
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
    tableName: "string",
    columns: "string",
    filters: "exprEditor",
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
    tableName: "string",
    filters: "exprEditor",
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
