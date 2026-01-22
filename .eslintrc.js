const TYPES = `Animation|AnimationSequence|AnyType|Arena|ArenaChild|ArenaFrame|ArenaFrameCell|ArenaFrameGrid|ArenaFrameRow|Arg|ArgType|BindingStruct|BoolType|Choice|ClassNamePropType|CodeComponentHelper|CodeComponentMeta|CodeComponentVariantMeta|CodeLibrary|CollectionExpr|ColorPropType|ColumnsConfig|ColumnsSetting|Component|ComponentArena|ComponentDataQuery|ComponentInstance|ComponentServerQuery|ComponentSwapSplitContent|ComponentTemplateInfo|ComponentVariantGroup|ComponentVariantSplitContent|CompositeExpr|CustomCode|CustomFunction|CustomFunctionExpr|DataSourceOpExpr|DataSourceTemplate|DataToken|DateRangeStrings|DateString|DefaultStylesClassNamePropType|DefaultStylesPropType|EventHandler|Expr|ExprText|FigmaComponentMapping|FunctionArg|FunctionExpr|FunctionType|GenericEventHandler|GlobalVariantGroup|GlobalVariantGroupParam|GlobalVariantSplitContent|HostLessPackageInfo|HrefType|ImageAsset|ImageAssetRef|Img|Interaction|KeyFrame|LabeledSelector|MapExpr|Marker|Mixin|NameArg|NamedState|NodeMarker|Num|ObjectPath|PageArena|PageHref|PageMeta|Param|PlumeInfo|PlumeInstance|PrimitiveType|ProjectDependency|PropParam|QueryData|QueryInvalidationExpr|QueryRef|RandomSplitSlice|RawText|RenderExpr|RenderFuncType|RenderableType|Rep|RichText|Rule|RuleSet|Scalar|SegmentSplitSlice|SelectorRuleSet|Site|SlotParam|Split|SplitContent|SplitSlice|State|StateChangeHandlerParam|StateParam|StrongFunctionArg|StyleExpr|StyleMarker|StyleNode|StylePropType|StyleScopeClassNamePropType|StyleToken|StyleTokenOverride|StyleTokenRef|TargetType|TemplatedString|Text|Theme|ThemeLayoutSettings|ThemeStyle|Token|TplComponent|TplNode|TplRef|TplSlot|TplTag|Var|VarRef|Variant|VariantGroup|VariantGroupState|VariantSetting|VariantedRuleSet|VariantedValue|VariantsRef|VirtualRenderExpr`;

const clientFiles = [
  "platform/wab/src/wab/main.tsx",
  "platform/wab/src/wab/client/**/*.ts",
  "platform/wab/src/wab/client/**/*.tsx",
];
const serverFiles = [
  "platform/wab/src/wab/server/**/*.ts",
  "platform/wab/src/wab/server/**/*.tsx",
];
const testFiles = [
  "**/*.spec.ts",
  "**/*.spec.tsx",
  "**/*-spec.ts",
  "**/*-spec.tsx",
  "**/*.stories.tsx",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/test/**/*",
  "**/__mocks__/**/*",
];

module.exports = {
  root: true,
  ignorePatterns: [
    ".tmp",
    "build",
    "node_modules",
    "storybook-static",

    "examples/",
    "internal/",
    "packages/host/src/type-utils.ts",
    "platform/wab/create-react-app-new/",
    "platform/wab/deps/",
    "platform/wab/public/static/",
    "platform/wab/src/wab/client/plasmic/",
    "platform/wab/src/wab/client/sandboxes/",
    "platform/wab/src/wab/shared/model/classes.ts",
    "platform/wab/src/wab/shared/model/classes-metas.ts",
  ],
  rules: {
    curly: "error",
    "no-restricted-properties": [
      "error",
      {
        object: "L",
        property: "remove",
        message:
          "Please use common.removeWhere() instead; L.remove() does not work well with mobx arrays",
      },
      {
        object: "L",
        property: "pull",
        message:
          "Please use common.remove() instead; L.pull() does not work well with mobx arrays",
      },
      {
        object: "req",
        property: "login",
        message: "Please use doLogin() instead",
      },
      {
        object: "req",
        property: "logIn",
        message: "Please use doLogin() instead",
      },
      {
        object: "req",
        property: "logout",
        message: "Please use doLogout() instead",
      },
      {
        object: "req",
        property: "logOut",
        message: "Please use doLogout() instead",
      },
      {
        object: "window",
        property: "prompt",
        message:
          "Please use reactPrompt() instead; window.prompt() does not work well with app hosting",
      },
      {
        property: "findOneOrFail",
        message:
          "Please prefer `findExactlyOne` instead, to ensure no more than one row will match",
      },
    ],
    "no-restricted-globals": [
      "error",
      {
        name: "prompt",
        message:
          "Please use reactPrompt() instead; window.prompt() does not work well with app hosting",
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        name: "@plasmicapp/host",
        importNames: ["registerComponent", "CodeComponentMeta"],
        message:
          "Please import from @plasmicapp/host/registerComponent instead",
      },
      {
        name: "antd",
        importNames: ["Modal"],
        message:
          "Please use drop-in replacement src/wab/client/components/widgets/Modal.tsx instead",
      },
      {
        name: "react-use",
        importNames: ["useAsync", "useAsyncRetry", "useAsyncFn"],
        message: "Please use useAsyncStrict()/useAsyncFnStrict() instead",
      },
      {
        name: "react-use/lib/useAsync",
        message: "Please use useAsyncStrict() instead",
      },
      {
        name: "react-use/lib/useAsyncRetry",
        message: "Please use useAsyncStrict() instead",
      },
      {
        name: "react-use/lib/useAsyncFn",
        message: "Please use useAsyncFnStrict() instead",
      },
    ],
    "no-restricted-syntax": [
      "warn",
      {
        selector: "CallExpression[callee.name='ensure'][arguments.length!=2]",
        message: "`ensure` must always be invoked with a message.",
      },
      {
        selector: "CallExpression[callee.name='assert'][arguments.length!=2]",
        message: "`assert` must always be invoked with a message.",
      },
      {
        selector: `CallExpression[callee.name='ensureInstance'][arguments.length=2] > Identifier[name=/\\b(${TYPES})\\b/]`,
        message:
          "ensureInstance cannot be called on model types. Use ensureKnownXXX instead.",
      },
      {
        selector: `BinaryExpression[operator='instanceof'] > Identifier[name=/\\b(${TYPES})\\b/]`,
        message:
          "instanceof cannot be used with model types. Use isKnownXXX instead.",
      },
    ],
    "react/forbid-elements": [
      "error",
      {
        forbid: [
          {
            element: "Link",
            message:
              "Please use <PublicLink> instead to make sure it works with app hosting",
          },
        ],
      },
    ],
    "no-shadow": "error",
    "no-debugger": "off",
    "no-redeclare": "off",
    "no-dupe-class-members": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "no-var": "error",
    "no-constant-condition": ["error", { checkLoops: false }],
    "no-empty": ["error", { allowEmptyCatch: true }],
    "prefer-const": "warn",
    "prefer-spread": "off",
    "@typescript-eslint/ban-types": [
      "error",
      {
        extendDefaults: true,
        types: {
          // un-ban types banned by default
          "{}": false,
          Function: false,
        },
      },
    ],
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-this-alias": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/triple-slash-reference": [
      "error",
      {
        types: "always",
      },
    ],
    "jest/no-conditional-expect": "off",
  },
  env: {
    es6: true,
    node: true,
    browser: true,
    jasmine: true,
    jest: true,
  },
  parser: "@typescript-eslint/parser",
  overrides: [
    {
      files: [
        "platform/wab/src/**/*.ts",
        "platform/wab/src/**/*.tsx",
        "platform/wab/src/wab/main.tsx",
      ],
      rules: {
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        "no-shadow": "off",
        "no-extra-boolean-cast": "off",
        "@typescript-eslint/no-shadow": "error",
        "@typescript-eslint/no-floating-promises": ["error", {}],
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            checksVoidReturn: {
              attributes: false,
              arguments: false,
            },
          },
        ],
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
        "no-inner-declarations": "off",
        "@typescript-eslint/no-empty-function": "warn",
        "@typescript-eslint/no-empty-interface": "warn",
        "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
        "@typescript-eslint/ban-ts-comment": "warn",
        "import/no-extraneous-dependencies": [
          "error",
          {
            devDependencies: testFiles,
          },
        ],
        "no-relative-import-paths/no-relative-import-paths": [
          "error",
          {
            rootDir: "platform/wab/src",
            prefix: "@",
          },
        ],
      },

      overrides: [
        {
          files: serverFiles,
          excludedFiles: testFiles,
          rules: {
            "@typescript-eslint/no-restricted-imports": [
              "error",
              {
                patterns: [
                  {
                    group: ["**/client/*"],
                    message:
                      "Files in `server/` cannot import from `client/`. Please move this file inside `client/` or use `import type`",
                    allowTypeImports: true,
                  },
                  {
                    group: ["**/test/*"],
                    message:
                      "Only test files can import files in `test/`. Please move this file inside `test/` or use `import type`",
                    allowTypeImports: true,
                  },
                  {
                    group: ["mobx"],
                    message:
                      "Files in `server/` can only import mobx from `shared/import-mobx` or use `import type`",
                  },
                ],
              },
            ],
          },
        },
        {
          files: clientFiles,
          excludedFiles: testFiles,
          rules: {
            "@typescript-eslint/no-restricted-imports": [
              "error",
              {
                patterns: [
                  {
                    group: ["**/server/*"],
                    message:
                      "Files in `client/` cannot import from `server/`. Please move this file inside `server/` or use `import type`",
                    allowTypeImports: true,
                  },
                  {
                    group: ["**/test/*"],
                    message:
                      "Only test files can import files in `test/`. Please move this file inside `test/` or use `import type`",
                    allowTypeImports: true,
                  },
                ],
              },
            ],
          },
        },
        {
          files: ["platform/wab/src/**/*.ts", "platform/wab/src/**/*.tsx"],
          excludedFiles: [...clientFiles, ...serverFiles, ...testFiles],
          rules: {
            "@typescript-eslint/no-restricted-imports": [
              "error",
              {
                patterns: [
                  {
                    // This override takes precedence over the previous ones, so we need to re-add some rules
                    group: ["**/client/*"],
                    message:
                      "Only client files can import from `client/`. Please move this file inside `client/` or use `import type`",
                    allowTypeImports: true,
                  },
                  {
                    group: ["**/server/*"],
                    message:
                      "Only server files can import from `server/`. Please move this file inside `server/` or use `import type`",
                    allowTypeImports: true,
                  },
                  {
                    group: ["**/test/*"],
                    message:
                      "Only test files can import files in `test/`. Please move this file inside `test/` or use `import type`",
                    allowTypeImports: true,
                  },
                  {
                    group: ["mobx"],
                    message:
                      "Server files (not in `client/` folder) can only import mobx from `shared/import-mobx` or use `import type`",
                    allowTypeImports: true,
                  },
                ],
              },
            ],
          },
        },
      ],

      parserOptions: {
        ecmaVersion: 2017,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: ["./platform/wab/tsconfig.json"],
      },
    },

    {
      files: ["packages/cli/src/**/*.ts", "packages/cli/src/**/*.tsx"],
      rules: {
        "no-restricted-properties": [
          "error",
          {
            object: "process",
            property: "exit",
            message:
              "CLI can be used as a library. Please throw Error or HandledError instead.",
          },
          {
            object: "console",
            message:
              "Please use `logger` so that consumers of the library can control logging.",
          },
        ],
        "no-restricted-syntax": [
          "error",
          {
            selector:
              "Identifier[name=/^(existsSync|readFileSync|renameSync|unlinkSync|writeFileSync)$/]",
          },
        ],
      },
    },
  ],
  plugins: [
    "@typescript-eslint",
    "react",
    "jest",
    "import",
    "eslint-plugin-no-relative-import-paths",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/typescript",
  ],
  settings: {
    "import/resolver": {
      typescript: true,
      node: true,
    },
    react: {
      version: "detect",
    },
  },
  globals: {
    globalThis: false, // means it is not writeable
    analytics: false,
    SocketIOClient: false,
    JSX: false,
    JQuery: false,
    Cypress: false,
    cy: false,
  },
};
