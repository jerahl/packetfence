#!/usr/bin/env python3
"""
PacketFence load tester — simulate many endpoints authenticating and
populate the API with synthetic data.

Use it on your own PF dev/test box. Authentication runs against the
PF RADIUS frontend; the host you run this from must be configured as
a `client` in raddb/clients.conf with a known shared secret.

Modes
-----
  radius-mab   MAB — User-Name = User-Password = MAC.  Service-Type
               Call-Check.  No EAP. Simplest RADIUS path for IoT-style
               devices.
  radius-pap   Username + password (PAP). Useful when an internal
               authentication source is configured for plain PAP.
  radius-acct  RADIUS accounting Start packets (Acct-Status-Type = 1).
               Useful for testing pfacct ingest throughput.
  api-populate Create N synthetic nodes via POST /api/v1/nodes
               on the PF REST API. Drives the admin/UI side of the
               system rather than the RADIUS path.

For full 802.1X EAP-PEAP / EAP-TLS load, use hostapd's eapol_test —
that's what the existing addons/stress-tester scripts wrap. This tool
deliberately stays out of the EAP business in exchange for being a
single Python file with no native dependencies.

Example
-------
  # 50 auths/sec for 60s, against pfdev, 200 synthetic devices
  ./pf-loadtest.py --mode radius-mab \\
      --server pfdev --secret testing123 \\
      --users 200 --rate 50 --duration 60
"""

from __future__ import annotations

import argparse
import json
import os
import random
import ssl
import sys
import threading
import time
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

try:
    from pyrad.client import Client
    from pyrad.dictionary import Dictionary
    import pyrad.packet
except ImportError:
    sys.stderr.write("pyrad is required for RADIUS modes. Install with: "
                     "pip install -r requirements.txt\n")
    Client = None


# ---------- Synthetic identity generation -------------------------------

# Same OUI set as the v2 admin's mock data so what shows up in the UI
# during testing looks coherent.
VENDOR_OUIS = [
    "3C:5A:B4", "F0:18:98", "DC:A6:32", "00:1A:11",
    "B8:27:EB", "00:E0:4C", "70:85:C2", "A4:83:E7",
    "00:25:9C", "F4:F5:E8", "B8:78:2E", "00:0C:29",
    "5C:E0:C5", "E4:5F:01", "00:50:56",
]
USERNAMES = [
    "khalil.osman", "mira.tomasek", "jordan.lee", "anika.devi",
    "soren.ng", "tomas.berg", "rina.k", "wei.liu", "fatou.diop",
    "ben.kowalski", "elena.cruz", "raj.patel", "yuki.tanaka",
    "lucia.rossi", "amber.holm", "noah.brand", "ines.duarte",
    "marko.s", "sara.al",
]
ROLES = ["employee", "contractor", "guest", "byod", "voip", "iot-trusted"]


def gen_identity(seed: int, password: str) -> dict:
    """Deterministic synthetic endpoint+user from a seed. The same seed
    always produces the same MAC/username/role so a re-run hits the
    same pool of identities."""
    r = random.Random(seed)
    oui = r.choice(VENDOR_OUIS)
    suffix = ":".join(f"{r.randint(0, 255):02X}" for _ in range(3))
    return {
        "mac":      f"{oui}:{suffix}",
        "username": f"{r.choice(USERNAMES)}.{seed:05d}",
        "password": password,
        "role":     r.choice(ROLES),
        "session":  f"sess-{seed:08d}-{int(time.time())}",
    }


# ---------- RADIUS path -------------------------------------------------

# Tiny dictionary bundled with this script — the standard RADIUS
# attributes the modes here need, nothing more. Avoids depending on
# /usr/share/freeradius/dictionary being present on the test runner.
DICT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "radius_dictionary")


def make_radius_client(args) -> "Client":
    if Client is None:
        sys.exit(1)
    client = Client(
        server=args.server,
        secret=args.secret.encode("utf-8"),
        authport=args.port,
        acctport=args.acct_port,
        dict=Dictionary(DICT_FILE),
    )
    client.timeout = args.timeout
    client.retries = 1
    return client


def radius_auth(client, ident, mode, nas_ip) -> tuple[str, float]:
    if mode == "radius-mab":
        username = ident["mac"]
        password = ident["mac"]
    else:  # radius-pap
        username = ident["username"]
        password = ident["password"]
    req = client.CreateAuthPacket(code=pyrad.packet.AccessRequest,
                                  User_Name=username)
    req["User-Password"] = req.PwCrypt(password)
    req["NAS-IP-Address"] = nas_ip
    req["Calling-Station-Id"] = ident["mac"]
    req["Called-Station-Id"] = "00:11:22:33:44:55:CORP-WPA2EAP"
    req["NAS-Port-Type"] = 19  # Wireless-802.11
    req["NAS-Port"] = 0
    if mode == "radius-mab":
        req["Service-Type"] = 10  # Call-Check
    t0 = time.monotonic()
    try:
        reply = client.SendPacket(req)
        lat = (time.monotonic() - t0) * 1000
        if reply.code == pyrad.packet.AccessAccept: return ("accept", lat)
        if reply.code == pyrad.packet.AccessReject: return ("reject", lat)
        return (f"code-{reply.code}", lat)
    except Exception as e:
        return (type(e).__name__, (time.monotonic() - t0) * 1000)


def radius_acct(client, ident, nas_ip) -> tuple[str, float]:
    req = client.CreateAcctPacket(User_Name=ident["username"])
    req["NAS-IP-Address"] = nas_ip
    req["Calling-Station-Id"] = ident["mac"]
    req["Acct-Session-Id"] = ident["session"]
    req["Acct-Status-Type"] = 1  # Start
    req["Acct-Authentic"] = 1    # RADIUS
    t0 = time.monotonic()
    try:
        reply = client.SendPacket(req)
        lat = (time.monotonic() - t0) * 1000
        return ("ok" if reply.code == pyrad.packet.AccountingResponse else f"code-{reply.code}", lat)
    except Exception as e:
        return (type(e).__name__, (time.monotonic() - t0) * 1000)


# ---------- API populate path ------------------------------------------

def api_populate_one(args, token, ident) -> tuple[str, float]:
    body = {
        "mac": ident["mac"],
        "status": "reg",
        "pid": ident["username"],
        "category": ident["role"],
        "computername": f"loadtest-{ident['mac'].replace(':', '')}",
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"https://{args.server}:{args.api_port}/api/v1/nodes",
        data=data, method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    ctx = ssl._create_unverified_context() if args.insecure else None
    t0 = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=args.timeout, context=ctx) as r:
            lat = (time.monotonic() - t0) * 1000
            return (f"http-{r.status}", lat)
    except urllib.error.HTTPError as e:
        return (f"http-{e.code}", (time.monotonic() - t0) * 1000)
    except Exception as e:
        return (type(e).__name__, (time.monotonic() - t0) * 1000)


def api_login(args) -> str:
    ctx = ssl._create_unverified_context() if args.insecure else None
    data = json.dumps({"username": args.admin_user, "password": args.admin_pass}).encode("utf-8")
    req = urllib.request.Request(
        f"https://{args.server}:{args.api_port}/api/v1/login",
        data=data, method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=args.timeout, context=ctx) as r:
        body = json.loads(r.read().decode("utf-8"))
    token = body.get("token")
    if not token:
        raise RuntimeError(f"no token in login response: {body!r}")
    return token


# ---------- Driver ------------------------------------------------------

class Stats:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.counts = Counter()
        self.latencies: list[float] = []
        self.sent = 0

    def record(self, outcome: str, latency: float) -> None:
        with self.lock:
            self.counts[outcome] += 1
            self.latencies.append(latency)

    def snapshot(self) -> tuple[int, Counter, list[float]]:
        with self.lock:
            return self.sent, Counter(self.counts), list(self.latencies)


def percentile(sorted_values: list[float], p: float) -> float:
    if not sorted_values:
        return 0.0
    idx = min(len(sorted_values) - 1, int(len(sorted_values) * p))
    return sorted_values[idx]


def drive(args, work_fn) -> None:
    stats = Stats()
    pool = ThreadPoolExecutor(max_workers=args.workers)
    start = time.monotonic()
    deadline = start + args.duration
    interval = 1.0 / args.rate
    next_tick = start
    last_report = start

    def on_done(fut):
        try:
            outcome, latency = fut.result()
        except Exception as e:
            outcome, latency = (type(e).__name__, 0.0)
        stats.record(outcome, latency)

    print(f"Starting: mode={args.mode} target={args.rate:.1f}/s for {args.duration}s, "
          f"users={args.users}, workers={args.workers}")
    try:
        while True:
            now = time.monotonic()
            if now >= deadline:
                break
            if now >= next_tick:
                ident = gen_identity(random.randrange(args.users), args.password)
                fut = pool.submit(work_fn, ident)
                fut.add_done_callback(on_done)
                with stats.lock:
                    stats.sent += 1
                next_tick += interval
                # If we fall behind, don't try to catch up — pace from "now"
                # so latency only reflects real RTT, not queueing.
                if now > next_tick + interval:
                    next_tick = now + interval
            else:
                time.sleep(min(0.005, max(0.0, next_tick - now)))
            if now - last_report >= 5.0:
                last_report = now
                sent, counts, lats = stats.snapshot()
                done = sum(counts.values())
                tail = lats[-100:] if lats else [0.0]
                avg = sum(tail) / len(tail)
                ok = counts.get("accept", 0) + counts.get("ok", 0) + sum(
                    v for k, v in counts.items() if k.startswith("http-2"))
                print(f"  t={int(now-start):3d}s  sent={sent:6d} done={done:6d} "
                      f"ok={ok:6d}  avg(last 100)={avg:6.0f}ms")
    except KeyboardInterrupt:
        print("Interrupted; waiting for in-flight...")

    pool.shutdown(wait=True)

    sent, counts, lats = stats.snapshot()
    lats.sort()
    total = sum(counts.values())
    print("\n=== Results ===")
    print(f"  Submitted: {sent}")
    print(f"  Completed: {total}")
    for k, v in counts.most_common():
        pct = (v / total * 100) if total else 0
        print(f"    {k:<20} {v:6d}  ({pct:5.1f}%)")
    if lats:
        print(f"  Latency  p50={percentile(lats, 0.50):6.0f}ms "
              f"p95={percentile(lats, 0.95):6.0f}ms "
              f"p99={percentile(lats, 0.99):6.0f}ms "
              f"max={lats[-1]:6.0f}ms")
    elapsed = time.monotonic() - start
    if elapsed > 0:
        print(f"  Effective rate: {total/elapsed:.1f}/s over {elapsed:.1f}s")


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--mode", required=True,
                   choices=["radius-mab", "radius-pap", "radius-acct", "api-populate"])
    p.add_argument("--server", required=True,
                   help="PF host (RADIUS + REST API). FQDN or IP.")
    p.add_argument("--users", type=int, default=100,
                   help="Pool size of synthetic identities (default 100).")
    p.add_argument("--rate", type=float, default=10.0,
                   help="Target requests per second (default 10).")
    p.add_argument("--duration", type=int, default=60,
                   help="How long to run, in seconds (default 60).")
    p.add_argument("--workers", type=int, default=64,
                   help="Concurrent worker threads (default 64).")
    p.add_argument("--timeout", type=int, default=5,
                   help="Per-request timeout in seconds (default 5).")
    # RADIUS-specific
    p.add_argument("--secret", default=None,
                   help="RADIUS shared secret. Required for radius-* modes.")
    p.add_argument("--port", type=int, default=1812, help="RADIUS auth port.")
    p.add_argument("--acct-port", type=int, default=1813, help="RADIUS acct port.")
    p.add_argument("--nas-ip", default="127.0.0.1",
                   help="NAS-IP-Address sent on each request (default 127.0.0.1).")
    p.add_argument("--password", default="test1234",
                   help="Password for radius-pap (default test1234).")
    # API-specific
    p.add_argument("--api-port", type=int, default=1443,
                   help="PF REST API port (default 1443).")
    p.add_argument("--admin-user", default=None,
                   help="Admin username for api-populate mode.")
    p.add_argument("--admin-pass", default=None,
                   help="Admin password for api-populate mode.")
    p.add_argument("--insecure", action="store_true",
                   help="Don't verify TLS (dev box w/ self-signed cert).")
    args = p.parse_args(argv)

    if args.mode.startswith("radius-"):
        if not args.secret:
            p.error("--secret is required for RADIUS modes")
        client = make_radius_client(args)
        if args.mode == "radius-acct":
            work = lambda ident: radius_acct(client, ident, args.nas_ip)
        else:
            work = lambda ident: radius_auth(client, ident, args.mode, args.nas_ip)
    elif args.mode == "api-populate":
        if not args.admin_user or not args.admin_pass:
            p.error("--admin-user and --admin-pass are required for api-populate")
        token = api_login(args)
        work = lambda ident: api_populate_one(args, token, ident)
    else:
        p.error(f"unknown mode {args.mode}")
        return

    drive(args, work)


if __name__ == "__main__":
    main()
