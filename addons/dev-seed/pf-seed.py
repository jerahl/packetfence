#!/usr/bin/env python3
"""
PacketFence dev-data seeder.

Loads a curated, coherent dummy dataset (roles, users, endpoints and a
handful of open security events) into a PacketFence dev/test box through
the REST API, so the admin UI — including the v2 app at /admin/v2/ — has
realistic-looking data to render.

This is NOT a load tester. For throughput / RADIUS load see the sibling
addons/loadtest/pf-loadtest.py. This script makes one pass over a static
JSON dataset, in dependency order:

    roles (node_categories)  ->  users  ->  nodes  ->  security_events

It is idempotent: records that already exist are reported as "exists" and
skipped, or updated in place with --update. Safe to re-run.

API surface used (all under https://<server>:<api-port>/api/v1/):
    POST /login                                   -> { token }   (JWT)
    GET  /node_categories                         -> { items: [{ category_id, name }] }
    POST /node_categories            { name, notes }
    POST /users                      { pid, firstname, ... }
    POST /nodes                      { mac, pid, category_id, status, ... }
    POST /node/<mac>/apply_security_event   { security_event_id }

Example
-------
    ./pf-seed.py --server pfdev --admin-user admin --admin-pass admin --insecure
    ./pf-seed.py --server 10.10.3.171 --admin-user admin --admin-pass admin \\
        --insecure --update
"""

from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from urllib.parse import quote


DEFAULT_DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed-data.json")

# HTTP statuses PF returns when a record's unique key already exists. We
# treat these as "already there" rather than a failure so re-runs are clean.
EXISTS_STATUSES = (409, 422)


class Api:
    """Tiny JSON-over-HTTPS client for the PF REST API. Carries the bearer
    token and knows how to talk to a self-signed dev box (--insecure)."""

    def __init__(self, server, port, insecure, timeout):
        self.base = f"https://{server}:{port}/api/v1"
        self.ctx = ssl._create_unverified_context() if insecure else None
        self.timeout = timeout
        self.token = None

    def _request(self, method, path, body=None, auth=True):
        url = self.base + path
        headers = {"Accept": "application/json"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout, context=self.ctx) as r:
                raw = r.read().decode("utf-8") or "{}"
                return r.status, json.loads(raw)
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            try:
                payload = json.loads(raw)
            except ValueError:
                payload = {"message": raw.strip()[:200]}
            return e.code, payload
        except urllib.error.URLError as e:
            raise SystemExit(f"FATAL: cannot reach {url}: {e.reason}")

    def login(self, username, password):
        status, body = self._request(
            "POST", "/login", {"username": username, "password": password}, auth=False
        )
        if status != 200 or not body.get("token"):
            raise SystemExit(
                f"FATAL: login failed (HTTP {status}): "
                f"{body.get('message') or body}"
            )
        self.token = body["token"]

    def get(self, path):
        return self._request("GET", path)

    def post(self, path, body):
        return self._request("POST", path, body)

    def patch(self, path, body):
        return self._request("PATCH", path, body)


class Tally:
    """Per-resource outcome counter + human summary."""

    def __init__(self, label):
        self.label = label
        self.created = 0
        self.existed = 0
        self.updated = 0
        self.failed = 0
        self.failures = []  # (key, status, message)

    def fail(self, key, status, message):
        self.failed += 1
        self.failures.append((key, status, message))

    def line(self):
        return (f"  {self.label:<16} created={self.created:<4} "
                f"exists={self.existed:<4} updated={self.updated:<4} "
                f"failed={self.failed}")


def msg_of(body):
    if isinstance(body, dict):
        return body.get("message") or body.get("error") or json.dumps(body)[:160]
    return str(body)[:160]


# ---------- Seeding steps ----------------------------------------------

def ensure_roles(api, roles, dry):
    """Make sure every role name exists as a node_category; return a
    name -> category_id map (used to resolve node `role` -> category_id)."""
    tally = Tally("roles")
    by_name = {}
    if not dry:
        status, body = api.get("/node_categories")
        if status == 200:
            for it in (body.get("items") or []):
                if it.get("name") is not None:
                    by_name[it["name"]] = it.get("category_id")
        else:
            print(f"  WARN: could not list node_categories (HTTP {status}); "
                  f"will attempt to create all roles")

    for role in roles:
        name = role["name"]
        if name in by_name:
            tally.existed += 1
            continue
        if dry:
            print(f"    [dry-run] would create role {name!r}")
            tally.created += 1
            by_name[name] = None
            continue
        st, b = api.post("/node_categories", {"name": name, "notes": role.get("notes", "")})
        if st in (200, 201):
            # PF returns the new id on create; fall back to a re-list if not.
            new_id = (b.get("id") or b.get("category_id")
                      or (b.get("item") or {}).get("category_id"))
            by_name[name] = new_id
            tally.created += 1
        elif st in EXISTS_STATUSES:
            tally.existed += 1
        else:
            tally.fail(name, st, msg_of(b))

    # Resolve any ids we still don't have (created without an id echo).
    if any(v is None for v in by_name.values()) and not dry:
        st, b = api.get("/node_categories")
        if st == 200:
            for it in (b.get("items") or []):
                by_name[it.get("name")] = it.get("category_id")
    return tally, by_name


def seed_users(api, users, dry):
    tally = Tally("users")
    for u in users:
        pid = u["pid"]
        body = {k: v for k, v in u.items() if not k.startswith("_")}
        if dry:
            print(f"    [dry-run] would create user {pid}")
            tally.created += 1
            continue
        st, b = api.post("/users", body)
        if st in (200, 201):
            tally.created += 1
        elif st in EXISTS_STATUSES:
            tally.existed += 1
        else:
            tally.fail(pid, st, msg_of(b))
    return tally


def seed_users_update(api, users):
    tally = Tally("users")
    for u in users:
        pid = u["pid"]
        body = {k: v for k, v in u.items() if k not in ("pid",) and not k.startswith("_")}
        st, b = api.patch(f"/user/{quote(pid, safe='')}", body)
        if st in (200, 201):
            tally.updated += 1
        else:
            tally.fail(pid, st, msg_of(b))
    return tally


def node_body(n, role_ids):
    body = {
        "mac": n["mac"],
        "pid": n.get("owner", "default"),
        "status": n.get("status", "unreg"),
    }
    for key in ("computername", "device_class", "device_type", "notes", "voip"):
        if key in n:
            body[key] = n[key]
    role = n.get("role")
    if role is not None:
        cid = role_ids.get(role)
        if cid is not None:
            body["category_id"] = cid
    return body


def seed_nodes(api, nodes, role_ids, dry):
    tally = Tally("nodes")
    for n in nodes:
        mac = n["mac"]
        body = node_body(n, role_ids)
        if dry:
            print(f"    [dry-run] would create node {mac} "
                  f"(role={n.get('role')}, status={body['status']})")
            tally.created += 1
            continue
        st, b = api.post("/nodes", body)
        if st in (200, 201):
            tally.created += 1
        elif st in EXISTS_STATUSES:
            tally.existed += 1
        else:
            tally.fail(mac, st, msg_of(b))
    return tally


def seed_nodes_update(api, nodes, role_ids):
    tally = Tally("nodes")
    for n in nodes:
        mac = n["mac"]
        body = node_body(n, role_ids)
        body.pop("mac", None)  # mac is the url key, not a patch field
        st, b = api.patch(f"/node/{quote(mac, safe='')}", body)
        if st in (200, 201):
            tally.updated += 1
        else:
            tally.fail(mac, st, msg_of(b))
    return tally


def seed_events(api, events, dry):
    tally = Tally("security_events")
    for e in events:
        mac = e["mac"]
        sid = str(e["security_event_id"])
        key = f"{mac}:{sid}"
        if dry:
            print(f"    [dry-run] would apply security_event {sid} "
                  f"({e.get('_desc', '')}) to {mac}")
            tally.created += 1
            continue
        st, b = api.post(f"/node/{quote(mac, safe='')}/apply_security_event",
                         {"security_event_id": sid})
        if st in (200, 201):
            tally.created += 1
        else:
            tally.fail(key, st, msg_of(b))
    return tally


# ---------- Main --------------------------------------------------------

def main(argv=None):
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--server", required=True, help="PF host (FQDN or IP).")
    p.add_argument("--admin-user", required=True, help="Admin username (write access to nodes/users).")
    p.add_argument("--admin-pass", required=True, help="Admin password.")
    p.add_argument("--api-port", type=int, default=1443, help="REST API port (default 1443).")
    p.add_argument("--data", default=DEFAULT_DATA, help=f"Dataset JSON (default {DEFAULT_DATA}).")
    p.add_argument("--insecure", action="store_true", help="Don't verify TLS (self-signed dev cert).")
    p.add_argument("--update", action="store_true",
                   help="PATCH existing users/nodes to match the dataset instead of skipping them.")
    p.add_argument("--skip-events", action="store_true", help="Don't apply security events.")
    p.add_argument("--dry-run", action="store_true", help="Print what would happen; make no changes.")
    p.add_argument("--timeout", type=int, default=15, help="Per-request timeout in seconds (default 15).")
    args = p.parse_args(argv)

    try:
        with open(args.data, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError) as e:
        raise SystemExit(f"FATAL: cannot read dataset {args.data}: {e}")

    roles = data.get("roles", [])
    users = data.get("users", [])
    nodes = data.get("nodes", [])
    events = data.get("security_events", [])

    print(f"Seeding {args.server}:{args.api_port} from {os.path.basename(args.data)}")
    print(f"  dataset: {len(roles)} roles, {len(users)} users, "
          f"{len(nodes)} nodes, {len(events)} security events"
          f"{'   [DRY RUN]' if args.dry_run else ''}")

    api = Api(args.server, args.api_port, args.insecure, args.timeout)
    if not args.dry_run:
        api.login(args.admin_user, args.admin_pass)
        print("  authenticated OK")

    tallies = []
    role_tally, role_ids = ensure_roles(api, roles, args.dry_run)
    tallies.append(role_tally)

    if args.update and not args.dry_run:
        # Create-or-update: try create first (counts new ones), then PATCH the
        # rest so the dataset is the source of truth on a re-run.
        tallies.append(seed_users(api, users, dry=False))
        tallies.append(seed_users_update(api, users))
        tallies.append(seed_nodes(api, nodes, role_ids, dry=False))
        tallies.append(seed_nodes_update(api, nodes, role_ids))
    else:
        tallies.append(seed_users(api, users, args.dry_run))
        tallies.append(seed_nodes(api, nodes, role_ids, args.dry_run))

    if events and not args.skip_events:
        tallies.append(seed_events(api, events, args.dry_run))
    elif args.skip_events:
        print("  (skipping security events: --skip-events)")

    print("\n=== Summary ===")
    total_failed = 0
    for t in tallies:
        print(t.line())
        total_failed += t.failed
    for t in tallies:
        for key, status, message in t.failures:
            print(f"  FAIL [{t.label}] {key}: HTTP {status} — {message}")

    if total_failed:
        print(f"\nDone with {total_failed} failure(s).")
        return 1
    print("\nDone. All records seeded.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
