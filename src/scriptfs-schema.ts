export interface SchemaEntry {
  path: string
  isList?: boolean
  singleton?: boolean
  idAttr?: string
  nameAttr?: string
  scriptAttrs: string[]
  printBody?: Record<string, unknown>
  createSupported?: boolean
  updateSupported?: boolean
  deleteSupported?: boolean
  filenameTemplate?: string
  multiFilePerItem?: boolean
  readOnly?: boolean
  metadataAttrs?: string[]
  displayLabel?: string
  description?: string
  parentPath?: string // for nested resources like /ip/dhcp/server/<name>/alert
  languageId?: string // language ID for syntax highlighting (default: RouterOS)
}

/**
 * Schema definitions for RouterOS paths that contain script content.
 * Each entry describes how the vscode-tikbook extension maps a RouterOS REST path
 * to the virtual rscfile:// filesystem.
 *
 * Supported properties:
 * - path: RouterOS REST API path (e.g., /system/script)
 * - isList: whether the path returns a list (default: true for most paths)
 * - singleton: whether the path represents a single resource (e.g., /system/routerboard)
 * - idAttr: attribute name for the item ID (typically '.id' for RouterOS)
 * - nameAttr: attribute name used as item name/identifier (typically 'name')
 * - scriptAttrs: array of attributes that contain script/code content
 * - printBody: optional REST filter parameters (used in list queries, e.g., type=script)
 * - createSupported: whether items can be created
 * - updateSupported: whether items can be updated
 * - deleteSupported: whether items can be deleted
 * - filenameTemplate: template for generating filenames (e.g., '${name}.rsc')
 * - multiFilePerItem: if true, each scriptAttr becomes a separate file; if false, concatenates
 * - readOnly: if true, item is not modifiable or deletable
 * - metadataAttrs: additional attributes to include as metadata/comments
 * - displayLabel: display name for the resource in the UI
 * - description: documentation about this schema entry
 * - parentPath: for nested resources (e.g., /ip/dhcp-server/<name>/alert)
 *
 * Paths are verified at filesystem initialization via /console/inspect to ensure
 * they exist on the target RouterOS device, accounting for package/arch differences.
 */
export const scriptfsSchema: SchemaEntry[] = [
  // SYSTEM paths
  {
    path: '/system/script',
    isList: true,
    idAttr: '.id',
    nameAttr: 'name',
    scriptAttrs: ['source'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${name}.rsc',
    multiFilePerItem: false,
    metadataAttrs: ['comment', 'owner', 'policy', 'dont-require-permissions'],
    displayLabel: 'System Scripts',
    description: 'System-wide scripts stored in /system/script',
    languageId: 'RouterOS',
  },
  {
    path: '/system/scheduler',
    isList: true,
    idAttr: '.id',
    nameAttr: 'name',
    scriptAttrs: ['on-event'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${name}',
    multiFilePerItem: false,
    metadataAttrs: ['interval', 'disabled'],
    displayLabel: 'System Schedulers',
    description: 'System scheduler entries with on-event scripts executed on interval/events',
    languageId: 'RouterOS',
  },
  {
    path: '/system/routerboard',
    singleton: true,
    idAttr: '.id',
    scriptAttrs: ['mode-button', 'reset-button', 'wps-button'],
    readOnly: false,
    createSupported: false,
    updateSupported: true,
    deleteSupported: false,
    filenameTemplate: '${name}',
    multiFilePerItem: true,
    metadataAttrs: ['model', 'serial-number'],
    displayLabel: 'RouterBoard',
    description: 'RouterBoard button event scripts (mode-button, reset-button, wps-button)',
    languageId: 'RouterOS',
  },

  // LOGGING paths
  {
    path: '/system/logging/action',
    isList: true,
    idAttr: '.id',
    nameAttr: 'name',
    scriptAttrs: ['script'],
    printBody: { target: 'script' },
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${name}',
    multiFilePerItem: false,
    metadataAttrs: ['target'],
    displayLabel: 'Logging Actions (script type)',
    description: 'Logging actions of type "script" that execute custom scripts on log events',
    languageId: 'RouterOS',
  },

  // INTERFACE paths
  {
    path: '/interface/vrrp',
    isList: true,
    idAttr: '.id',
    nameAttr: 'name',
    scriptAttrs: ['on-master', 'on-backup'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${name}',
    multiFilePerItem: true,
    metadataAttrs: ['interface', 'vrid', 'priority'],
    displayLabel: 'VRRP Interfaces',
    description: 'Virtual Router Redundancy Protocol interfaces with on-master/on-backup event scripts',
    languageId: 'RouterOS',
  },

  // IP DHCP paths
  {
    path: '/ip/dhcp-client',
    isList: true,
    idAttr: '.id',
    nameAttr: 'interface',
    scriptAttrs: ['script'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${interface}',
    multiFilePerItem: false,
    metadataAttrs: ['disabled', 'interface'],
    displayLabel: 'DHCP Clients',
    description: 'DHCP client entries with scripts executed on DHCP events',
    languageId: 'RouterOS',
  },
  {
    path: '/ip/dhcp-server',
    isList: true,
    idAttr: '.id',
    nameAttr: 'name',
    scriptAttrs: ['lease-script'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${name}',
    multiFilePerItem: false,
    metadataAttrs: ['interface', 'disabled'],
    displayLabel: 'DHCP Servers',
    description: 'DHCP server entries with lease scripts executed on lease events',
    languageId: 'RouterOS',
  },
  {
    path: '/ip/dhcp-server/alert',
    isList: true,
    idAttr: '.id',
    nameAttr: 'interface',
    scriptAttrs: ['on-alert'],
    parentPath: '/ip/dhcp-server',
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${interface}-alert',
    multiFilePerItem: false,
    displayLabel: 'DHCP Server Alerts',
    description: 'Alert scripts for DHCP server events (nested under DHCP servers)',
    languageId: 'RouterOS',
  },

  // IPv6 DHCP paths
  {
    path: '/ipv6/dhcp-client',
    isList: true,
    idAttr: '.id',
    nameAttr: 'interface',
    scriptAttrs: ['script'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${interface}',
    multiFilePerItem: false,
    metadataAttrs: ['disabled', 'interface'],
    displayLabel: 'DHCPv6 Clients',
    description: 'DHCPv6 client entries with scripts executed on DHCPv6 events',
    languageId: 'RouterOS',
  },
  {
    path: '/ipv6/dhcp-server',
    isList: true,
    idAttr: '.id',
    nameAttr: 'name',
    scriptAttrs: ['binding-script'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${name}',
    multiFilePerItem: false,
    metadataAttrs: ['interface', 'disabled'],
    displayLabel: 'DHCPv6 Servers',
    description: 'DHCPv6 server entries with binding scripts executed on binding events',
    languageId: 'RouterOS',
  },

  // IPv6 Hotspot paths
  {
    path: '/ipv6/hotspot/user-profile',
    isList: true,
    idAttr: '.id',
    nameAttr: 'name',
    scriptAttrs: ['on-login', 'on-logout'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${name}',
    multiFilePerItem: true,
    metadataAttrs: ['traffic-limit'],
    displayLabel: 'IPv6 Hotspot User Profiles',
    description: 'IPv6 hotspot user profiles with on-login/on-logout event scripts',
    languageId: 'RouterOS',
  },

  // TOOL paths
  {
    path: '/tool/netwatch',
    isList: true,
    idAttr: '.id',
    nameAttr: 'host',
    scriptAttrs: ['on-up', 'on-down', 'on-test'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${host}',
    multiFilePerItem: true,
    metadataAttrs: ['host', 'interval', 'disabled'],
    displayLabel: 'Netwatch',
    description: 'Network monitoring entries with on-up/on-down/on-test scripts; file names use host= or host-.id',
    languageId: 'RouterOS',
  },
  {
    path: '/tool/traffic-monitor',
    isList: true,
    idAttr: '.id',
    nameAttr: 'name',
    scriptAttrs: ['on-event'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${name}',
    multiFilePerItem: false,
    metadataAttrs: ['interface', 'disabled'],
    displayLabel: 'Traffic Monitors',
    description: 'Traffic monitoring entries with on-event scripts',
    languageId: 'RouterOS',
  },

  // PPP paths
  {
    path: '/ppp/profile',
    isList: true,
    idAttr: '.id',
    nameAttr: 'name',
    scriptAttrs: ['on-up', 'on-down'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${name}',
    multiFilePerItem: true,
    metadataAttrs: ['bridge', 'disabled'],
    displayLabel: 'PPP Profiles',
    description: 'PPP connection profiles with on-up/on-down event scripts',
    languageId: 'RouterOS',
  },

  // IoT paths (MQTT and GPIO)
  {
    path: '/iot/mqtt/subscriptions',
    isList: true,
    idAttr: '.id',
    nameAttr: 'topic',
    scriptAttrs: ['on-message'],
    createSupported: true,
    updateSupported: true,
    deleteSupported: true,
    filenameTemplate: '${topic}',
    multiFilePerItem: false,
    metadataAttrs: ['broker'],
    displayLabel: 'MQTT Subscriptions',
    description: 'MQTT message subscriptions with on-message scripts executed on message arrival',
    languageId: 'RouterOS',
  },
  {
    path: '/iot/gpio/digital',
    singleton: true,
    idAttr: '.id',
    scriptAttrs: ['script'],
    readOnly: false,
    createSupported: false,
    updateSupported: true,
    deleteSupported: false,
    filenameTemplate: 'gpio-digital.script',
    displayLabel: 'GPIO Digital Control',
    description: 'GPIO digital control script resource',
    languageId: 'RouterOS',
  },
]

export default scriptfsSchema
