/**
 * @type {import("@types/eslint").Linter.BaseConfig}
 */
module.exports = {
  extends: [
    '@remix-run/eslint-config',
    'plugin:hydrogen/recommended',
    'plugin:hydrogen/typescript',
  ],
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/naming-convention': 'off',
    'hydrogen/prefer-image-component': 'off',
    'no-useless-escape': 'off',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    'no-case-declarations': 'off',
    // TODO: Remove jest plugin from hydrogen/eslint-plugin
    'jest/no-deprecated-functions': 'off',
    'import/order': [
      'error',
      {
        /**
         * @description
         *
         * This keeps imports separate from one another, ensuring that imports are separated
         * by their relative groups. As you move through the groups, imports become closer
         * to the current file.
         *
         * @example
         * ```
         * import fs from 'fs';
         *
         * import package from 'npm-package';
         *
         * import xyz from '~/project-file';
         *
         * import index from '../';
         *
         * import sibling from './foo';
         * ```
         */
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
        'newlines-between': 'always',
      },
    ],
  },
};
