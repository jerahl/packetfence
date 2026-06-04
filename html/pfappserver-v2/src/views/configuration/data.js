// Data for the Configuration workspace — direct port from the
// design's configuration.jsx. Three exports:
//
//   CFG_TREE    The nav rail: six groups (Policies / Compliance /
//               Integration / Advanced Access / Network / System)
//               and 38 leaves, each with a stable id used as the
//               key into CFG_VIEWS / CFG_FORMS / the custom view map.
//   CFG_VIEWS   Leaves rendered as a list table. The shape is the
//               same as the design's: { title, sub, list: { ... } }
//               where `list` carries `cols`, `rows`, and indices
//               into rows[] for which column should render as a
//               status chip, an info chip, monospace, or accented.
//   CFG_FORMS   Leaves rendered as a form. Each `fields` entry is
//               [label, hint, kind, value, ...rest] where `kind`
//               is one of: text | mono | password | select | toggle
//               | segmented. The Field renderer dispatches on it.

export const CFG_TREE = [
  { group: 'Policies and Access Control', icon: 'policies', items: [
    { id: 'roles',        label: 'Roles', badge: '9' },
    { id: 'domains',      label: 'Domains' },
    { id: 'realms',       label: 'Realms' },
    { id: 'sources',      label: 'Authentication Sources', badge: '10' },
    { id: 'switches',     label: 'Network Devices' },
    { id: 'switchgroups', label: 'Switch Groups' },
    { id: 'profiles',     label: 'Connection Profiles', badge: '7' },
    { id: 'selfservice',  label: 'Self Service Portal' },
    { id: 'filters',      label: 'Filter Engines' },
  ]},
  { group: 'Compliance', icon: 'shield', items: [
    { id: 'fingerbank',  label: 'Fingerbank Profiling' },
    { id: 'scanengines', label: 'Scan Engines' },
    { id: 'secevents',   label: 'Security Events', badge: '31' },
    { id: 'wmi',         label: 'WMI Rules' },
  ]},
  { group: 'Integration', icon: 'link', items: [
    { id: 'firewallsso',  label: 'Firewall SSO' },
    { id: 'webservices',  label: 'Web Services' },
    { id: 'eventhandlers',label: 'Event Handlers' },
    { id: 'syslog',       label: 'Syslog Forwarders' },
    { id: 'pki',          label: 'PKI Providers' },
    { id: 'cloud',        label: 'Cloud Services' },
  ]},
  { group: 'Advanced Access Configuration', icon: 'globe', items: [
    { id: 'captive',      label: 'Captive Portal' },
    { id: 'portalmod',    label: 'Portal Modules' },
    { id: 'provisioners', label: 'Provisioners' },
    { id: 'billing',      label: 'Billing Tiers' },
    { id: 'duration',     label: 'Access Duration' },
  ]},
  { group: 'Network Configuration', icon: 'network', items: [
    { id: 'networks',   label: 'Networks' },
    { id: 'interfaces', label: 'Interfaces' },
    { id: 'floating',   label: 'Floating Devices' },
    { id: 'snmp',       label: 'SNMP Traps' },
    { id: 'dhcpdns',    label: 'DHCP & DNS' },
    { id: 'shaping',    label: 'Traffic Shaping' },
  ]},
  { group: 'System Configuration', icon: 'settings', items: [
    { id: 'general',     label: 'General Configuration' },
    { id: 'alerting',    label: 'Alerting' },
    { id: 'advanced',    label: 'Advanced' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'services',    label: 'Services' },
    { id: 'database',    label: 'Database' },
    { id: 'cluster',     label: 'Active Active' },
    { id: 'radius',      label: 'RADIUS' },
    { id: 'ssl',         label: 'SSL Certificates' },
    { id: 'adminaccess', label: 'Admin Access' },
  ]},
]

// Maps a free-form cell value to one of the chip variants the global
// .chip styling supports — same heuristic the design uses.
export function chipFor(val) {
  const v = String(val).toLowerCase()
  if (['enabled', 'online', 'active', 'connected', 'ok', 'valid', 'running', 'joined', 'up', 'on', 'yes'].includes(v)) return 'ok'
  if (['disabled', 'stopped', 'offline', 'off', 'no'].includes(v)) return ''
  if (['warning', 'degraded', 'expiring'].includes(v)) return 'warn'
  if (['error', 'failed', 'isolation', 'expired'].includes(v)) return 'bad'
  return 'info'
}

const ROLE_ROWS = [
  ['employee', 'Corporate staff — full access', '—', '100', 'default', '—'],
  ['contractor', 'Temporary external workers', '5', '110', 'default', '—'],
  ['guest', 'Visitor self-registered access', '3', '200', 'guest', '—'],
  ['byod', 'Personal device onboarding', '2', '120', 'default', '—'],
  ['voip', 'Voice over IP handsets', '—', '30', 'voice', '—'],
  ['iot-trusted', 'Approved IoT / sensors', '—', '40', 'iot', '—'],
  ['iot-quarantine', 'Untrusted IoT segment', '—', '666', 'quarantine', '—'],
  ['registration', 'Captive portal registration', '—', '2', 'registration', '—'],
  ['isolation', 'Remediation / isolation', '—', '999', 'isolation', '—'],
]
const SOURCE_ROWS = [
  ['AD-Corp', 'Active Directory', 'Primary corp directory', 'internal'],
  ['RADIUS-Backup', 'RADIUS', 'Secondary RADIUS proxy', 'internal'],
  ['LDAP-Eng', 'LDAP', 'Engineering OpenLDAP', 'internal'],
  ['SQL-Local', 'SQL', 'Built-in local accounts', 'internal'],
  ['Kerberos-Corp', 'Kerberos', 'Corp KDC realm', 'internal'],
  ['SMS-Twilio', 'SMS', 'Guest SMS PIN (Twilio)', 'external'],
  ['Sponsor-Email', 'Email', 'Sponsored guest approval', 'external'],
  ['SAML-Okta', 'SAML', 'Okta SSO federation', 'external'],
  ['OAuth-Google', 'OAuth2', 'Google social login', 'external'],
  ['Null-Guest', 'Null', 'Click-through guest', 'exclusive'],
]
const SECEVENT_ROWS = [
  ['1100001', 'Suspicious DNS to known C2', 'enabled', 'detect', 'isolation'],
  ['1100002', 'Unauthorized MAC change', 'enabled', 'internal', 'registration'],
  ['1200010', 'EAP-TLS certificate expired', 'enabled', 'internal', 'reevaluate'],
  ['1300004', 'Posture: missing AV process', 'enabled', 'nessus', 'isolation'],
  ['1300005', 'Rogue DHCP on segment', 'enabled', 'suricata', 'email_admin'],
  ['2000001', 'Off-hours connection', 'disabled', 'accounting', 'log'],
  ['2400003', 'Bandwidth quota exceeded', 'enabled', 'accounting', 'isolation'],
]
const PROFILE_ROWS = [
  ['Corporate Wi-Fi (802.1X)', '10', 'ssid == "CORP-WPA2EAP"', 'AD-Corp', 'enabled'],
  ['BYOD Onboarding', '20', 'ssid == "BYOD-Onboard"', 'AD-Corp', 'enabled'],
  ['Guest Captive Portal', '30', 'ssid == "GUEST-Captive"', 'SMS-Twilio', 'enabled'],
  ['IoT Pre-Shared', '40', 'ssid == "IOT-PSK"', 'MAC-Auth', 'enabled'],
  ['VoIP Phones', '50', 'lldp.cap ~ "Phone"', 'MAC-Auth', 'enabled'],
  ['Conference (Wired)', '60', 'switch in [fl3,fl4]', 'AD-Corp', 'disabled'],
  ['Quarantine Isolation', '5', 'security_event.active', 'Internal', 'enabled'],
]

export const CFG_VIEWS = {
  roles: {
    title: 'Roles', sub: '9 roles · mapped to VLANs, ACLs or external roles',
    list: { newLabel: 'New Role',
      cols: ['Name', 'Notes', 'Max devices', 'VLAN', 'Parent', 'Included roles'],
      rows: ROLE_ROWS, accentCol: 0 } },
  sources: {
    title: 'Authentication Sources', sub: 'Tested top-to-bottom · first match wins · drag to reorder',
    list: { newLabel: 'New Source', reorder: true,
      cols: ['Name', 'Type', 'Description', 'Class'],
      rows: SOURCE_ROWS, accentCol: 0, chipCol: 1 } },
  secevents: {
    title: 'Security Events', sub: '31 event definitions · triggers map to enforcement actions',
    list: { newLabel: 'New Security Event',
      cols: ['Identifier', 'Description', 'Status', 'Trigger', 'Action'],
      rows: SECEVENT_ROWS, accentCol: 1, monoCol: 0, statusCol: 2, chipCol: 4 } },
  profiles: {
    title: 'Connection Profiles', sub: 'Evaluated by priority · matched against connection metadata',
    list: { newLabel: 'New Connection Profile', reorder: true,
      cols: ['Name', 'Priority', 'Filter', 'Source', 'Status'],
      rows: PROFILE_ROWS, accentCol: 0, monoCol: 2, statusCol: 4 } },
  domains: {
    title: 'Domains', sub: 'Active Directory domains for machine authentication',
    list: { newLabel: 'New Domain',
      cols: ['Identifier', 'Workgroup', 'DNS Name', 'Bind DN', 'Status'],
      rows: [
        ['corp-nyc', 'CORP', 'corp.example.net', 'svc-pf@corp', 'joined'],
        ['corp-bos', 'CORP', 'bos.example.net', 'svc-pf@corp', 'joined'],
        ['lab-domain', 'LAB', 'lab.example.net', 'svc-lab@lab', 'error'],
      ], accentCol: 0, statusCol: 4 } },
  realms: {
    title: 'Realms', sub: 'Map RADIUS realms / domains to authentication & domains',
    list: { newLabel: 'New Realm',
      cols: ['Realm', 'Domain', 'Portal strip', 'Auth source', 'Status'],
      rows: [
        ['corp.example.net', 'corp-nyc', 'yes', 'AD-Corp', 'enabled'],
        ['bos.example.net', 'corp-bos', 'yes', 'AD-Corp', 'enabled'],
        ['DEFAULT', '—', 'no', 'SQL-Local', 'enabled'],
        ['null', '—', 'no', 'Null-Guest', 'enabled'],
      ], accentCol: 0, statusCol: 4 } },
  switches: {
    title: 'Network Devices', sub: 'Switches, controllers & APs managed by PacketFence',
    list: { newLabel: 'New Switch',
      cols: ['Identifier', 'Description', 'Type', 'Mode', 'Group', 'Status'],
      rows: [
        ['10.1.0.11', 'core-sw-01.nyc', 'Cisco Catalyst 9300', 'production', 'Core', 'online'],
        ['10.1.0.12', 'core-sw-02.nyc', 'Cisco Catalyst 9300', 'production', 'Core', 'online'],
        ['10.1.3.10', 'dist-sw-fl3.nyc', 'Aruba 6300M', 'production', 'Access', 'online'],
        ['10.1.4.10', 'dist-sw-fl4.nyc', 'Juniper EX4400', 'production', 'Access', 'degraded'],
        ['10.1.9.20', 'ap-controller-01', 'Cisco WLC 9800', 'production', 'Wireless', 'online'],
        ['10.1.9.21', 'ap-controller-02', 'Meraki MR Cloud', 'production', 'Wireless', 'online'],
        ['10.0.0.1', 'edge-fw-01.dmz', 'Fortinet FortiGate', 'inline', 'Edge', 'online'],
      ], accentCol: 1, monoCol: 0, statusCol: 5 } },
  switchgroups: {
    title: 'Switch Groups', sub: 'Apply shared configuration across network devices',
    list: { newLabel: 'New Switch Group',
      cols: ['Name', 'Members', 'Type', 'Description'],
      rows: [
        ['Core', '2', 'Cisco Catalyst', 'Backbone distribution'],
        ['Access', '2', 'Mixed', 'Floor access layer'],
        ['Wireless', '2', 'WLC', 'Wireless controllers'],
        ['Edge', '1', 'FortiGate', 'DMZ / inline'],
      ], accentCol: 0 } },
  scanengines: {
    title: 'Scan Engines', sub: 'Vulnerability & posture assessment engines',
    list: { newLabel: 'New Scan Engine',
      cols: ['Name', 'Type', 'Host', 'Scan on', 'Status'],
      rows: [
        ['nessus-prod', 'Nessus', '10.2.0.40:8834', 'registration', 'enabled'],
        ['rapid7-insightvm', 'Rapid7', '10.2.0.41', 'post-registration', 'enabled'],
        ['openvas-lab', 'OpenVAS', '10.2.0.42:9390', 'manual', 'disabled'],
        ['wmi-posture', 'WMI', 'domain corp-nyc', 'registration', 'enabled'],
      ], accentCol: 0, chipCol: 1, statusCol: 4 } },
  wmi: {
    title: 'WMI Rules', sub: 'Windows Management Instrumentation posture queries',
    list: { newLabel: 'New WMI Rule',
      cols: ['Name', 'Namespace', 'Request', 'Action'],
      rows: [
        ['av-running', 'root\\SecurityCenter2', 'SELECT * FROM AntiVirusProduct', '—'],
        ['disk-encryption', 'root\\cimv2', 'SELECT * FROM Win32_EncryptableVolume', 'isolate'],
        ['patch-level', 'root\\cimv2', 'SELECT * FROM Win32_QuickFixEngineering', '—'],
      ], accentCol: 0, monoCol: 2 } },
  firewallsso: {
    title: 'Firewall SSO', sub: 'Push identity → IP mappings to perimeter firewalls',
    list: { newLabel: 'New Firewall',
      cols: ['Name', 'Type', 'Host', 'Roles', 'Status'],
      rows: [
        ['palo-edge', 'Palo Alto', '10.0.0.5', 'employee, byod', 'enabled'],
        ['forti-dmz', 'FortiGate', '10.0.0.1', 'all', 'enabled'],
        ['checkpoint-hq', 'Checkpoint', '10.0.0.7', 'employee', 'disabled'],
      ], accentCol: 0, chipCol: 1, statusCol: 4 } },
  eventhandlers: {
    title: 'Event Handlers', sub: 'pfdetect parsers for external alert pipelines',
    list: { newLabel: 'New Event Handler',
      cols: ['Name', 'Type', 'Source', 'Status'],
      rows: [
        ['suricata-ids', 'suricata', 'syslog udp/514', 'enabled'],
        ['nexpose-pipe', 'nexpose', '/var/run/nexpose_pipe', 'enabled'],
        ['security-onion', 'security_onion', 'syslog tcp/601', 'disabled'],
        ['regex-custom', 'regex', '/var/run/custom_pipe', 'enabled'],
      ], accentCol: 0, chipCol: 1, statusCol: 3 } },
  syslog: {
    title: 'Syslog Forwarders', sub: 'Forward PacketFence logs to external collectors',
    list: { newLabel: 'New Syslog Forwarder',
      cols: ['Name', 'Type', 'Host', 'Logs'],
      rows: [
        ['splunk-siem', 'syslog', '10.5.0.30:514', 'auth, security_event'],
        ['graylog', 'syslog', '10.5.0.31:1514', 'all'],
      ], accentCol: 0 } },
  pki: {
    title: 'PKI Providers', sub: 'Certificate issuance for EAP-TLS provisioning',
    list: { newLabel: 'New PKI Provider',
      cols: ['Name', 'Type', 'Profile', 'CA', 'Status'],
      rows: [
        ['pf-internal-pki', 'packetfence_pki', 'byod-tls', 'PacketFence Root CA', 'valid'],
        ['ms-scep', 'scep', 'corp-ndes', 'Corp Enterprise CA', 'valid'],
        ['pf-local', 'packetfence_local', 'default', 'self-signed', 'valid'],
      ], accentCol: 0, chipCol: 1, statusCol: 4 } },
  provisioners: {
    title: 'Provisioners', sub: 'Onboarding profiles pushed to enrolled endpoints',
    list: { newLabel: 'New Provisioner',
      cols: ['Name', 'Type', 'Roles', 'Enforce', 'Status'],
      rows: [
        ['ios-mobileconfig', 'mobileconfig', 'byod', 'yes', 'enabled'],
        ['android-eap', 'android', 'byod', 'yes', 'enabled'],
        ['windows-eap', 'windows', 'employee', 'no', 'enabled'],
        ['jamf-mdm', 'jamf', 'employee', 'yes', 'enabled'],
        ['intune-mdm', 'intune', 'employee', 'yes', 'enabled'],
      ], accentCol: 0, chipCol: 1, statusCol: 4 } },
  billing: {
    title: 'Billing Tiers', sub: 'Paid guest access tiers · Stripe / PayPal',
    list: { newLabel: 'New Billing Tier',
      cols: ['Name', 'Price', 'Interval', 'Role', 'Bandwidth'],
      rows: [
        ['day-pass', '$4.99', '1 day', 'guest', '10 Mbps'],
        ['week-pass', '$19.99', '7 days', 'guest', '25 Mbps'],
        ['premium', '$49.99', '30 days', 'guest-premium', '100 Mbps'],
      ], accentCol: 0, monoCol: 1 } },
  duration: {
    title: 'Access Duration', sub: 'Selectable durations offered on the captive portal',
    list: { newLabel: 'New Duration',
      cols: ['Duration', 'Base', 'Extendable', 'Default'],
      rows: [
        ['1 hour', 'relative', 'no', 'no'],
        ['12 hours', 'relative', 'yes', 'no'],
        ['1 day', 'relative', 'yes', 'yes'],
        ['1 week', 'relative', 'yes', 'no'],
        ['30 days', 'relative', 'yes', 'no'],
      ], accentCol: 0 } },
  networks: {
    title: 'Networks', sub: 'Layer-2 & routed networks managed by PacketFence',
    list: { newLabel: 'New Network',
      cols: ['Network', 'Netmask', 'Type', 'Gateway', 'DHCP', 'DNS'],
      rows: [
        ['10.100.0.0', '255.255.0.0', 'vlan-isolation', '10.100.0.1', 'on', 'on'],
        ['10.2.0.0', '255.255.255.0', 'vlan-registration', '10.2.0.1', 'on', 'on'],
        ['10.200.0.0', '255.255.255.0', 'vlan-guest', '10.200.0.1', 'on', 'on'],
        ['192.168.40.0', '255.255.255.0', 'inline-l2', '192.168.40.1', 'on', 'off'],
      ], accentCol: 0, monoCol: 1 } },
  interfaces: {
    title: 'Interfaces', sub: 'Network interfaces & listening daemons',
    list: { newLabel: 'New Interface',
      cols: ['Logical name', 'IP Address', 'Netmask', 'Type', 'Daemons', 'Status'],
      rows: [
        ['eth0', '10.1.0.5', '255.255.255.0', 'management', '—', 'up'],
        ['eth1', '10.2.0.1', '255.255.255.0', 'registration', 'dhcp, dns, portal', 'up'],
        ['eth1.200', '10.200.0.1', '255.255.255.0', 'isolation', 'dhcp, dns, portal', 'up'],
        ['eth2', '203.0.113.42', '255.255.255.0', 'other', 'radius', 'up'],
      ], accentCol: 0, monoCol: 1, statusCol: 5 } },
  floating: {
    title: 'Floating Devices', sub: 'Devices that move ports without re-authentication',
    list: { newLabel: 'New Floating Device',
      cols: ['MAC / OUI', 'IP', 'Trunk port', 'PVID', 'Tagged VLANs'],
      rows: [
        ['00:25:9C:*', '—', 'yes', '100', '100,200,666'],
        ['B8:78:2E:11:00:01', '10.1.30.40', 'no', '30', '30'],
      ], accentCol: 0, monoCol: 0 } },
  portalmod: {
    title: 'Portal Modules', sub: 'Captive-portal flow building blocks',
    list: { newLabel: 'New Portal Module',
      cols: ['Name', 'Type', 'Description'],
      rows: [
        ['default-policy', 'Root', 'Top-level portal policy'],
        ['login', 'Authentication::Login', 'Username / password'],
        ['sms', 'Authentication::SMS', 'SMS PIN registration'],
        ['sponsor', 'Authentication::Sponsor', 'Sponsored guest approval'],
        ['billing', 'Billing', 'Paid access tiers'],
        ['provisioning', 'Provisioning', 'Device onboarding step'],
      ], accentCol: 0, chipCol: 1 } },
  selfservice: {
    title: 'Self Service Portal', sub: 'What end-users can do with their own devices',
    list: { newLabel: 'New Self Service Policy',
      cols: ['Name', 'Roles', 'Self register', 'Self manage', 'Status'],
      rows: [
        ['default', 'employee, byod', 'yes', 'yes', 'enabled'],
        ['guest-limited', 'guest', 'no', 'no', 'enabled'],
      ], accentCol: 0, statusCol: 4 } },
  filters: {
    title: 'Filter Engines', sub: 'VLAN, RADIUS & DHCP filter rule sets',
    list: { newLabel: 'New Filter',
      cols: ['Scope', 'Name', 'Condition', 'Status'],
      rows: [
        ['vlan-filters', 'block-night', 'time NOT in 06:00-22:00', 'enabled'],
        ['radius-filters', 'mab-iot', "connection_type == 'MAB'", 'enabled'],
        ['dhcp-filters', 'rogue-guard', 'dhcp.is_offer', 'enabled'],
      ], accentCol: 1, monoCol: 2, statusCol: 3 } },
  shaping: {
    title: 'Traffic Shaping', sub: 'Per-role bandwidth limits (inline enforcement)',
    list: { newLabel: 'New Shaping Policy',
      cols: ['Role', 'Download', 'Upload', 'Status'],
      rows: [
        ['guest', '10 Mbps', '2 Mbps', 'enabled'],
        ['byod', '50 Mbps', '10 Mbps', 'enabled'],
        ['iot-trusted', '5 Mbps', '2 Mbps', 'enabled'],
      ], accentCol: 0, statusCol: 3 } },
}

export const CFG_FORMS = {
  general: { title: 'General Configuration', sub: 'Identity & locale for this cluster', fields: [
    ['Domain', 'Default DNS domain for the deployment.', 'text', 'example.net'],
    ['Hostname', 'Short hostname of this server.', 'text', 'pf-node-01'],
    ['Timezone', 'Used for scheduling & logs.', 'select', ['America/New_York', 'UTC', 'Europe/Paris', 'Asia/Tokyo']],
    ['Language', 'Default admin & portal locale.', 'select', ['en_US', 'fr_CA', 'de_DE', 'ja_JP']],
    ['DHCP servers', 'Comma-separated upstream DHCP servers.', 'mono', '10.1.0.5'],
    ['Send anonymous stats', 'Help improve PacketFence.', 'toggle', true],
  ]},
  alerting: { title: 'Alerting', sub: 'Email & notification delivery', fields: [
    ['SMTP server', 'Outbound mail relay host.', 'mono', 'smtp.example.net'],
    ['SMTP port', 'Typically 25, 465 or 587.', 'mono', '587'],
    ['Encryption', 'Transport security.', 'segmented', ['none', 'ssl', 'starttls'], 'starttls'],
    ['From address', 'Envelope sender for alerts.', 'text', 'packetfence@example.net'],
    ['Recipients', 'Admin alert distribution list.', 'text', 'noc@example.net, security@example.net'],
    ['Test on save', 'Send a test email when saving.', 'toggle', false],
  ]},
  advanced: { title: 'Advanced', sub: 'Low-level enforcement behavior', fields: [
    ['Hashing cost', 'bcrypt work factor for local accounts.', 'mono', '8'],
    ['Locationlog close on accounting stop', 'Track session end via accounting.', 'toggle', true],
    ['Pfacct accounting', 'Record RADIUS accounting in pfacct.', 'toggle', true],
    ['Update iplog with accounting', 'Refresh iplog from accounting packets.', 'toggle', true],
    ['Multihost', 'Allow multiple MACs per switch port.', 'toggle', false],
    ['Scan on registration', 'Trigger posture scan during onboarding.', 'toggle', true],
  ]},
  radius: { title: 'RADIUS', sub: 'FreeRADIUS & EAP behavior', fields: [
    ['Local RADIUS auth', 'Authenticate against PacketFence DB.', 'toggle', true],
    ['EAP fast TLS', 'Enable EAP-FAST anonymous provisioning.', 'toggle', false],
    ['TLS minimum version', 'Reject older TLS in EAP tunnels.', 'segmented', ['1.0', '1.2', '1.3'], '1.2'],
    ['OCSP override', 'Force OCSP cert validation.', 'toggle', true],
    ['RADIUS attributes filter', 'Strip unknown VSAs from replies.', 'toggle', true],
    ['Accounting timeout', 'Drop sessions after N idle seconds.', 'mono', '300'],
  ]},
  captive: { title: 'Captive Portal', sub: 'Behavior of the registration & guest portal', fields: [
    ['Redirect URL', 'Where to send clients after registration.', 'mono', 'https://www.example.net'],
    ['Network detection', 'Probe to confirm portal release.', 'toggle', true],
    ['Detection IP', 'Host used for the release probe.', 'mono', '203.0.113.42'],
    ['Request timeout', 'Seconds before portal session expires.', 'mono', '30'],
    ['Wispr 2.0', 'Enable WISPr smart-client release.', 'toggle', false],
    ['Show language switcher', 'Let users pick portal language.', 'toggle', true],
  ]},
  dhcpdns: { title: 'DHCP & DNS', sub: 'pfdhcp / pfdns enforcement services', fields: [
    ['DHCP enforcement', 'Hand out leases on enforcement VLANs.', 'toggle', true],
    ['Lease length', 'Default lease duration (seconds).', 'mono', '7200'],
    ['DNS enforcement', 'Answer DNS on registration/isolation.', 'toggle', true],
    ['Record DHCP fingerprints', 'Feed Fingerbank from DHCP traffic.', 'toggle', true],
    ['DNS servers (passthrough)', 'Allowed upstream resolvers.', 'mono', '1.1.1.1, 8.8.8.8'],
    ['Fallback to DHCPd', 'Use ISC dhcpd when pfdhcp is off.', 'toggle', false],
  ]},
  snmp: { title: 'SNMP Traps', sub: 'SNMP trap reception for port security', fields: [
    ['SNMP version', 'Default version for trap handling.', 'segmented', ['v1', 'v2c', 'v3'], 'v2c'],
    ['Community', 'Read community for trap auth.', 'mono', 'public'],
    ['Trap limit', 'Max traps per device per interval.', 'mono', '100'],
    ['Trap limit action', 'What to do once limit is hit.', 'segmented', ['none', 'email', 'shut'], 'email'],
    ['Bounce port on VLAN change', 'Force link bounce after VLAN move.', 'toggle', true],
  ]},
  webservices: { title: 'Web Services', sub: 'REST/SOAP API credentials & TLS', fields: [
    ['API username', 'Service account for the API.', 'text', 'webservices'],
    ['API password', 'Rotate periodically.', 'password', '•••••••••••'],
    ['Protocol', 'Transport for the API endpoint.', 'segmented', ['http', 'https'], 'https'],
    ['AAA timeout', 'Backend call timeout (seconds).', 'mono', '5'],
    ['Token TTL', 'JWT lifetime for admin sessions.', 'mono', '3600'],
  ]},
  fingerbank: { title: 'Fingerbank Profiling', sub: 'Device fingerprinting via Fingerbank Cloud + local DB', fields: [
    ['Upstream API key', 'Fingerbank Cloud API key.', 'mono', 'fb_live_••••••••••••8a2c'],
    ['Query upstream', 'Fall back to Cloud on local miss.', 'toggle', true],
    ['Local database', 'Bundled fingerprint DB version.', 'mono', '2026-05-18 (df 134)'],
    ['Collector', 'Send observations to collector.', 'toggle', true],
    ['Interrogate IPv6', 'Profile IPv6 endpoints too.', 'toggle', false],
    ['Min. confidence', 'Reject device matches below score.', 'mono', '30'],
  ]},
}

// Leaves that render a hand-crafted custom view rather than the
// generic list/form template. The Configuration shell looks these up
// by id and `<component :is="...">` the resolved component.
export const CFG_CUSTOM_IDS = new Set(['cluster', 'services', 'maintenance', 'ssl', 'adminaccess', 'database'])

// The "Policies and Access Control" group now lives under Govern > Policies
// rather than System > Configuration. Split the tree so each page renders its
// own slice through the shared ConfigWorkspace.
export const POLICIES_GROUP = 'Policies and Access Control'
export const POLICY_TREE = CFG_TREE.filter(g => g.group === POLICIES_GROUP)
export const SYSTEM_TREE = CFG_TREE.filter(g => g.group !== POLICIES_GROUP)
