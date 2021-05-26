const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// Webpack entry points. Mapping from resulting bundle name to the source file entry.
const entries = {
  replicate: "./src/replicate.ts",
  configuration: "./src/configuration.ts",
};

module.exports = {
  entry: entries,
  mode: "development",
  devtool: "eval-source-map",
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "amd",
    publicPath: "/dist/",
    devtoolModuleFilenameTemplate: "webpack:///[absolute-resource-path]",
  },
  devServer: {
    contentBase: path.resolve(__dirname, "dist"),
    publicPath: "/dist/",
    https: true,
    compress: false,
    historyApiFallback: true,
    hot: true,
    port: 44300,
  },
  externals: [/^VSS\/.*/, /^TFS\/.*/, /^Charts\/.*/],
  resolve: {
    extensions: ["*", ".webpack.js", ".ts", ".tsx", ".js"],
    modules: [
      path.resolve("./src"),
      "node_modules",
    ],
  },
  stats: {
    warnings: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "static/*.html", to: "[name][ext]" },
        { from: "static/css/*.css", to: "css/[name][ext]" },
        { from: "static/img/*.png", to: "img/[name][ext]" },
        {
          from: "node_modules/vss-web-extension-sdk/lib/VSS.SDK.min.js",
          to: "lib",
        },
      ],
    }),
  ],
};
