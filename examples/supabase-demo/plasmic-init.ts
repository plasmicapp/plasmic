import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import {
  SupabaseMutation,
  SupabaseQuery,
  SupabaseUserLogIn,
  SupabaseUserLogOut,
  SupabaseUserSession,
  SupabaseUserSignUp,
} from "./components/CodeComponents/DatabaseComponents";
import {
  SupabaseField,
  SupabaseGrid,
  SupabaseGridCollection,
  SupabaseImgField,
  SupabaseTableCollection,
  SupabaseTextField,
} from "./components/CodeComponents/DisplayCollections";
import {
  FormContextComponent,
  FormTextInput,
} from "./components/CodeComponents/Form";
import { RedirectIf } from "./components/CodeComponents/LogicComponents";
import {
  SupabaseDeleteButton,
  SupabaseEditButton,
  SupabaseModal,
} from "./components/CodeComponents/UtilsComponents";

const plasmicProjectId = process.env.PLASMIC_PROJECT_ID ?? "";
const plasmicApiToken = process.env.PLASMIC_API_TOKEN ?? "";
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

/**
 * Register your code components here for use in the Plasmic Studio
 * See /plasmic-host where the app-host is defined.
 * Once you point your Plasmic project to the app host, you should see your code components
 */
PLASMIC.registerComponent(SupabaseField, {
  name: "SupabaseField",
  props: {
    selector: "string",
    type: {
      type: "choice",
      defaultValue: "text",
      options: ["text", "image"],
    },
  },
  importPath: "./components/CodeComponents/DisplayCollections",
});

PLASMIC.registerComponent(SupabaseTextField, {
  name: "SupabaseTextField",
  props: {
    name: "string",
  },
  importPath: "./components/CodeComponents/DisplayCollections",
});

PLASMIC.registerComponent(SupabaseImgField, {
  name: "SupabaseImgField",
  props: {
    url: "string",
  },
  importPath: "./components/CodeComponents/DisplayCollections",
});

PLASMIC.registerComponent(SupabaseGrid, {
  name: "SupabaseGrid",
  props: {
    tableName: {
      type: "choice",
      defaultValue: "entries",
      options: ["entries"],
    },
    tableColumns: {
      type: "choice",
      multiSelect: true,
      options: [
        "id",
        "user_id",
        "name",
        "imageUrl",
        "inserted_at",
        "description",
      ],
    },
    queryFilters: "object",
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
    count: "number",
    loading: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Loading...",
      },
    },
  },
  defaultStyles: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gridRowGap: "30px",
    gridColumnGap: "50px",
    padding: "8px",
    maxWidth: "100%",
  },
  importPath: "./components/CodeComponents/DisplayCollections",
});

PLASMIC.registerComponent(SupabaseGridCollection, {
  name: "SupabaseGridCollection",
  props: {
    count: "number",
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
    loading: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Loading...",
      },
    },
    testLoading: "boolean",
  },
  defaultStyles: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gridRowGap: "30px",
    gridColumnGap: "50px",
    padding: "8px",
    maxWidth: "100%",
  },
  importPath: "./components/CodeComponents/DisplayCollections",
});

PLASMIC.registerComponent(FormTextInput, {
  name: "FormTextInput",
  props: {
    name: "string",
    children: "slot",
    defaultValue: "string",
  },
  importPath: "./components/CodeComponents/Form",
});

PLASMIC.registerComponent(FormContextComponent, {
  name: "FormContext",
  props: {
    children: "slot",
  },
  importName: "FormContextComponent",
  importPath: "./components/CodeComponents/Form",
});

PLASMIC.registerComponent(SupabaseQuery, {
  name: "SupabaseQuery",
  props: {
    children: "slot",
    tableName: "string",
    columns: "string",
    filters: "object",
    single: "boolean",
  },
  importPath: "./components/CodeComponents/DatabaseComponents",
});

PLASMIC.registerComponent(SupabaseUserSession, {
  name: "SupabaseUserSession",
  props: {
    children: "slot",
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
  props: {
    children: "slot",
    redirectOnSuccess: "string",
  },
  importPath: "./components/CodeComponents/DatabaseComponents",
});

PLASMIC.registerComponent(SupabaseUserSignUp, {
  name: "SupabaseUserSignUp",
  props: {
    children: "slot",
    redirectOnSuccess: "string",
  },
  importPath: "./components/CodeComponents/DatabaseComponents",
});

PLASMIC.registerComponent(SupabaseMutation, {
  name: "SupabaseMutation",
  props: {
    children: "slot",
    tableName: "string",
    filters: "object",
    method: {
      type: "choice",
      options: ["upsert", "insert", "update", "delete"],
    },
    data: "object",
    redirectOnSuccess: "string",
  },
  importPath: "./components/CodeComponents/DatabaseComponents",
});

PLASMIC.registerComponent(SupabaseTableCollection, {
  name: "SupabaseTableCollection",
  props: {
    columns: {
      type: "string",
    },
    loading: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Loading...",
      },
    },
    testLoading: "boolean",
    canEdit: "boolean",
    canDelete: "boolean",
    editSlot: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
    deleteSlot: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
    customizeEditAndDelete: "boolean",
    editPage: "string",
  },
  importPath: "./components/CodeComponents/DisplayCollections",
});

PLASMIC.registerComponent(SupabaseEditButton, {
  name: "SupabaseEditButton",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
    editPage: "string",
    id: "string",
  },
  importPath: "./components/CodeComponents/UtilsComponents",
});

PLASMIC.registerComponent(SupabaseDeleteButton, {
  name: "SupabaseDeleteButton",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
    id: "string",
    modal: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "SupabaseMutation",
        props: {
          children: {
            type: "component",
            name: "SupabaseModal",
          },
        },
      },
    },
  },
  importPath: "./components/CodeComponents/UtilsComponents",
});

PLASMIC.registerComponent(SupabaseModal, {
  name: "SupabaseModal",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
    showModal: "boolean",
  },
  importPath: "./components/CodeComponents/UtilsComponents",
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
  },
  importPath: "./components/CodeComponents/LogicComponents",
});
