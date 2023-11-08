const workerpool = require("workerpool");

require("esbuild-register");

workerpool.worker({
  codegen: require("./codegen").workerGenCode,
  "loader-assets": require("./build-loader-assets").workerBuildAssets,
  "prefill-cloudfront": require("./prefill-cloudfront").workerPrefillCloudfront,
  "localization-strings": require("./localization-worker")
    .workerLocalizationStrings,
});
