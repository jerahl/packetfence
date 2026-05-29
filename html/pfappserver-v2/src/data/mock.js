// Mock NAC data — ported verbatim from the design's data.js. This stays
// until the views are wired to the real PacketFence API; switching is
// just swapping this import for a fetch-backed module in the views.

const VENDORS = [
  { oui: '3C:5A:B4', name: 'Apple, Inc.', os: 'macOS 14.4', type: 'Laptop' },
  { oui: 'F0:18:98', name: 'Apple, Inc.', os: 'iOS 17.3', type: 'Phone' },
  { oui: 'DC:A6:32', name: 'Raspberry Pi Foundation', os: 'Linux 6.1', type: 'IoT' },
  { oui: '00:1A:11', name: 'Google, Inc.', os: 'Android 14', type: 'Phone' },
  { oui: 'B8:27:EB', name: 'Raspberry Pi Foundation', os: 'Linux 6.6', type: 'IoT' },
  { oui: '00:E0:4C', name: 'Realtek', os: 'Windows 11', type: 'Desktop' },
  { oui: '70:85:C2', name: 'Dell Inc.', os: 'Windows 11 22H2', type: 'Laptop' },
  { oui: 'A4:83:E7', name: 'Apple, Inc.', os: 'iPadOS 17', type: 'Tablet' },
  { oui: '00:25:9C', name: 'Cisco Meraki', os: 'Meraki MR-32', type: 'Access Point' },
  { oui: 'F4:F5:E8', name: 'HP Inc.', os: 'Windows 11', type: 'Laptop' },
  { oui: 'B8:78:2E', name: 'Polycom', os: 'Embedded', type: 'VoIP' },
  { oui: '00:0C:29', name: 'VMware, Inc.', os: 'Ubuntu 22.04', type: 'VM' },
  { oui: '5C:E0:C5', name: 'Lenovo', os: 'Windows 11', type: 'Laptop' },
  { oui: 'E4:5F:01', name: 'Samsung Electronics', os: 'Tizen 6', type: 'TV' },
  { oui: '00:50:56', name: 'Sonos', os: 'Sonos OS', type: 'IoT' },
]
const USERS = [
  'khalil.osman', 'mira.tomasek', 'jordan.lee', 'anika.devi', 'soren.ng',
  'tomas.berg', 'rina.k', 'wei.liu', 'fatou.diop', 'ben.kowalski',
  'elena.cruz', 'raj.patel', 'yuki.tanaka', 'kenji.morimoto', 'lucia.rossi',
  'amber.holm', 'noah.brand', 'ines.duarte', 'marko.s', 'sara.al',
  'guest-7193', 'guest-2284', 'kiosk-lobby-04', 'printer-fl3-w', 'sensor-hvac-12',
]
const ROLES = [
  { name: 'employee', vlan: 100 },
  { name: 'contractor', vlan: 110 },
  { name: 'guest', vlan: 200 },
  { name: 'byod', vlan: 120 },
  { name: 'voip', vlan: 30 },
  { name: 'iot-trusted', vlan: 40 },
  { name: 'iot-quarantine', vlan: 666 },
  { name: 'registration', vlan: 2 },
  { name: 'isolation', vlan: 999 },
]
const STATUS = ['registered', 'registered', 'registered', 'registered', 'unregistered', 'pending', 'isolated']
const SSIDS = ['CORP-WPA2EAP', 'GUEST-Captive', 'BYOD-Onboard', 'IOT-PSK', 'EVENT-Open']
const SWITCHES = [
  'core-sw-01.nyc', 'core-sw-02.nyc', 'dist-sw-fl3.nyc', 'dist-sw-fl4.nyc',
  'ap-controller-01', 'ap-controller-02', 'edge-fw-01.dmz',
]

function hex(n) { return Math.floor(Math.random() * Math.pow(16, n)).toString(16).padStart(n, '0').toUpperCase() }
function macFrom(oui) { return oui + ':' + hex(2) + ':' + hex(2) + ':' + hex(2) }
function ip() { return `10.${1 + Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}` }

const nodes = []
for (let i = 0; i < 64; i++) {
  const v = VENDORS[i % VENDORS.length]
  const role = ROLES[(i * 3) % ROLES.length]
  const status = STATUS[(i * 7) % STATUS.length]
  const owner = USERS[(i * 5) % USERS.length]
  const lastSeen = ['just now', '2m ago', '6m ago', '14m ago', '38m ago', '1h ago', '3h ago', '6h ago', '1d ago', '3d ago'][(i * 11) % 10]
  const sw = SWITCHES[(i * 13) % SWITCHES.length]
  const ssid = SSIDS[(i * 17) % SSIDS.length]
  const port = 'Gi1/0/' + (1 + (i % 48))
  const handle = owner.split('.')[0]
  const hostname =
    v.type === 'Phone' ? handle + '-iphone' :
    v.type === 'Laptop' ? handle + '-MBP' :
    v.type === 'IoT' ? 'iot-' + i :
    v.type === 'VoIP' ? 'phone-' + (3000 + i) :
    v.type === 'TV' ? 'tv-conf-' + i :
    v.type === 'VM' ? 'vm-build-' + i :
    v.type === 'Access Point' ? 'ap-fl' + (i % 5 + 1) + '-' + (i % 9 + 1) :
    v.type === 'Tablet' ? handle + '-iPad' :
    'host-' + (3000 + i)
  nodes.push({
    id: 'N-' + (1000 + i),
    mac: macFrom(v.oui),
    hostname,
    ip: ip(),
    vendor: v.name,
    os: v.os,
    type: v.type,
    role: role.name,
    vlan: role.vlan,
    status,
    owner,
    lastSeen,
    ssid: i % 3 === 0 ? '(wired)' : ssid,
    switch: sw,
    port,
    bandwidth: Math.floor(20 + ((i * 23) % 480)),
    registered: ['2024-01-12', '2024-03-04', '2024-09-21', '2025-02-08', '2025-08-12', '—'][(i * 7) % 6],
    events: (i * 19) % 11 < 2 ? 1 : 0,
  })
}

const events = [
  { id: 'E-9214', node: nodes[3],  rule: 'Suspicious DNS to known C2',    severity: 'critical', action: 'isolated',    time: '2m ago',  desc: 'Endpoint queried 14 high-risk domains in 30s' },
  { id: 'E-9213', node: nodes[7],  rule: 'Unauthorized MAC change',       severity: 'high',     action: 'registration',time: '11m ago', desc: 'Same hostname, new MAC OUI 5C:E0:C5' },
  { id: 'E-9212', node: nodes[18], rule: 'EAP-TLS cert expired',          severity: 'medium',   action: 're-auth',     time: '26m ago', desc: 'Client cert expired 2026-04-30' },
  { id: 'E-9211', node: nodes[24], rule: 'Off-hours connection',          severity: 'low',      action: 'logged',      time: '42m ago', desc: 'Connection at 03:14 outside 06–22 policy window' },
  { id: 'E-9210', node: nodes[2],  rule: 'Multiple failed 802.1X',        severity: 'medium',   action: 'quarantine',  time: '1h ago',  desc: '12 EAP-PEAP rejections in 60s' },
  { id: 'E-9209', node: nodes[31], rule: 'Posture: missing AV',           severity: 'high',     action: 'isolated',    time: '1h ago',  desc: 'Endpoint posture probe failed: no AV process' },
  { id: 'E-9208', node: nodes[12], rule: 'Rogue DHCP on segment',         severity: 'high',     action: 'alert',       time: '2h ago',  desc: 'Endpoint advertising DHCP offers on VLAN 100' },
  { id: 'E-9207', node: nodes[40], rule: 'Unauthorized OS detected',      severity: 'low',      action: 'logged',      time: '3h ago',  desc: 'Fingerprint identifies Kali Linux 2024.4' },
]

// Connection profiles — ported from the design's data.js. Order is the
// evaluation order; cp-07 (quarantine) sits at priority 5 so isolated
// endpoints land on it before anything else.
const profiles = [
  { id: 'cp-01', name: 'Corporate Wi-Fi (802.1X)', priority: 10, match: 'ssid == "CORP-WPA2EAP"',          sources: ['AD-Corp', 'RADIUS-Backup'], portal: 'Silent',       role: 'employee',     enabled: true,  devices: 1842 },
  { id: 'cp-02', name: 'BYOD Onboarding',           priority: 20, match: 'ssid == "BYOD-Onboard"',          sources: ['AD-Corp'],                  portal: 'Self-service', role: 'byod',         enabled: true,  devices: 412 },
  { id: 'cp-03', name: 'Guest Captive Portal',      priority: 30, match: 'ssid == "GUEST-Captive"',         sources: ['SMS-Twilio', 'Sponsor-Email'], portal: 'Captive',  role: 'guest',        enabled: true,  devices: 187 },
  { id: 'cp-04', name: 'IoT Pre-Shared',            priority: 40, match: 'ssid == "IOT-PSK"',               sources: ['MAC-Auth'],                 portal: 'MAB',          role: 'iot-trusted',  enabled: true,  devices: 312 },
  { id: 'cp-05', name: 'VoIP Phones',               priority: 50, match: 'lldp.cap contains "Phone"',       sources: ['MAC-Auth'],                 portal: 'MAB',          role: 'voip',         enabled: true,  devices: 96 },
  { id: 'cp-06', name: 'Conference Rooms (Wired)',  priority: 60, match: 'switch in [dist-sw-fl3, dist-sw-fl4]', sources: ['AD-Corp'],            portal: 'Captive',      role: 'guest',        enabled: false, devices: 24 },
  { id: 'cp-07', name: 'Quarantine Isolation',      priority: 5,  match: 'security_event.active',           sources: ['Internal'],                 portal: 'Remediation',  role: 'isolation',    enabled: true,  devices: 4 },
]

const switches = SWITCHES.map((s, i) => ({
  name: s,
  ip: ip(),
  model: ['Cisco C9300-48P', 'Cisco C9300-24P', 'Aruba 6300M', 'Juniper EX4400', 'Meraki MS390'][i % 5],
  sessions: 40 + (i * 73) % 320,
  health: 70 + (i * 11) % 30,
  role: i < 4 ? 'Access' : i < 6 ? 'Aggregation' : 'Edge',
}))

// 24h auth trend, 5-minute buckets.
const trend = []
for (let i = 0; i < 24 * 12; i++) {
  const base = 1500 + Math.sin(i / 12) * 250 + Math.cos(i / 30) * 100
  const auth = base + Math.sin(i / 6 + 1) * 50 + (Math.random() - 0.5) * 30
  const denied = 40 + Math.sin(i / 8) * 12 + (Math.random() - 0.5) * 16
  trend.push({ t: i, active: Math.round(auth), denied: Math.max(0, Math.round(denied)) })
}

// Admin audit log — same pool of actions as the design's audits generator
// so the Reports page has realistic-looking rows out of the box.
const AUDIT_ACTIONS = [
  { a: 'Authentication accepted', k: 'ok',   det: (n) => `EAP-TLS · ${n.ssid}` },
  { a: 'Authentication rejected', k: 'bad',  det: (n) => `Bad credentials · ${n.ssid}` },
  { a: 'Role assigned',           k: 'info', det: (n) => `→ ${n.role} (VLAN ${n.vlan})` },
  { a: 'VLAN change',             k: 'info', det: (n) => `100 → ${n.vlan}` },
  { a: 'Endpoint registered',     k: 'ok',   det: () => 'via Self-service portal' },
  { a: 'Endpoint isolated',       k: 'bad',  det: (_, i) => `Security event #E-${9200 + i}` },
  { a: 'Admin login',             k: 'info', det: () => 'user=khalil.osman · 2FA' },
  { a: 'Policy edit',             k: 'warn', det: () => "Connection Profile 'BYOD Onboarding'" },
]
const audits = Array.from({ length: 28 }, (_, i) => {
  const node = nodes[(i * 7) % nodes.length]
  const act = AUDIT_ACTIONS[(i * 5) % AUDIT_ACTIONS.length]
  return {
    id: 'A-' + (44210 - i),
    time: ['just now', '6m ago', '14m ago', '32m ago', '58m ago', '1h ago', '2h ago', '4h ago', '6h ago', '1d ago'][i % 10],
    who: USERS[(i * 3) % USERS.length],
    target: node.mac,
    action: act.a,
    kind: act.k,
    detail: act.det(node, i),
  }
})

export const NAC_DATA = { nodes, events, switches, trend, audits, profiles, users: USERS, roles: ROLES }

export function deviceIcon(type) {
  switch (type) {
    case 'Laptop': return 'laptop'
    case 'Phone': return 'phone'
    case 'IoT': return 'iot'
    case 'Desktop': return 'desktop'
    case 'VoIP': return 'voip'
    case 'TV': return 'tv'
    case 'VM': return 'vm'
    case 'Access Point': return 'ap'
    case 'Tablet': return 'tablet'
    default: return 'iot'
  }
}
