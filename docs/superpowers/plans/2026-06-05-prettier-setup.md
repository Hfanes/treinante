# Prettier Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit Prettier configuration, scripts, and format the current Next.js project.

**Architecture:** Prettier will be a project dev dependency invoked through pnpm scripts. Formatting behavior is centralized in `.prettierrc`, while `.prettierignore` keeps generated and local files out of formatting runs.

**Tech Stack:** pnpm, Prettier, Next.js, TypeScript, React.

---

## File Structure

- Modify: `package.json` to add `format` and `format:check` scripts and the `prettier` dev dependency.
- Modify: `pnpm-lock.yaml` through `pnpm add -D prettier`.
- Create: `.prettierrc` to define explicit formatting options.
- Create: `.prettierignore` to exclude dependencies, generated output, local env files, and build artifacts.
- Modify: project source/config/documentation files through `pnpm format`.

### Task 1: Install Prettier

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install the dependency**

Run: `pnpm add -D prettier`
Expected: `prettier` appears in `devDependencies`, and `pnpm-lock.yaml` updates.

### Task 2: Add Prettier Configuration

**Files:**

- Create: `.prettierrc`
- Create: `.prettierignore`

- [ ] **Step 1: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 80
}
```

- [ ] **Step 2: Create `.prettierignore`**

```gitignore
node_modules
.next
out
build
coverage
.vercel
*.tsbuildinfo
.env*.local
```

### Task 3: Add Formatting Scripts

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add scripts**

Update the `scripts` object to include:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "format": "prettier . --write",
  "format:check": "prettier . --check"
}
```

### Task 4: Format and Verify

**Files:**

- Modify: files selected by Prettier outside ignored paths.

- [ ] **Step 1: Format the project**

Run: `pnpm format`
Expected: Prettier writes formatted files and exits successfully.

- [ ] **Step 2: Verify formatting**

Run: `pnpm format:check`
Expected: Prettier reports that all matched files use Prettier formatting.

- [ ] **Step 3: Check lint when available**

Run: `pnpm lint`
Expected: lint passes, or reports an existing Next.js lint command incompatibility unrelated to Prettier.

## Self-Review

- Spec coverage: the plan installs Prettier, adds explicit config, adds ignore rules, adds scripts, formats the project, and verifies formatting.
- Placeholder scan: no placeholders remain.
- Type consistency: no application types or runtime APIs are introduced.
