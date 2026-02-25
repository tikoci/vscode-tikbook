export const rules = {
  'no-node-builtins-web': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow Node.js built-in imports in web-compatible extension code.',
      },
      schema: [
        {
          type: 'object',
          properties: {
            allow: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          additionalProperties: false,
        },
      ],
      messages: {
        disallowed: "Node built-in module '{{name}}' is not web-compatible. Gate it behind env.uiKind or move to desktop-only code.",
      },
    },
    /**
     * @param {import('eslint').Rule.RuleContext} context
     * @returns {import('eslint').Rule.RuleListener}
     */
    create(context) {
      const options = context.options[0] ?? {}
      const allow = new Set(options.allow ?? [])
      const nodeBuiltins = new Set([
        'assert',
        'buffer',
        'child_process',
        'cluster',
        'console',
        'crypto',
        'dgram',
        'dns',
        'domain',
        'events',
        'fs',
        'http',
        'https',
        'module',
        'net',
        'os',
        'path',
        'perf_hooks',
        'process',
        'punycode',
        'querystring',
        'readline',
        'repl',
        'stream',
        'string_decoder',
        'sys',
        'timers',
        'tls',
        'tty',
        'url',
        'util',
        'vm',
        'worker_threads',
        'zlib',
      ])

      /**
       * @param {import('estree').Node} sourceNode
       * @param {string} name
       * @returns {void}
       */
      function reportIfDisallowed(sourceNode, name) {
        if (!nodeBuiltins.has(name)) return
        if (allow.has(name)) return
        context.report({ node: sourceNode, messageId: 'disallowed', data: { name } })
      }

      return {
        ImportDeclaration(node) {
          const source = node.source.value
          if (typeof source === 'string') {
            reportIfDisallowed(node.source, source)
          }
        },
        CallExpression(node) {
          if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
            const arg = node.arguments[0]
            if (arg?.type === 'Literal' && typeof arg.value === 'string') {
              reportIfDisallowed(arg, arg.value)
            }
          }
        },
        ImportExpression(node) {
          const source = node.source
          if (source?.type === 'Literal' && typeof source.value === 'string') {
            reportIfDisallowed(source, source.value)
          }
        },
      }
    },
  },

  'require-eventemitter-dispose': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Require VS Code EventEmitter instances to be disposed in dispose().',
      },
      schema: [],
      messages: {
        missingDispose: "EventEmitter '{{name}}' should be disposed in dispose().",
        missingDisposeMethod: 'Class defines EventEmitter instances but does not implement dispose().',
      },
    },
    /**
     * @param {import('eslint').Rule.RuleContext} context
     * @returns {import('eslint').Rule.RuleListener}
     */
    create(context) {
      const vscodeEmitterNames = new Set()

      /**
       * @param {import('estree').Node} node
       * @returns {boolean}
       */
      function isEmitterNewExpression(node) {
        if (node.type !== 'NewExpression') return false
        if (node.callee.type === 'Identifier') {
          return vscodeEmitterNames.has(node.callee.name)
        }
        if (node.callee.type === 'MemberExpression' && !node.callee.computed) {
          const property = node.callee.property
          return property.type === 'Identifier' && vscodeEmitterNames.has(property.name)
        }
        return false
      }

      /**
       * @param {import('estree').Node} key
       * @returns {string | null}
       */
      function getPropertyName(key) {
        if (!key) return null
        if (key.type === 'Identifier') return key.name
        if (key.type === 'Literal' && typeof key.value === 'string') return key.value
        return null
      }

      /**
       * @param {import('estree').Node} node
       * @param {(node: import('estree').Node) => void} onMatch
       * @returns {void}
       */
      function walk(node, onMatch) {
        const visited = new WeakSet()

        /**
         * @param {import('estree').Node} target
         * @returns {void}
         */
        function visit(target) {
          if (!target || typeof target !== 'object') return
          if (visited.has(target)) return
          visited.add(target)
          onMatch(target)

          for (const [key, value] of Object.entries(target)) {
            if (key === 'parent') continue
            if (Array.isArray(value)) {
              value.forEach(child => visit(child))
            }
            else if (value && typeof value.type === 'string') {
              visit(value)
            }
          }
        }

        visit(node)
      }

      /**
       * @param {import('estree').Node} methodNode
       * @param {string} propName
       * @returns {boolean}
       */
      function hasDisposeCall(methodNode, propName) {
        let found = false
        walk(methodNode.value.body, (node) => {
          if (found) return
          if (node.type !== 'CallExpression') return
          const callee = node.callee
          if (callee.type !== 'MemberExpression' || callee.computed) return
          if (callee.property.type !== 'Identifier' || callee.property.name !== 'dispose') return
          const target = callee.object
          if (target.type !== 'MemberExpression' || target.computed) return
          if (target.object.type !== 'ThisExpression') return
          if (target.property.type !== 'Identifier') return
          if (target.property.name === propName) found = true
        })
        return found
      }

      /**
       * @param {import('estree').Node} node
       * @returns {void}
       */
      function checkClass(node) {
        if (vscodeEmitterNames.size === 0) return
        const emitterProps = new Set()
        let disposeMethod = null

        for (const element of node.body.body) {
          if (element.type === 'PropertyDefinition') {
            if (element.value && isEmitterNewExpression(element.value)) {
              const propName = getPropertyName(element.key)
              if (propName) emitterProps.add(propName)
            }
          }
          else if (element.type === 'MethodDefinition') {
            const name = getPropertyName(element.key)
            if (name === 'dispose') disposeMethod = element
            if (name === 'constructor' && element.value?.body) {
              walk(element.value.body, (inner) => {
                if (inner.type !== 'AssignmentExpression') return
                if (inner.left.type !== 'MemberExpression' || inner.left.computed) return
                if (inner.left.object.type !== 'ThisExpression') return
                const prop = inner.left.property
                const propName = prop.type === 'Identifier' ? prop.name : null
                if (!propName) return
                if (isEmitterNewExpression(inner.right)) emitterProps.add(propName)
              })
            }
          }
        }

        if (emitterProps.size === 0) return
        if (!disposeMethod) {
          context.report({ node, messageId: 'missingDisposeMethod' })
          return
        }

        for (const propName of emitterProps) {
          if (!hasDisposeCall(disposeMethod, propName)) {
            context.report({ node: disposeMethod.key, messageId: 'missingDispose', data: { name: propName } })
          }
        }
      }

      return {
        ImportDeclaration(node) {
          if (node.source.value !== 'vscode') return
          for (const spec of node.specifiers) {
            if (spec.type !== 'ImportSpecifier') continue
            if (spec.imported.type !== 'Identifier') continue
            if (spec.imported.name !== 'EventEmitter') continue
            vscodeEmitterNames.add(spec.local.name)
          }
        },
        ClassDeclaration: checkClass,
        ClassExpression: checkClass,
      }
    },
  },

  'no-floating-disposable': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Require Disposable-returning VS Code API calls to be captured or returned.',
      },
      schema: [],
      messages: {
        floating: 'Disposable-returning call should be captured or returned so it can be disposed.',
      },
    },
    /**
     * @param {import('eslint').Rule.RuleContext} context
     * @returns {import('eslint').Rule.RuleListener}
     */
    create(context) {
      const disposableMethodNames = new Set([
        'createOutputChannel',
        'createFileSystemWatcher',
        'createTextEditorDecorationType',
        'createTreeView',
      ])

      /**
       * @param {import('estree').Node} node
       * @returns {boolean}
       */
      function isDisposableCall(node) {
        if (node.type !== 'CallExpression') return false
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.computed) return false
        const prop = callee.property
        if (prop.type !== 'Identifier') return false
        const name = prop.name
        if (name.startsWith('register') || name.startsWith('onDid')) return true
        if (disposableMethodNames.has(name)) return true
        return false
      }

      return {
        ExpressionStatement(node) {
          if (!node.expression) return
          if (isDisposableCall(node.expression)) {
            context.report({ node, messageId: 'floating' })
          }
        },
      }
    },
  },

  'vscode-api-version-compat': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Enforce VS Code API compatibility with minimum engine version.',
      },
      schema: [
        {
          type: 'object',
          properties: {
            minVersion: {
              type: 'string',
              description: 'Minimum VS Code version from engines.vscode (e.g., "1.78.2")'
            }
          },
          additionalProperties: false,
        },
      ],
      messages: {
        incompatibleApi: "VS Code API '{{api}}' requires version {{requiredVersion}}+ but minimum is {{minVersion}}. Use compatibility check or helper from vscode-compat.ts",
        incompatibleProperty: "Property '{{property}}' on '{{object}}' requires version {{requiredVersion}}+ but minimum is {{minVersion}}. Use compatibility check or helper from vscode-compat.ts",
      },
    },
    /**
     * @param {import('eslint').Rule.RuleContext} context
     * @returns {import('eslint').Rule.RuleListener}
     */
    create(context) {
      const options = context.options[0] ?? {}
      const minVersion = options.minVersion ?? '1.78.2'
      
      /**
       * Parse version string to comparable number
       * @param {string} version
       * @returns {number}
       */
      function parseVersion(version) {
        if (!version || typeof version !== 'string') return 0
        const match = version.match(/^(\d+)\.(\d+)\.?(\d+)?/)
        if (!match) return 0
        const major = parseInt(match[1], 10)
        const minor = parseInt(match[2], 10)
        const patch = parseInt(match[3] ?? '0', 10)
        return major * 1000000 + minor * 1000 + patch
      }
      
      const minVersionNum = parseVersion(minVersion)
      
      /**
       * VS Code APIs and their minimum version requirements
       * Based on https://code.visualstudio.com/updates/
       */
      const apiVersionMap = {
        // Output Channel with log option (1.74.0)
        'createOutputChannel': { version: '1.74.0', param: 1, hasLogOption: true },
        
        // Notebook APIs matured in 1.78.0
        'showNotebookDocument': { version: '1.78.0' },
        
        // window.activeNotebookEditor deprecated (still works but discouraged)
        'activeNotebookEditor': { version: '1.0.0', deprecated: true, replacement: 'getActiveNotebook() from vscode-compat' },
        
        // Tab groups API (1.48.0)
        'tabGroups': { version: '1.48.0' },
        
        // Testing API v2 (1.59.0)
        'createTestController': { version: '1.59.0' },
        
        // Authentication API (1.63.0)
        'authentication': { version: '1.63.0' },
        
        // Language model API (1.90.0)
        'lm': { version: '1.90.0' },
        
        // Chat API (1.90.0)
        'chat': { version: '1.90.0' },
        
        // LanguageModels (1.90.0)
        'selectChatModels': { version: '1.90.0' },
        
        // Inline completions (1.85.0)
        'registerInlineCompletionItemProvider': { version: '1.85.0' },
        
        // Notebook controllers enhanced (1.86.0)
        'NotebookCellOutput': { version: '1.86.0', enhanced: true },
        
        // File system provider readonly (1.78.0)
        'FileSystemProvider': { version: '1.78.0', readonly: true },
      }
      
      /**
       * Check if API requires newer version
       * @param {string} apiName
       * @param {string} requiredVersion
       * @returns {boolean}
       */
      function requiresNewerVersion(requiredVersion) {
        return parseVersion(requiredVersion) > minVersionNum
      }
      
      /**
       * @param {import('estree').Node} node
       * @param {string} apiName
       * @returns {void}
       */
      function checkApiVersion(node, apiName) {
        const apiInfo = apiVersionMap[apiName]
        if (!apiInfo || !apiInfo.version) return
        
        if (apiInfo.deprecated) {
          context.report({
            node,
            messageId: 'incompatibleApi',
            data: {
              api: apiName,
              requiredVersion: 'deprecated',
              minVersion,
            },
          })
          return
        }
        
        if (requiresNewerVersion(apiInfo.version)) {
          context.report({
            node,
            messageId: 'incompatibleApi',
            data: {
              api: apiName,
              requiredVersion: apiInfo.version,
              minVersion,
            },
          })
        }
      }
      
      /**
       * Check if createOutputChannel uses log option
       * @param {import('estree').CallExpression} node
       * @returns {void}
       */
      function checkCreateOutputChannel(node) {
        if (node.arguments.length < 2) return
        const secondArg = node.arguments[1]
        
        // Check for { log: true } pattern
        if (secondArg?.type === 'ObjectExpression') {
          for (const prop of secondArg.properties) {
            if (prop.type === 'Property' && !prop.computed) {
              const key = prop.key
              if (key.type === 'Identifier' && key.name === 'log') {
                if (requiresNewerVersion('1.74.0')) {
                  context.report({
                    node: secondArg,
                    messageId: 'incompatibleApi',
                    data: {
                      api: 'createOutputChannel({ log: true })',
                      requiredVersion: '1.74.0',
                      minVersion,
                    },
                  })
                }
                break
              }
            }
          }
        }
      }
      
      return {
        MemberExpression(node) {
          if (node.computed) return
          const prop = node.property
          if (prop.type !== 'Identifier') return
          
          // Check for window.activeNotebookEditor
          if (prop.name === 'activeNotebookEditor') {
            const obj = node.object
            if (obj.type === 'Identifier' && obj.name === 'window') {
              checkApiVersion(node, 'activeNotebookEditor')
            }
          }
          
          // Check for env.tabGroups, env.lm, env.chat, etc.
          if (apiVersionMap[prop.name]) {
            checkApiVersion(node, prop.name)
          }
        },
        
        CallExpression(node) {
          const callee = node.callee
          if (callee.type === 'MemberExpression' && !callee.computed) {
            const prop = callee.property
            if (prop.type === 'Identifier') {
              const methodName = prop.name
              
              // Special handling for createOutputChannel
              if (methodName === 'createOutputChannel') {
                checkCreateOutputChannel(node)
              }
              
              // Check other methods
              if (apiVersionMap[methodName]) {
                checkApiVersion(callee, methodName)
              }
            }
          }
        },
      }
    },
  },
}

export default {
  rules,
}
