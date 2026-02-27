/**
 * ESLint configuration for the project.
 *
 * Optimized for VS Code extension development with TypeScript and AI-assisted coding.
 * Includes type-aware linting rules for maximum safety and quality.
 *
 * Uses flat config format (recommended by typescript-eslint v8+).
 * See https://eslint.style and https://typescript-eslint.io for additional linting options.
 */
// @ts-check
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';
import vscodeSanity from './tools/eslint/vscode-sanity.mjs';

export default [
	{
		// Global ignores
		ignores: [
			'.vscode-test.mjs',
			'.vscode-test.js',
			'dist',
			'out',
			'**/*.d.ts',
			'**/vscode*.d.ts',
			'esbuild.js',
			'tools/**',
		]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.stylistic,
	{
		files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
		languageOptions: {
			parserOptions: {
				// Enable type-aware linting
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			}
		},
		plugins: {
			'@stylistic': stylistic,
			'vscode-sanity': vscodeSanity
		},
		rules: {
			// ============================================
			// Formatting & Code Style (Your Preferences)
			// ============================================
			'curly': ['error', 'multi-line'],
			'semi': ['off'],
			'eqeqeq': ['error', 'always'],
			'no-var': 'error',
			'prefer-const': 'error',
			'no-throw-literal': 'warn',
			
			// ============================================
			// TypeScript: Type Safety for AI Generation
			// ============================================
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/array-type': 'off',
			
			// Explicit return types: Critical for AI code quality
			'@typescript-eslint/explicit-function-return-type': [
				'warn',
				{
					allowExpressions: true,
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: true,
				}
			],
			
			// Async/Promise safety: Prevents silent failures in extensions
			'@typescript-eslint/no-floating-promises': [
				'error',
				{
					checkThenables: true,
				}
			],
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					checksConditionals: true,
					checksVoidReturn: true,
				}
			],
			'@typescript-eslint/return-await': ['error', 'in-try-catch'],
			
			// Modern TypeScript patterns: Helps AI learn best practices
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/prefer-optional-chain': 'warn',
			'@typescript-eslint/no-unnecessary-type-assertion': 'warn',
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{
					prefer: 'type-imports',
					fixStyle: 'separate-type-imports'
				}
			],
			'@typescript-eslint/no-misused-new': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'warn',
			
			// ============================================
			// VS Code Extension-Specific Rules (LLM-friendly)
			// ============================================
			
			// Prevent variable shadowing - common LLM mistake in nested scopes
			'no-shadow': [
				'warn',
				{
					builtinGlobals: false,
					hoist: 'all'
				}
			],
			
			// Require var/let/const for all variable declarations
			'@typescript-eslint/no-var-requires': 'warn',
			
			// Naming conventions
			'@typescript-eslint/naming-convention': [
				'warn',
				{
					'selector': 'import',
					'format': ['camelCase', 'PascalCase']
				}
			],
			
			// Unused variables
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					'argsIgnorePattern': '^_'
				}
			],
			
			// ============================================
			// VSCode Extension-Specific: Output Handling
			// ============================================
			
			// Prevent console.log in extension code - VSCode users only see OutputChannel
			// Extension Host (Node.js) console is private; users need window.createOutputChannel output
			'no-console': 'warn',
			
			// Catch async functions without await or Promise return
			// Helps LLM avoid accidental async declarations
			// Note: VSCode event handlers are async for error handling even without explicit await
			'@typescript-eslint/require-await': 'warn',

			// ============================================
			// VSCode Extension Web/Desktop Sanity Checks
			// ============================================
			'vscode-sanity/no-node-builtins-web': 'warn',
			'vscode-sanity/require-eventemitter-dispose': 'warn',
			'vscode-sanity/no-floating-disposable': 'warn',
			'vscode-sanity/vscode-api-version-compat': ['warn', { minVersion: '1.78.2' }],
		}
	},
	{
		// Extension code should be web-safe and avoid console output
		files: ['src/**/*.{js,mjs,cjs,ts,jsx,tsx}'],
		rules: {
			'no-console': 'error',
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{ name: 'fs', message: 'Use vscode.workspace.fs for file IO in extensions.' },
						{ name: 'path', message: 'Avoid Node path in web; prefer vscode.Uri and workspace.fs.' },
						{ name: 'util', message: 'Avoid Node util in web; prefer global TextEncoder/TextDecoder.' },
						{ name: 'child_process', message: 'Do not spawn processes from extension code.' },
						{ name: 'net', message: 'Node net is not available in web extension hosts.' },
						{ name: 'tls', message: 'Node tls is not available in web extension hosts.' },
						{ name: 'http', message: 'Use fetch/axios or vscode APIs; http is not web-safe.' },
						{ name: 'https', message: 'Use fetch/axios or vscode APIs; https is not web-safe.' },
						{ name: 'crypto', message: 'Node crypto is not available in web extension hosts.' },
						{ name: 'os', message: 'Node os is not available in web extension hosts.' },
						{ name: 'url', message: 'Prefer vscode.Uri and WHATWG URL APIs.' },
						{ name: 'zlib', message: 'Node zlib is not available in web extension hosts.' },
						{ name: 'stream', message: 'Node streams are not available in web extension hosts.' },
						{ name: 'buffer', message: 'Node Buffer is not available in web extension hosts.' },
					],
				}
			],
			'no-restricted-globals': [
				'error',
				{
					name: 'process',
					message: 'Avoid process usage in extension code; it is not available in web extension hosts.',
				}
			],
		}
	},
	{
		// Carve out: Not shipped - allow console in test/build code
		files: ['**/*.test.ts', '**/*.spec.ts', 'scripts/**', 'media/tools/**', 'esbuild.js'],
		rules: {
			'no-console': 'off'
		}
	},
	{
		// Tests and tooling are not web targets
		files: ['**/*.test.ts', '**/*.spec.ts', 'tools/eslint/**', 'src/test/**/*.ts'],
		rules: {
			'vscode-sanity/no-node-builtins-web': 'off',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'no-restricted-imports': 'off',
			'no-restricted-globals': 'off'
		}
	},
	{
		// Per-file allowlist for Node built-ins used in desktop-only branches
		files: ['src/routeros.ts'],
		rules: {
			'vscode-sanity/no-node-builtins-web': ['warn', { allow: ['https'] }],
			'no-restricted-imports': 'off'
		}
	},
	{
		files: ['src/virtualdocs.ts'],
		rules: {
			'vscode-sanity/no-node-builtins-web': ['warn', { allow: ['path'] }],
			'no-restricted-imports': 'off'
		}
	},
	{
		files: ['src/scriptfs.ts'],
		rules: {
			'vscode-sanity/no-node-builtins-web': ['warn', { allow: ['util'] }],
			'no-restricted-imports': 'off'
		}
	}
];