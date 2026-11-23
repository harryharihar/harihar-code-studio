module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Zod 4 uses `export * as core from …`; Metro needs this plugin to bundle it.
  plugins: ['@babel/plugin-transform-export-namespace-from'],
};
