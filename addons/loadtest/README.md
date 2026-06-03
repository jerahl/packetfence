# pf-loadtest

A single-file Python load tester for PacketFence. Simulates many endpoints
and users authenticating to the RADIUS frontend, or pumps the REST API
with synthetic node records. Built for **dev / test** boxes you control.

This is intentionally lighter-weight than `addons/stress-tester/`, which
wraps the `someload` Go binary plus `radclient` and `eapol_test` and
assumes an Active-Directory user import. If you need EAP-PEAP / EAP-TLS
load specifically, use that toolkit — `eapol_test` is the right tool
for the full 802.1X exchange. This script covers the two paths most
people actually need on a dev box: **MAB / PAP authentication** and
**populating the API with synthetic endpoints**.

## What it does

| Mode           | What it sends                                                        | When to use it |
|----------------|----------------------------------------------------------------------|----------------|
| `radius-mab`   | RADIUS Access-Request, User-Name=User-Password=MAC, Service-Type=Call-Check | IoT-style flows; load FreeRADIUS + PF's authorize path |
| `radius-pap`   | RADIUS Access-Request, User-Name + User-Password (PAP)               | Internal-source PAP auth |
| `radius-acct`  | RADIUS Accounting Start packets                                      | Load pfacct ingest |
| `api-populate` | `POST /api/v1/nodes` to create synthetic endpoint records             | Seed the admin UI with realistic-looking devices |

Every run reports counts per outcome, latency percentiles (p50/p95/p99),
and the effective request rate it achieved.

## Install

```bash
cd /usr/local/pf/addons/loadtest
pip install -r requirements.txt           # pulls pyrad
```

Python 3.8+ on the test runner. Doesn't have to be the PF box — you
can run from your laptop against pfdev.

## Configure PF first

**For the RADIUS modes**, the host you run the tool *from* must be a
known RADIUS client on the PF box. Add an entry like this to
`/usr/local/pf/raddb/clients.conf.inc` (and reload FreeRADIUS):

```
client loadtest {
    ipaddr = 10.10.3.42        # IP of the machine running pf-loadtest.py
    secret = testing123
    require_message_authenticator = no
}
```

For the **PAP** mode the username/password pool must actually
authenticate against one of PF's configured sources. The simplest path:
add the synthetic users to an internal source that accepts PAP, with
password `test1234` (or whatever you pass to `--password`).

**For `api-populate`**, you need an admin login (username/password) with
write access to nodes — same credentials you use for the existing
`/admin/` UI.

## Examples

```bash
# 50 MAB auths/sec for 60s against pfdev. 200 distinct synthetic
# MACs cycled at random.
./pf-loadtest.py --mode radius-mab \
    --server pfdev --secret testing123 \
    --users 200 --rate 50 --duration 60

# 100/sec PAP, with a username/password pool of 50.
./pf-loadtest.py --mode radius-pap \
    --server pfdev --secret testing123 \
    --users 50 --rate 100 --duration 30 \
    --password 'p@ssw0rd'

# Pound the accounting port.
./pf-loadtest.py --mode radius-acct \
    --server pfdev --secret testing123 \
    --users 500 --rate 200 --duration 60

# Pre-populate the admin UI with 1000 synthetic endpoints.
./pf-loadtest.py --mode api-populate \
    --server pfdev --admin-user admin --admin-pass admin \
    --users 1000 --rate 25 --duration 60 --insecure
```

## What you'll see while it's running

```
Starting: mode=radius-mab target=50.0/s for 60s, users=200, workers=64
  t=  5s  sent=  248 done=  246 ok=  246  avg(last 100)=    6ms
  t= 10s  sent=  500 done=  498 ok=  498  avg(last 100)=    7ms
  ...

=== Results ===
  Submitted: 3000
  Completed: 2998
    accept                2998  (100.0%)
  Latency  p50=     6ms p95=    12ms p99=    18ms max=    44ms
  Effective rate: 50.0/s over 60.0s
```

Common non-accept outcomes:
- `reject` — server replied Access-Reject. Check PF auth source / role
  policy / portal config.
- `timeout` (or `RemoteAccessError`) — server didn't reply within
  `--timeout`. Watch `journalctl -u packetfence-radiusd-auth` and
  `pfqueue` for back-pressure.
- `http-401` (api-populate) — `--admin-user`/`--admin-pass` are wrong
  or the token expired mid-run.

## Synthetic identity pool

Identities are generated **deterministically** from a seed (the user
index, 0..`--users-1`), so re-runs with the same `--users` value hit
the same pool of MACs / usernames / roles. The MAC OUIs and the
username pool match the v2 admin's mock-data set so the records show
up in `/admin/v2/endpoints` looking coherent. Re-generating? Bump
`--users` to widen the pool.

## What it deliberately doesn't do

- **No EAP**. For PEAP / EAP-TLS load, use `addons/stress-tester/` with
  `eapol_test`. Wrapping the full EAP exchange would balloon the code
  and re-implement what hostapd does well.
- **No DHCP / captive-portal**. Stress-tester has Net::DHCP::Packet
  and HTTP captive-portal sweepers for those paths.
- **No coverage of CoA / Disconnect-Request from the NAC** — those
  go the *other* direction (PF → switch); separate concern.

Together with the existing stress-tester, this gives you both ends:
turnkey RADIUS auth + API population here, and full EAP / DHCP /
captive-portal scenarios there.
