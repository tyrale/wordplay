module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // unstable_transformImportMeta: @wordplay/engine's adapters (e.g.
      // adapters/testAdapter.ts, adapters/nodeAdapter.ts) use
      // `import.meta.url` as a best-effort way to resolve file paths
      // relative to themselves (with process.cwd()-based fallbacks for
      // environments where it isn't usable at runtime - see those files).
      // Hermes doesn't support `import.meta` natively, and without this
      // flag Babel refuses to even parse a file containing the token,
      // regardless of whether that branch is reachable at runtime. This is
      // the officially documented way to support it under Expo/RN.
      ['babel-preset-expo', { unstable_transformImportMeta: true }],
    ],
  };
};
