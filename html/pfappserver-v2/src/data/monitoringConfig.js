// Chart layout for the Status > Monitoring page — direct port of
// html/pfappserver/root/src/views/Status/monitoring/_config/*.js so the
// v2 page renders the same tabs/groups as /admin/status/monitoring/<host>.
//
// Notes on what's NOT ported here:
//   - services.js (per-container cgroup charts) and haproxy.js per-proxy
//     charts were dynamic — they scanned the live /api/v1/charts response
//     and emitted definitions per match. Doing that properly needs a
//     runtime discovery pass; deferred. The static parts of haproxy are
//     kept below; services is omitted entirely.
//   - The "Authentication Sources" group from authentication.js was
//     driven by the Vuex store's monitored sources list — same story;
//     left out until that store is wired in v2.
//
// Each chart: { title, metric, params?, cols } (cols: 1-12).

const SYSTEM = {
  name: 'System',
  groups: [
    {
      name: 'System',
      items: [
        { title: 'CPU usage',          metric: 'system.cpu',     cols: 6, params: { dimensions: 'user,system', dygraph_valuerange: '[0, 100]' } },
        { title: 'IO Wait/Soft IRQ',   metric: 'system.cpu',     cols: 6, params: { dimensions: 'iowait,softirq', dygraph_valuerange: '[0, 100]' } },
        { title: 'System Load Average', metric: 'system.load',    cols: 6 },
        { title: 'Disk I/O',           metric: 'system.io',      cols: 6 },
        { title: 'Disk Space Usage for /', metric: 'disk_space._', cols: 6 },
        { title: 'System RAM',         metric: 'system.ram',     cols: 6 },
        { title: 'System Swap Used',   metric: 'mem.swap',       cols: 6, params: { dimensions: 'used' } },
        { title: 'Swap IO',            metric: 'mem.swapio',     cols: 6 },
      ],
    },
    {
      name: 'Physical Network Interfaces',
      items: [
        { title: 'Aggregated Bandwidth', metric: 'system.net', cols: 12 },
      ],
    },
    {
      name: 'IPv4 Networking',
      items: [
        { title: 'Bandwidth',   metric: 'system.ip',                       cols: 6 },
        { title: 'Packets',     metric: 'ipv4.packets',                    cols: 6 },
        { title: 'Errors',      metric: 'ipv4.errors',                     cols: 4 },
        { title: 'TCP Sockets', metric: 'ipv4.sockstat_tcp_sockets',       cols: 4 },
        { title: 'UDP Sockets', metric: 'ipv4.sockstat_udp_sockets',       cols: 4 },
      ],
    },
    {
      name: 'IPv6 Networking',
      items: [
        { title: 'Bandwidth',   metric: 'system.ipv6',                     cols: 6 },
        { title: 'Packets',     metric: 'ipv6.packets',                    cols: 6 },
        { title: 'Errors',      metric: 'ipv6.errors',                     cols: 4 },
        { title: 'TCP Sockets', metric: 'ipv6.sockstat6_tcp_sockets',      cols: 4 },
        { title: 'UDP Sockets', metric: 'ipv6.sockstat6_udp_sockets',      cols: 4 },
      ],
    },
  ],
}

const RADIUS = {
  name: 'RADIUS',
  groups: [
    {
      name: 'RADIUS Latency',
      items: [
        { title: 'Auth Rest', metric: 'statsd_timer_pf__api__radius_rest_authorize.timing', cols: 6, params: { filter_graph: 'average' } },
        { title: 'Acct Rest', metric: 'statsd_timer_pf__api__radius_rest_accounting.timing', cols: 6, params: { filter_graph: 'average' } },
      ],
    },
    {
      name: 'RADIUS Requests',
      items: [
        { title: 'Load balancer auth', metric: 'freeradius_Freeradius_LoadBalancer.proxy-auth', cols: 6 },
        { title: 'Load balancer acct', metric: 'freeradius_Freeradius_LoadBalancer.proxy-acct', cols: 6 },
        { title: 'RADIUS auth',        metric: 'freeradius_Freeradius_Auth.authentication',    cols: 6 },
        { title: 'RADIUS acct',        metric: 'freeradius_Freeradius_Acct.accounting',        cols: 6 },
        { title: 'RADIUS pfacct',      metric: 'statsd_timer_pfacct.handleaccountingrequest',  cols: 6, params: { filter_graph: 'events' } },
      ],
    },
    {
      name: 'NTLM',
      items: [
        { title: 'NTLM latency',  metric: 'statsd_timer_ntlm_auth.time',     cols: 6, params: { filter_graph: 'average' } },
        { title: 'NTLM failures', metric: 'statsd_counter_ntlm_auth.failures', cols: 6, params: { filter_graph: 'counter' } },
      ],
    },
  ],
}

// Apache uses the same six response-code-class charts per service. Helper
// keeps the static config compact.
const APACHE_RESPONSES = (prefix) => ['responses_by_status_code_class', 'status_code_class_1xx_responses', 'status_code_class_2xx_responses', 'status_code_class_3xx_responses', 'status_code_class_4xx_responses', 'status_code_class_5xx_responses'].map(t => ({
  title: t,
  metric: `${prefix}.${t}`,
  cols: t.startsWith('responses_by_status_code_class') ? 12 : 4,
}))

const APACHE = {
  name: 'Apache',
  groups: [
    {
      name: 'Bandwidth',
      items: [
        { title: 'API Bandwidth',            metric: 'web_log_api-frontend.bandwidth',     cols: 6 },
        { title: 'AAA Bandwidth',            metric: 'web_log_httpd_aaa.bandwidth',        cols: 6 },
        { title: 'Captive Portal Bandwidth', metric: 'web_log_httpd_portal.bandwidth',     cols: 6 },
        { title: 'Web Services Bandwidth',   metric: 'web_log_httpd_webservices.bandwidth', cols: 6 },
      ],
    },
    {
      name: 'Requests',
      items: [
        { title: 'API Requests',            metric: 'web_log_api-frontend.requests_by_http_method',     cols: 6 },
        { title: 'AAA Requests',            metric: 'web_log_httpd_aaa.requests_by_http_method',        cols: 6 },
        { title: 'Captive Portal Requests', metric: 'web_log_httpd_portal.requests_by_http_method',     cols: 6 },
        { title: 'Web Services Requests',   metric: 'web_log_httpd_webservices.requests_by_http_method', cols: 6 },
      ],
    },
    { name: 'API Responses',            items: APACHE_RESPONSES('web_log_api-frontend') },
    { name: 'AAA Responses',            items: APACHE_RESPONSES('web_log_httpd_aaa') },
    { name: 'Captive Portal Responses', items: APACHE_RESPONSES('web_log_httpd_portal') },
    { name: 'Web Services Responses',   items: APACHE_RESPONSES('web_log_httpd_webservices') },
  ],
}

const AUTHENTICATION = {
  name: 'Authentication',
  groups: [
    {
      name: 'Successful & Unsuccessful RADIUS Authentications',
      items: [
        { title: 'Successful RADIUS authentications in the last day', metric: 'statsd_source.packetfence.authentication.success_last_day_gauge', cols: 6 },
        { title: 'Failed RADIUS authentications in the last day',     metric: 'statsd_source.packetfence.authentication.failed_last_day_gauge',  cols: 6 },
      ],
    },
    {
      name: 'RADIUS Logs per Switch ID',
      items: [
        { title: 'Accept Requests',     metric: 'packetfence.radius_audit_log.accept_per_switch_id',     cols: 6 },
        { title: 'Reject Requests',     metric: 'packetfence.radius_audit_log.reject_per_switch_id',     cols: 6 },
        { title: 'CoA Requests',        metric: 'packetfence.radius_audit_log.coa_per_switch_id',        cols: 6 },
        { title: 'Disconnect Requests', metric: 'packetfence.radius_audit_log.disconnect_per_switch_id', cols: 6 },
      ],
    },
    {
      name: 'RADIUS Logs per Connection Type',
      items: [
        { title: 'Accept Requests',     metric: 'packetfence.radius_audit_log.accept_per_connection_type',     cols: 6 },
        { title: 'Reject Requests',     metric: 'packetfence.radius_audit_log.reject_per_connection_type',     cols: 6 },
        { title: 'CoA Requests',        metric: 'packetfence.radius_audit_log.coa_per_connection_type',        cols: 6 },
        { title: 'Disconnect Requests', metric: 'packetfence.radius_audit_log.disconnect_per_connection_type', cols: 6 },
      ],
    },
    {
      name: 'NTLM Auth API',
      items: [
        { title: 'NTLM Auth API Bandwidth', metric: 'web_log_ntlm-auth-api.bandwidth',              cols: 6 },
        { title: 'NTLM Auth API Requests',  metric: 'web_log_ntlm-auth-api.requests_by_http_method', cols: 6 },
      ],
    },
  ],
}

const DHCP = {
  name: 'DHCP',
  groups: [
    {
      name: 'DHCP used leases',
      items: [{ title: 'Numbers of ip addresses assigned', metric: 'packetfence.dhcp.used_leases', cols: 12 }],
    },
    {
      name: 'DHCP percent used leases',
      items: [{ title: 'Percent of ip addresses used', metric: 'packetfence.dhcp.percent_used_leases', cols: 12 }],
    },
  ],
}

// Static slice of haproxy charts only — the per-proxy `*_proxy_<name>`
// charts were generated from the live /api/v1/charts list and need a
// runtime discovery step we haven't built yet.
const HAPROXY_STATIC = (group) => [
  { title: 'Backend Current Sessions',     metric: `haproxy_${group}.backend_current_sessions`,      cols: 6 },
  { title: 'Backend Sessions',             metric: `haproxy_${group}.backend_sessions`,              cols: 6 },
  { title: 'Backend Response Time Average', metric: `haproxy_${group}.backend_response_time_average`, cols: 6 },
  { title: 'Backend Current Queue',        metric: `haproxy_${group}.backend_current_queue`,         cols: 6 },
]
const HAPROXY = {
  name: 'HAProxy',
  groups: ['haproxy-admin', 'haproxy-db', 'haproxy-portal'].map(g => ({ name: g, items: HAPROXY_STATIC(g) })),
}

const MYSQL = {
  name: 'MySQL',
  groups: [
    {
      name: 'MySQL',
      items: [
        { title: 'Database queries',     metric: 'mysql_PacketFence_Database.queries',    cols: 6 },
        { title: 'Database handlers',    metric: 'mysql_PacketFence_Database.handlers',   cols: 6 },
        { title: 'Database threads',     metric: 'mysql_PacketFence_Database.threads',    cols: 6 },
        { title: 'Database connections', metric: 'mysql_PacketFence_Database.connections', cols: 6 },
        { title: 'Table Rows',           metric: 'packetfence.mysql.table_rows',           cols: 12 },
      ],
    },
    {
      name: 'InnoDB',
      items: [
        { title: 'InnoDB Pages', metric: 'packetfence.mysql.innodb_buffer_pool_pages',     cols: 12 },
        { title: 'InnoDB Bytes', metric: 'packetfence.mysql.innodb_buffer_pool_bytes',     cols: 12 },
        { title: 'InnoDB R/W',   metric: 'packetfence.mysql.innodb_buffer_pool_read_write', cols: 12 },
      ],
    },
    {
      name: 'ProxySQL',
      items: [
        { title: 'Client Connections', metric: 'proxysql.client_connections_count', cols: 6 },
        { title: 'Client Statements',  metric: 'proxysql.client_statements_rate',   cols: 6 },
        { title: 'Traffic Backend',    metric: 'proxysql.backends_traffic',         cols: 6 },
        { title: 'Traffic Clients',    metric: 'proxysql.clients_traffic',          cols: 6 },
        { title: 'Memory',             metric: 'proxysql.memory_used',              cols: 6 },
        { title: 'Latency',            metric: 'proxysql.backend_latency',          cols: 6 },
      ],
    },
  ],
}

const QUEUE = {
  name: 'Queue',
  groups: [
    {
      name: 'Redis Counts',
      items: [
        { title: 'Queue',       metric: 'packetfence.redis.queue_stats_count',       cols: 4 },
        { title: 'Expired',     metric: 'packetfence.redis.queue_stats_expired',     cols: 4 },
        { title: 'Outstanding', metric: 'packetfence.redis.queue_stats_outstanding', cols: 4 },
      ],
    },
    {
      name: 'Redis Queue',
      items: [
        { title: 'redis_redis-queue.memory',         metric: 'redis_redis-queue.memory',         cols: 6 },
        { title: 'redis_redis-queue.net',            metric: 'redis_redis-queue.net',            cols: 6 },
        { title: 'redis_redis-queue.commands_calls', metric: 'redis_redis-queue.commands_calls', cols: 6 },
        { title: 'redis_redis-queue.keys',           metric: 'redis_redis-queue.keys',           cols: 6 },
      ],
    },
    {
      name: 'Redis Cache',
      items: [
        { title: 'redis_redis-cache.memory',         metric: 'redis_redis-cache.memory',         cols: 6 },
        { title: 'redis_redis-cache.net',            metric: 'redis_redis-cache.net',            cols: 6 },
        { title: 'redis_redis-cache.commands_calls', metric: 'redis_redis-cache.commands_calls', cols: 6 },
        { title: 'redis_redis-cache.keys',           metric: 'redis_redis-cache.keys',           cols: 6 },
      ],
    },
  ],
}

const LOGS = {
  name: 'Logs',
  groups: [
    { name: 'packetfence.log',  items: [
      { title: 'Number of events', metric: 'packetfence.logs.packetfence_log',       cols: 6 },
      { title: 'Number of errors', metric: 'packetfence.logs.packetfence_error_log', cols: 6 },
    ]},
    { name: 'pfconnector.log', items: [
      { title: 'Server events', metric: 'packetfence.logs.pfconnector_server_log', cols: 6 },
      { title: 'Client events', metric: 'packetfence.logs.pfconnector_client_log', cols: 6 },
    ]},
    { name: 'httpd.apache',     items: [{ title: 'Number of events', metric: 'packetfence.logs.httpd_apache',      cols: 12 }] },
    { name: 'pfdhcp.log',       items: [{ title: 'Number of events', metric: 'packetfence.logs.pfdhcp_log',        cols: 12 }] },
    { name: 'load_balancer.log',items: [{ title: 'Number of events', metric: 'packetfence.logs.load_balancer_log', cols: 12 }] },
    { name: 'radius.log',       items: [{ title: 'Number of events', metric: 'packetfence.logs.radius_log',        cols: 12 }] },
    { name: 'mariadb.log',      items: [{ title: 'Number of events', metric: 'packetfence.logs.mariadb_log',       cols: 12 }] },
    { name: 'pfcron.log',       items: [{ title: 'Number of events', metric: 'packetfence.logs.pfcron_log',        cols: 12 }] },
    { name: 'fingerbank.log',   items: [{ title: 'Number of events', metric: 'packetfence.logs.fingerbank_log',    cols: 12 }] },
  ],
}

export const MONITORING_SECTIONS = [
  SYSTEM,
  RADIUS,
  APACHE,
  AUTHENTICATION,
  DHCP,
  HAPROXY,
  MYSQL,
  QUEUE,
  LOGS,
]
