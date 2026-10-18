# Development shell for the site toolchain: Node 24 (engines >=22.22) and
# Chromium, exported as ITHINGS_CHROMIUM so mermaid-isomorphic's Playwright
# renderer (src/plugins/mermaid-themed.ts, tests/unit/diagrams.test.ts) and
# the excalidraw exporter (tools/excalidraw/export.mjs) can launch a real
# browser without any system-level setup. direnv drops you in it.
#
# nixpkgs is pinned to the revision this machine's NixOS was built from so
# the Chromium already in /nix/store is reused instead of re-downloaded
# (~1.2 GB). Bump this input alongside a system rebuild, then run
# `nix flake update` to re-pin flake.lock and keep sharing the store entry.
{
  description = "Dev environment for the ithings blog (Astro 7 toolchain)";

  inputs.nixpkgs.url =
    "github:NixOS/nixpkgs/c59305bab2065cfecc4944690d9eedbb56f3a9fa";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (system:
        let pkgs = nixpkgs.legacyPackages.${system}; in
        {
          default = pkgs.mkShell {
            packages = [ pkgs.nodejs_24 pkgs.corepack ];
            # corepack's own shims resolve yarn 4.18.0 thanks to the
            # packageManager field in package.json (respects nodeLinker:
            # node-modules from .yarnrc.yml).
            shellHook = ''
              export ITHINGS_CHROMIUM=${pkgs.chromium}/bin/chromium
              export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
            '';
          };
        });
    };
}