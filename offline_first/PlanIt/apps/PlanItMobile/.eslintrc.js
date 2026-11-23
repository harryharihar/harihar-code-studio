module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // React Navigation header buttons are render functions passed as options.
    'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
  },
};
