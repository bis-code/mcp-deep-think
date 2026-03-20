# Changelog

## [1.1.1](https://github.com/bis-code/mcp-deep-think/compare/deep-think-v1.1.0...deep-think-v1.1.1) (2026-03-20)


### Bug Fixes

* bundle MCP server into single file for plugin distribution ([#8](https://github.com/bis-code/mcp-deep-think/issues/8)) ([e603f43](https://github.com/bis-code/mcp-deep-think/commit/e603f433c67ab64735823626d0eb9b9813769ac0))
* use github source format in marketplace.json ([#4](https://github.com/bis-code/mcp-deep-think/issues/4)) ([59ea06b](https://github.com/bis-code/mcp-deep-think/commit/59ea06bed1321c0a44350bf8b736ec5d8a35f99f))
* use scoped npm package name @bis-code/deep-think ([#6](https://github.com/bis-code/mcp-deep-think/issues/6)) ([6e6f639](https://github.com/bis-code/mcp-deep-think/commit/6e6f6391917e3e312bf677b9435f9d4da11e3146))
* wrap hooks.json in required "hooks" key ([#7](https://github.com/bis-code/mcp-deep-think/issues/7)) ([466f2ff](https://github.com/bis-code/mcp-deep-think/commit/466f2fff1655e67c24d22cd37a1df8f7fe28c024))

## [1.1.0](https://github.com/bis-code/mcp-deep-think/compare/deep-think-v1.0.0...deep-think-v1.1.0) (2026-03-20)


### Features

* **core:** add integration tests, README, and MIT license ([9658441](https://github.com/bis-code/mcp-deep-think/commit/96584414fccd30cdc2278643e4965826fc0a4b71))
* **core:** initial implementation with all 5 MCP tools ([da2bad5](https://github.com/bis-code/mcp-deep-think/commit/da2bad54511a9a715aab81cf0fc87df05c5dc62b))
* **plugin:** add PreCompact auto-checkpoint hook and workflow rules ([19b4771](https://github.com/bis-code/mcp-deep-think/commit/19b4771b53596df85cdd0fc5c6ed0bfc642aef0e))
* **plugin:** add skills (restore-checkpoint, manage-constraints, manage-practices) ([7a5bbea](https://github.com/bis-code/mcp-deep-think/commit/7a5bbea9715fad1f3520087e0a01ff06f9b71d2c))
* **plugin:** add slash commands (start, checkpoints, constraints, practices) ([0e7ad12](https://github.com/bis-code/mcp-deep-think/commit/0e7ad12ed680011b78112ebbfb95496a9a5f7db1))
* **server:** add projectPath to checkpoints and wire up autoCheckpointEvery ([905612e](https://github.com/bis-code/mcp-deep-think/commit/905612e99c50135605cdbf4fb0eb638db8840a3d))


### Bug Fixes

* correct marketplace.json schema (add owner, fix source format) ([#3](https://github.com/bis-code/mcp-deep-think/issues/3)) ([fc3d33d](https://github.com/bis-code/mcp-deep-think/commit/fc3d33db27b484e0e33345185e6a61d5a281bc67))
