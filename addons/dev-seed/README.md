# pf-seed

Loads a curated **dummy dataset** into a PacketFence dev/test box through the
REST API, so the admin UI — including the v2 app at `/admin/v2/` — has
realistic-looking data to render: a population of users, their endpoints
(laptops, phones, printers, IoT, VoIP), and a handful of open security events.

This is **not** a load tester. For RADIUS / API throughput testing use the
sibling [`addons/loadtest/pf-loadtest.py`](../loadtest/), whose `api-populate`
mode pumps thousands of bare synthetic nodes at a target rate. `pf-seed`
instead makes one pass over a small, hand-curated, internally-consistent
dataset that's nice to look at in the UI.

## Files

| File             | What it is                                                        |
|------------------|-------------------------------------------------------------------|
| `pf-seed.py`     | Single-file loader. Stdlib only — no `pip install` needed.        |
| `seed-data.json` | The dataset: roles, users, nodes, security events. Edit freely.   |

## What it loads

The default `seed-data.json` contains:

- **7 roles** — `Corp-Employee`, `Contractor`, `BYOD`, `VoIP`, `IoT`,
  `Printers`, `Guest`. Created via `/config/roles` (the stable, file-backed
  roles endpoint, visible under Configuration → Roles). Nodes are assigned to
  these roles only if the box also exposes `/node_categories` (needed to
  resolve a role name to its numeric `category_id`); older PF builds lack that
  route, so there the nodes load with the default role and the roles are still
  created in config.
- **12 users** — fabricated identities (`example.com` emails, `555` phone
  numbers), spread across departments.
- **30 nodes** — owned by those users, with varied device classes (Macintosh,
  Windows, iPhone, Android, Linux/RPi, IP Camera, VoIP Phone, Printer, Smart
  TV) and statuses (`reg` / `unreg` / `pending`).
- **8 security events** — applied to a subset of nodes using default,
  enabled security-event IDs (Lost or Stolen, Rogue DHCP, Hostname change,
  Bandwidth Limit, Spam, …) so the Threats page has open events to show.

Everything is referentially consistent: each node's `owner` is a real user
`pid`, each node's `role` is one of the defined roles, and each security
event targets a real node `mac`.

## Loading order & idempotency

The loader runs in dependency order so foreign keys resolve:

```
roles (node_categories)  ->  users  ->  nodes  ->  security_events
```

It is **idempotent**. Records that already exist (PF returns 409/422 on the
unique key) are reported as `exists` and skipped, so re-running is harmless.
Pass `--update` to instead PATCH existing users/nodes so the dataset becomes
the source of truth on a re-run.

## Prerequisites

- Python 3.7+ on the machine you run it from (doesn't have to be the PF box).
- An **admin login** with write access to nodes/users — the same credentials
  you use for `/admin/`.
- Network reach to the PF REST API port. The default is **`9999`** — the
  api-frontend that exposes the full UnifiedApi. The `1443` admin proxy only
  forwards a subset of routes and returns `Unknown path /api/v1/node_categories`,
  so use `9999` (or pass `--api-port`). On a dev box behind an SSH tunnel,
  point `--server` at the tunnel endpoint.

## Usage

```bash
cd /usr/local/pf/addons/dev-seed

# Preview — makes no changes, no network calls:
./pf-seed.py --server pfdev --admin-user admin --admin-pass admin --dry-run

# Seed pfdev (self-signed cert -> --insecure):
./pf-seed.py --server 10.10.3.171 --admin-user admin --admin-pass admin --insecure

# Re-run and force existing records to match the dataset:
./pf-seed.py --server 10.10.3.171 --admin-user admin --admin-pass admin --insecure --update

# Skip the security events (just users + endpoints):
./pf-seed.py --server pfdev --admin-user admin --admin-pass admin --insecure --skip-events
```

### Options

| Flag             | Default          | Meaning                                            |
|------------------|------------------|----------------------------------------------------|
| `--server`       | *(required)*     | PF host (FQDN or IP).                              |
| `--admin-user`   | *(required)*     | Admin username.                                   |
| `--admin-pass`   | *(required)*     | Admin password.                                   |
| `--api-port`     | `9999`           | REST API port (full UnifiedApi; 1443 is a subset).|
| `--data`         | `seed-data.json` | Dataset file to load.                             |
| `--insecure`     | off              | Skip TLS verification (self-signed dev cert).     |
| `--update`       | off              | PATCH existing users/nodes to match the dataset.  |
| `--skip-events`  | off              | Don't apply security events.                      |
| `--dry-run`      | off              | Print the plan; make no changes.                  |
| `--probe`        | off              | Log in, report which API endpoints this box exposes, and exit. |
| `--timeout`      | `15`             | Per-request timeout (seconds).                    |

## Output

```
Seeding 10.10.3.171:1443 from seed-data.json
  dataset: 7 roles, 12 users, 30 nodes, 8 security events
  authenticated OK

=== Summary ===
  roles            created=7    exists=0    updated=0    failed=0
  users            created=12   exists=0    updated=0    failed=0
  nodes            created=30   exists=0    updated=0    failed=0
  security_events  created=8    exists=0    updated=0    failed=0

Done. All records seeded.
```

Any non-success is listed per record with the HTTP status and PF's message,
e.g. `FAIL [security_events] <mac>:1300005: HTTP 404 — ...` if a security-event
ID isn't enabled on that box.

## Customising the dataset

Edit `seed-data.json` — the shapes are:

```jsonc
"roles":  [ { "name": "...", "notes": "..." } ],
"users":  [ { "pid": "...", "firstname": "...", "lastname": "...", "email": "...", "telephone": "...", "company": "..." } ],
"nodes":  [ { "mac": "...", "owner": "<pid>", "role": "<role name>", "status": "reg|unreg|pending",
              "device_class": "...", "device_type": "...", "computername": "...", "voip": "yes|no" } ],
"security_events": [ { "mac": "...", "security_event_id": "1300000" } ]
```

Keep it consistent: `owner` must match a user `pid`, `role` a defined role,
and each event `mac` an existing node. Use `--dry-run` to check before loading.

Security-event IDs must exist in the target box's `class` table — i.e. be
present in its `conf/security_events.conf` (the `security_event` row has a
foreign key into `class`). To avoid guessing, the seeder **discovers** the
box's configured event IDs from `GET /config/security_events` and, if a
dataset entry's ID isn't configured there, transparently **remaps** it onto
one that is (noted in the output) so the Threats page still gets populated.

## API surface used

All under `https://<server>:<api-port>/api/v1/`:

| Step            | Call                                                  |
|-----------------|-------------------------------------------------------|
| Login           | `POST /login` → `{ token }` (JWT)                     |
| Create role     | `POST /config/roles`  `{ id, notes }`                 |
| List roles      | `GET  /config/roles`                                  |
| Resolve role id | `GET  /node_categories` (newer PF only; name → category_id) |
| Discover events | `GET  /config/security_events`                        |
| Create user     | `POST /users`  `{ pid, firstname, ... }`              |
| Update user     | `PATCH /user/<pid>`                                   |
| Create node     | `POST /nodes`  `{ mac, pid, category_id, status, ... }` |
| Update node     | `PATCH /node/<mac>`                                   |
| Apply sec event | `POST /node/<mac>/apply_security_event` `{ security_event_id }` |

## Troubleshooting

API routes vary by PF version. If roles or events fail, run `--probe` to see
exactly what your box exposes:

```bash
./pf-seed.py --server 127.0.0.1 --admin-user admin --admin-pass <pass> --insecure --probe
```

- **`Unknown path /api/v1/node_categories`** — your PF predates that route.
  Roles are still created via `/config/roles`; node role assignment is skipped
  (nodes keep the default role).
- **`unknown error adding security event <id>`** — the id isn't in the box's
  `class` table. Enable the event under Configuration → Security Events, then
  `/usr/local/pf/bin/pfcmd configreload hard`. The seeder also auto-remaps to
  an id it finds via `/config/security_events` when possible.
