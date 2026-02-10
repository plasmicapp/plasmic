/** ESLint config for packages using React. */
module.exports = {
  extends: ["./.eslintrc.js"],
  settings: {
    react: {
      version: "detect",
    },
  },
  plugins: ["react-hooks"],
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
};
