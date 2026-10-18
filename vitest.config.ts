import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // .direnv/ holds nix-direnv's copy of flake inputs (via .envrc's
    // `use flake`) — its source trees must not be collected as test files.
    exclude: ["**/node_modules/**", ".direnv/**"],
  },
});
