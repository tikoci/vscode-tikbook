# VS Code Version Compatibility

## Supported Versions

**Minimum Required Version**: VS Code 1.78.2 (June 2023)

The TikBook extension is designed to support a wide range of VS Code versions. The extension includes runtime compatibility checks to ensure graceful degradation on older versions.

## Version Alignment

The following versions are configured in the project:

- **engines.vscode**: `^1.78.2` - Minimum VS Code version required
- **@types/vscode**: `^1.109.0` - Latest TypeScript definitions for full IntelliSense
- **typescript**: `^5.9.3` - TypeScript compiler
- **target**: `ES2024` - JavaScript compilation target

### Development vs Runtime Strategy

This project currently uses a **runtime-compatibility-first** approach plus lint
and review guardrails:

- **@types/vscode** uses the **latest version** to provide developers with full IntelliSense and autocomplete for all current VS Code APIs
- **Runtime compatibility layer** (`vscode-compat.ts`) provides graceful fallbacks for version-specific features
- **Archived rule metadata** in `tools/eslint/vscode-sanity.mjs` remains as reference for a future audit script, but it is not enforced by Biome today

This approach gives developers the best coding experience while keeping compatibility checks explicit in code, review, and runtime behavior.

### Key Benefits

- **Best Developer Experience**: Latest IntelliSense and autocomplete for all VS Code APIs, type-ahead suggestions for new features
- **Build-Time Safety**: Biome and TypeScript catch many issues, while version compatibility still relies on `vscode-compat.ts` and reviewer attention
- **Wide Version Support**: Supports VS Code 1.78.2+ (June 2023) with graceful degradation
- **Runtime Safety**: Detects version at startup, warns users if below minimum, logs unavailable optional features
- **Maintainable**: `vscode-compat.ts` is the live compatibility layer; the archived rule map remains a reference if we revive automated API-version auditing
- **No Breaking Changes**: Existing functionality preserved with fallbacks for newer APIs

### Archived compatibility rule (`vscode-api-version-compat`)

This rule lives in `tools/eslint/vscode-sanity.mjs` as archived reference only.
It no longer runs after the Biome migration, but the tracked API list is still
useful if we build a dedicated compatibility audit later:

- **Smart Detection**:
  - Checks method calls (e.g., `window.createOutputChannel()`)
  - Checks property access (e.g., `window.tabGroups`, `vscode.lm`)
  - Detects deprecated APIs (e.g., `window.activeNotebookEditor`)
  - Special handling for options (e.g., `createOutputChannel({ log: true })`)
- **Configurable**: Takes `minVersion` parameter (currently set to '1.78.2')
- **Current status**: Not automatically enforced in the Biome toolchain
- **Clear Messages**: Provides helpful error messages with version requirements and suggests using vscode-compat.ts

#### Tracked APIs

The lint rule currently tracks these VS Code APIs:

- Output channels with log option (1.74.0)
- Deprecated activeNotebookEditor (suggests using vscode-compat helper)
- Tab Groups API (1.48.0)
- Testing API v2 (1.59.0)
- Authentication API (1.63.0)
- showNotebookDocument (1.78.0)
- FileSystemProvider readonly support (1.78.0)
- Inline Completions (1.85.0)
- Enhanced Notebook Output (1.86.0)
- Language Model API (1.90.0)
- selectChatModels (1.90.0)
- Chat API (1.90.0)

## Runtime Compatibility Checking

The extension includes a comprehensive compatibility layer in `src/vscode-compat.ts` that:

1. **Version Detection**: Automatically detects the running VS Code version at startup
2. **Feature Flags**: Provides feature availability flags for version-specific APIs
3. **Graceful Degradation**: Falls back to alternative implementations when newer APIs aren't available
4. **User Warnings**: Displays warnings if running on unsupported versions or if features are unavailable

### Startup Logging

On activation, the extension logs comprehensive environment information:

- VS Code variant (standard, Insiders, VSCodium, Cursor, etc.)
- Version number
- UI kind (web or desktop)
- Application details (name, URI scheme)
- Language/locale
- Remote context if applicable
- Shell information (desktop only)
- Web-specific limitations
- Whether minimum requirements are met
- Available and unavailable optional features
- Warnings for any missing capabilities

Example startup log output (desktop):

```text
[INFO] ========================================
[INFO] Environment: VS Code 1.95.3
[INFO] UI Kind: desktop
[INFO] App Name: Visual Studio Code
[INFO] URI Scheme: vscode
[INFO] Language: en
[INFO] Shell: /bin/zsh
[INFO] ========================================
[INFO] Minimum required version: 1.78.2
[INFO] Available features: Notebook API, Tab Groups, File System Provider
[INFO] Initialization complete
```

Example startup log output (web):

```text
[INFO] ========================================
[INFO] Environment: VS Code 1.95.3
[INFO] UI Kind: web
[INFO] App Name: Visual Studio Code
[INFO] URI Scheme: vscode
[INFO] Language: en
[INFO] Running in browser - some features may be limited:
[INFO]   - No direct file system access
[INFO]   - No terminal execution (SSH commands unavailable)
[INFO]   - Certificate validation always required for HTTPS
[INFO] ========================================
[INFO] Minimum required version: 1.78.2
[INFO] Available features: Notebook API, Tab Groups, Authentication
[INFO] Initialization complete
```

## Feature Version Requirements

| Feature | Minimum Version | Handled By |
|---------|----------------|------------|
| Log Output Channel | 1.74.0 | `createOutputChannel()` |
| Notebook API (Stable) | 1.78.0 | Core requirement |
| Tab Groups API | 1.48.0 | `getActiveNotebook()` |
| Enhanced Notebook Output | 1.86.0 | Optional enhancement |
| Authentication API | 1.63.0 | Optional feature |

## API Compatibility Helpers

### `getActiveNotebook()`

Safely retrieves the active notebook, handling the deprecated `window.activeNotebookEditor` API:

```typescript
import { getActiveNotebook } from './vscode-compat'

const notebook = getActiveNotebook() // Works across versions
```

### `createOutputChannel()`

Creates an output channel with optional logging support, gracefully falling back on older versions:

```typescript
import { createOutputChannel } from './vscode-compat'

const log = createOutputChannel('My Extension', true) // Enables logging if supported
```

### Feature Checks

Check feature availability before using optional APIs:

```typescript
import { features, getEnvironmentInfo } from './vscode-compat'

// Check if running in web vs desktop
const envInfo = getEnvironmentInfo()
if (envInfo.isWeb) {
  // Provide web-appropriate UI
  window.showInformationMessage('SSH not available in web version')
} else {
  // Full desktop functionality
  openSSHTerminal()
}

// Check feature flags
if (features.notebookEnhancedOutput) {
  // Use enhanced output APIs
} else {
  // Use fallback approach
}
```

## Testing Across Versions

To test compatibility with different VS Code versions:

1. **Update engines.vscode** in package.json temporarily
2. **Run compilation**: `npm run compile`
3. **Check for errors**: TypeScript will flag incompatible APIs
4. **Test in VS Code**: Install and test in the target version

## Best Practices

1. **Always use compatibility helpers** instead of direct VS Code APIs when available
2. **Check feature flags** before using optional APIs
3. **Add new APIs** to `vscode-compat.ts` when using features from newer versions
4. **Watch for compatibility risks** - there is no automatic API-version lint today, so lean on `vscode-compat.ts`, review, and minimum-version testing
5. **Log warnings** for missing features rather than failing silently
6. **Test on minimum version** regularly to ensure compatibility
7. **Keep the archived API version map updated** in `tools/eslint/vscode-sanity.mjs` if we still want it as source material for a future compatibility audit

## Adding New VS Code APIs

When you need to use APIs from newer VS Code versions:

1. Check the minimum version requirement in [VS Code API docs](https://code.visualstudio.com/updates/)
2. Add a helper or feature flag to `vscode-compat.ts` if runtime checking is needed
3. Use conditional logic based on the feature flag in your code
4. Test on the minimum version (1.78.2) because no automatic version-compat lint will catch this for you
5. Update the archived version map in `tools/eslint/vscode-sanity.mjs` if you want to preserve the knowledge for a future audit
6. Update this documentation if the API is significant

## Updating Minimum Version

To update the minimum supported VS Code version:

1. Update `engines.vscode` in package.json
2. Remove obsolete feature checks from `src/vscode-compat.ts` for APIs now universally available
3. Clean up the archived version map in `tools/eslint/vscode-sanity.mjs` if desired
4. Update this documentation
5. Test thoroughly on the new minimum version
6. Update CHANGELOG.md with breaking changes if applicable

## Implementation Details

This compatibility system was implemented across several files:

### Core Files

- **`src/vscode-compat.ts`**: Compatibility layer with version detection, feature flags, and helper functions
- **`tools/eslint/vscode-sanity.mjs`**: Archived reference for the old `vscode-api-version-compat` rule and other custom checks
- **`src/extension.ts`**: Calls `logVersionInfo(log)` at startup for diagnostics

### Updated Files

- **`src/notebook.ts`**: Updated 3 instances to use `getActiveNotebook()` helper instead of deprecated `window.activeNotebookEditor`
- **`src/virtualdocs.ts`**: Updated 2 instances to use `getActiveNotebook()` helper
- **`src/shared.ts`**: Creates log channel directly with try/catch fallback (resolved circular dependency)
- **`src/scriptfs.ts`** & **`src/schema-mapper.ts`**: Use inline log channel creation with fallback

### Circular Dependency Resolution

An initial circular dependency between `vscode-compat.ts` and `shared.ts` was resolved by:

- Having `shared.ts` create the log channel directly with try/catch fallback
- Having `vscode-compat.ts` accept the log channel as a parameter instead of importing it
- Other files using inline log channel creation where needed

## Web vs Desktop

The extension supports both VS Code Desktop and VS Code for the Web (vscode.dev). The environment is automatically detected at startup and appropriate warnings are logged.

### Desktop Features

- Full file system access via File System Provider
- SSH terminal support for remote router access  
- Flexible certificate validation options
- All notebook features

### Web Limitations

- No direct file system access (VFS only)
- No terminal/SSH commands
- HTTPS certificate must be valid and trusted
- Some Node.js-specific features unavailable

The startup log clearly identifies which environment you're running in and what limitations apply.

### Environment Detection

The extension can detect various VS Code variants:

- **VS Code** - Standard distribution
- **VS Code Insiders** - Preview/beta version
- **VSCodium** - Open source build
- **Cursor** - AI-powered editor fork
- **VS Code OSS** - Open source version

This information is logged at startup and can be accessed via `getEnvironmentInfo()` in code.

## Troubleshooting

### Extension fails to activate

Check the Output panel (View → Output → TikBook for RouterOS) for version compatibility warnings.

### Features not working

Look for these log messages:

```text
[WARN] <vscode-compat> Some optional features are unavailable in VS Code X.X.X
```

### Lint warnings about incompatible APIs

If you see warnings like:

```text
warning  VS Code API 'chat' requires version 1.90.0+ but minimum is 1.78.2
```

You're using an API that's too new for the minimum supported version. You should:

1. Wrap the API access in a feature check from `vscode-compat.ts`
2. Provide a fallback implementation or disable the feature for older versions
3. Or update the minimum version requirement if the feature is essential

If a future compatibility audit flags a deliberate use site in the compatibility layer itself, document why the direct access is safe:

```typescript
// Deliberate direct access inside the compatibility layer; guarded by version checks.
const result = vscode.someNewApi()
```

## Additional Resources

- [VS Code API Documentation](https://code.visualstudio.com/api/references/vscode-api)
- [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Semantic Versioning](https://semver.org/)
