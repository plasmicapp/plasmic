/** ESLint config for packages using React. */
module.exports = {
  extends: ['./.eslintrc.js', 'react-app'],
  settings: {
    react: {
      version: 'detect',
    },
  },
};
