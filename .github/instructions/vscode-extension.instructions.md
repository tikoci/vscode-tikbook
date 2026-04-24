---
name: 'VS Code Extension Development'
description: 'Guidelines for src/**/*.ts (extension code)'
applyTo: 'src/**/*.ts'
---

# VS Code Extension Development Standards

These rules apply to extension code in `src/**/*.ts`. The goal is web-compatible, type-safe extension code.

## Must Follow

- **No Node built-ins** except: routeros.ts (https), virtualdocs.ts (path), scriptfs.ts (util). Gate others behind `vscode.env.uiKind`.
- **No console.log**. Use `log.info()`, `log.warn()`, `log.error()` from the output logging helper.
- **Explicit return types** on all functions. TypeScript and code review enforce this.
- **Await all promises**. No floating promises. TypeScript strict mode catches these.
- **Credentials in SecretStorage only**. Never settings or environment variables.
- **Use vscode.workspace.fs** for file I/O, not Node `fs` module.

## Type Safety

- Use `Record<string, unknown>` or spreads for RouterOS responses (version-specific attributes).
- No `any` unless documented why. Biome enforces `suspicious/noExplicitAny`. Use `biome-ignore` with a reason comment when intentional.
- Prefer `const` over `let`. Use `let` only when reassigning.

## Async & Error Handling

- All async functions must have explicit `Promise<T>` return types.
- Handle errors from RouterOS REST API; map to user-friendly messages.
- Validate RouterOS commands against v7 schema before committing.

## Context Menu vs Inline Buttons

VS Code tree view items can display commands in two ways:

### Inline Buttons (Group Name: `inline@N`)

- Commands appear as icon buttons **directly on the tree item**
- Display method: `"group": "inline@1"` (use `@1`, `@2`, `@3`... for order)
- Use when: Quick actions, frequently used commands, space allows
- Example: Start/Stop/Delete buttons next to each VM name
- **Note:** Only one display method works at a time for a given command—if a command is in `inline` group, it won't appear in context menu

### Context Menu (Default: Any other group name)

- Commands appear when right-clicking the tree item
- Display method: `"group": "actions@1"`, `"info@1"`, `"management@1"`, etc.
- Use when: Less frequent actions, limited inline space, logical grouping needed
- **Note:** Separator lines appear between different group names in context menu

### Key Pattern

In `package.json` `view/item/context`:

```json
{
  "command": "tikbook.chrvm.start",
  "when": "view == treeViewId && viewItem =~ /pattern/",
  "group": "inline@1"  // inline = tree item button
}
```

vs

```json
{
  "command": "tikbook.chrvm.create",
  "when": "view == chrVMExplorer",
  "group": "actions@1"  // any name = context menu only
}
```

A command belongs to **either** inline (appears as button) **or** context menu (appears on right-click), not both.

## References

See [docs/conventions.md](../../docs/conventions.md) for detailed patterns.
See [docs/sarb-instructions.md](../../docs/sarb-instructions.md) for full SARB guidance.
