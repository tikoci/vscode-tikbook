# Copilot Configuration

This file documents the recommended VS Code settings for optimal AI development experience with TikBook.

## Automatic Repository Instructions

VS Code automatically detects and applies `.github/copilot-instructions.md` to all Copilot Chat requests in this workspace. **No configuration is required.**

## Recommended Settings

Add these settings to your VS Code `settings.json` (⌘, then search for each) or edit them directly:

```json
{
  // ==================================================
  // Copilot Chat & Customization
  // ==================================================
  
  // Enable Copilot Chat to use custom instructions (repo + user level)
  "chat.includeApplyingInstructions": true,
  
  // Show which instruction files are being used (helpful for debugging)
  "chat.includeReferencedInstructions": true,
  
  // Support repository-level .github/instructions folder for file-specific rules
  "chat.instructionsFilesLocations": [".github/instructions"],
  
  // Enable for organization-level custom instructions (if your org has them)
  "github.copilot.chat.organizationInstructions.enabled": false,
  
  // ==================================================
  // Telemetry & Privacy
  // ==================================================
  
  // Adjust telemetry level for Copilot (set to "off" to disable)
  "telemetry.telemetryLevel": "off",
  
  // ==================================================
  // Code Generation Quality
  // ==================================================
  
  // Always provide type info to Copilot (helps with suggestions in TS)
  "copilot.advanced": {
    "listCount": 10,
    "temperature": 0.8
  },
  
  // ==================================================
  // Optional: Agent-Specific Settings
  // ==================================================
  
  // Enable AGENTS.md support if using multiple AI agents
  "chat.useAgentsMdFile": false,
  
  // Enable nested AGENTS.md files for subfolder-level instructions (experimental)
  "chat.useNestedAgentsMdFiles": false,
  
  // Support Claude-based tools (.claude/CLAUDE.md)
  "chat.useClaudeMdFile": false
}
```

## Workspace-Specific Settings

If working on TikBook specifically, add these settings to `.vscode/settings.json` in your workspace:

```json
{
  // Prefer these settings for this workspace only
  "chat.includeApplyingInstructions": true,
  "chat.includeReferencedInstructions": true
}
```

## Verifying Instructions Are Loaded

1. Open Copilot Chat (⌃⌘I or ⌘I on Mac, Ctrl+Alt+I on Linux/Windows).
2. Right-click in the Chat view and select **Diagnostics**.
3. Look for entries showing `.github/copilot-instructions.md` is loaded.
4. Check the **References** section at the bottom of chat responses to see which instruction files were used.

## Tips for Using Copilot with TikBook

- **Start with `/init`**: Type `/init` in a new chat to generate workspace-specific instructions.
- **Use `/help`**: Type `/help` to see available slash commands.
- **Check references**: Skim the "References" section of responses to see what instruction files were used.
- **Lint frequently**: Run `npm run lint` to validate your changes against SARB rules.
- **Read llm-todos.md**: Before starting work, check for decision points and constraints.

## Troubleshooting

**Instructions not loading?**

- Verify `.github/copilot-instructions.md` exists in the repo root.
- Restart VS Code (not just reload window).
- Run Chat: Diagnostics to see error messages.

**Want file-specific rules?**

- Create `.instructions.md` files in `.github/instructions/` with YAML frontmatter and `applyTo` patterns.
- See VS Code docs on [custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions) for examples.

## References

- [VS Code Copilot Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [VS Code Settings UI](https://code.visualstudio.com/docs/getstarted/settings)
- [TikBook SARB Instructions](./sarb-instructions.md)
