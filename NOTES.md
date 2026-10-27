# Notes

Known issues and TODOs for this fork of `github/command`.

## Known issues

### The `@octokit/plugin-retry` plugin is never applied (upstream bug)

Discovered during the TypeScript migration (2026-10-26): the retry plugin has
never been active in this Action, in any released version. Two independent
bugs stack:

1. The original code imported a nonexistent export:
   `import {octokitRetry} from '@octokit/plugin-retry'` — the package only
   exports `retry`. Under ncc (which never typechecked) this resolved to
   `undefined` at runtime, so `additionalPlugins: [octokitRetry]` was really
   `additionalPlugins: [undefined]`. You can see this in the old committed
   bundle: `additionalPlugins: [dist_node.octokitRetry]`.
2. Even with a valid plugin reference, `getOctokit` from `@actions/github`
   does not read an `additionalPlugins` option key — plugins must be passed as
   rest arguments: `github.getOctokit(token, options, octokitRetry)`.

Both are preserved for behavior parity in the TypeScript port (see the
comments in `src/main.ts` and `src/functions/post.ts`). Fixing this changes
runtime behavior (octokit requests would start retrying) and should be done
in its own PR with tests.

## TODO

- [x] Testing: migrated the dormant `__tests__/` (jest) to vitest 5, restored
      the old istanbul pragmas as `v8 ignore`, and refreshed
      `badges/coverage.svg` (2026-10-26). 96 tests green, 100% lines enforced
      via the `action:test` mise task (typecheck → vitest → badge).
- [ ] Devkit handoff: migrate `tsconfig.json` (and related config files)
      into devkit, bring in the other providers, and update `dprint.json`
      to include the typescript plugin.
- [ ] CI: `lint.yml`, `test.yml`, and `package-check.yml` still assume
      npm + `package.json` — update to pnpm/mise (`setup-node` with
      `cache: 'pnpm'`, point package-check at `mise run action:build`
      freshness).
- [ ] Docs: README and CONTRIBUTING still describe the old npm/nodenv
      workflow — rewrite for mise/pnpm/TypeScript.
- [x] Dependabot: alerts-only mode (2026-10-26) — deleted
      `.github/dependabot.yml` entirely: the npm version-updater requires
      `package.json` (it cannot read our `package.yaml` manifest), and
      update PRs weren't wanted. Security alerts are unaffected — they
      come from the dependency graph, which parses `pnpm-lock.yaml`
      (single-doc v9 format) directly. NOTE: the graph and Dependabot
      alerts are off by default on forks and must be enabled once in repo
      settings (Settings → Code security).