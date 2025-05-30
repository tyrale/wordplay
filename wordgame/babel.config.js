module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'react' }]
    ],
    plugins: [
      // Required for @babel/runtime helpers
      ['@babel/plugin-transform-runtime', {
        helpers: true,
        regenerator: true
      }]
    ]
  };
}; 