import type { ExtensionWebExports } from "@moonlight-mod/types";

// https://moonlight-mod.github.io/ext-dev/webpack/#webpack-module-insertion
export const webpackModules: ExtensionWebExports["webpackModules"] = {
  atmogusPresence: {
    // Keep this object, even if it's empty! It's required for the module to be loaded.
    dependencies: [{ ext: "common", id: "stores" }, { id: "discord/Dispatcher" }, { id: "spacepack" }, { id: "discord/packages/flux" }],
    entrypoint: true
  },
  /*presenceSettings: {
    dependencies: [
      { id: "react" },
      { id: "discord/components/common/index" },
      { id: "spacepack" }
    ],
    entrypoint: true
  }*/
};
