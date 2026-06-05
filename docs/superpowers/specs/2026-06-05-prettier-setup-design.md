## Prettier Setup Design

## Goal

Install and configure Prettier so the Next.js project has a consistent formatting command and the current source files are formatted immediately.

## Chosen Approach

Use an explicit Prettier configuration file. This keeps formatting choices visible in the repository while still staying close to Prettier defaults.

## Changes

- Add `prettier` as a dev dependency using pnpm.
- Add `.prettierrc` with explicit formatting options.
- Add `.prettierignore` to exclude dependencies, generated Next.js output, build output, coverage, and local environment files.
- Add `format` and `format:check` scripts to `package.json`.
- Run Prettier across the project after setup.

## Formatting Options

- Semicolons enabled.
- Double quotes for JavaScript and TypeScript strings.
- Trailing commas enabled where valid in ES5.
- Line width set to 80 columns.

## Verification

Run `pnpm format` to format files, then run `pnpm format:check` to confirm no files remain unformatted.

## Constraints

This workspace is not currently a git repository, so the design document cannot be committed here.
