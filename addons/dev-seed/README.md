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
  `Printers`, `Guest`. Created as `node_categories` if they don't exist.
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
- Network reach to the PF REST API port (default `1443`). On a dev box behind
  an SSH tunnel, point `--server` at the tunnel endpoint.

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
| `--api-port`     | `1443`           | REST API port.                                    |
| `--data`         | `seed-data.json` | Dataset file to load.                             |
| `--insecure`     | off              | Skip TLS verification (self-signed dev cert).     |
| `--update`       | off              | PATCH existing users/nodes to match the dataset.  |
| `--skip-events`  | off              | Don't apply security events.                      |
| `--dry-run`      | off              | Print the plan; make no changes.                  |
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

Security-event IDs must be **enabled** on the target box (see
`conf/security_events.conf`). The defaults shipped here are all enabled in a
stock install.

## API surface used

All under `https://<server>:<api-port>/api/v1/`:

| Step            | Call                                                  |
|-----------------|-------------------------------------------------------|
| Login           | `POST /login` → `{ token }` (JWT)                     |
| List roles      | `GET  /node_categories`                               |
| Create role     | `POST /node_categories`  `{ name, notes }`            |
| Create user     | `POST /users`  `{ pid, firstname, ... }`              |
| Update user     | `PATCH /user/<pid>`                                   |
| Create node     | `POST /nodes`  `{ mac, pid, category_id, status, ... }` |
| Update node     | `PATCH /node/<mac>`                                   |
| Apply sec event | `POST /node/<mac>/apply_security_event` `{ security_event_id }` |
