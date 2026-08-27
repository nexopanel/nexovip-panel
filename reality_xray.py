# reality_xray.py
# ══════════════════════════════════════════════════════════════════════════════
# RealityCore برای NexoVIP — اجرای واقعی VLESS + XHTTP + REALITY از طریق Xray-core.
# پنل این فایل را در startup صدا می‌زند؛ هر اینباندي که Reality داشته باشد یک
# listener واقعی روی پورت دلخواه کاربر می‌گیرد و کلیدهایش با خود `xray x25519`
# تولید و ذخیره می‌شوند (هیچ کلید ساختگی جایی ساخته نمی‌شود).
# ══════════════════════════════════════════════════════════════════════════════

import asyncio
import json
import os
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import httpx

import logging

logger = logging.getLogger("NexoVIP-Gateway")

XRAY_RELEASE_API = "https://api.github.com/repos/XTLS/Xray-core/releases/latest"
XRAY_ENV_BINARY = os.environ.get("XRAY_BINARY_PATH", "").strip()

_DATA_DIR = "/data" if os.path.isdir("/data") else os.path.dirname(os.path.abspath(__file__))
BIN_DIR = os.path.join(_DATA_DIR, "xray-bin")
CONFIG_PATH = os.path.join(_DATA_DIR if os.path.isdir("/data") else os.getcwd(), "xray-config.json")
_VERSION_MARKER = os.path.join(BIN_DIR, "version.txt")

_proc: asyncio.subprocess.Process | None = None
_PROC_LOCK = asyncio.Lock()
_starting = False

_keygen_override = None  # تست‌ها می‌تونن جایگزین کنن


def set_keygen_for_tests(fn):
    global _keygen_override
    _keygen_override = fn


def _arch_asset_name() -> str:
    machine = os.uname().machine.lower()
    if machine in ("arm64", "aarch64"):
        return "Xray-linux-arm64-v8a.zip"
    if machine == "armv7l":
        return "Xray-linux-arm32-v7a.zip"
    return "Xray-linux-64.zip"


def _binary_path() -> Path:
    override = XRAY_ENV_BINARY
    if override:
        return Path(override)
    return Path(BIN_DIR) / "xray"


def cached_version() -> str | None:
    try:
        return Path(_VERSION_MARKER).read_text(encoding="utf-8").strip()
    except Exception:
        return None


async def ensure_binary() -> str | None:
    """مسیر باینری xray رو برمی‌گردونه؛ اگه نبود، آخرین ریلیز رسمی رو دانلود و
    استخراج می‌کنه و مسیر رو کش می‌کنه. خرابی شبکه فقط یه خطا لاگ می‌کنه،
    هرگز پروسهٔ اصلی رو نمی‌ندازه."""
    bp = _binary_path()
    if XRAY_ENV_BINARY and bp.exists():
        return str(bp)

    if bp.exists():
        ver = cached_version()
        if ver:
            return str(bp)
        # باینری هست ولی مارکر نداره؛ باز خوبه — استفاده می‌کنیم.
        return str(bp)

    if _keygen_override is not None:
        # حالت تست: دانلود واقعی نمی‌خوایم
        return None

    try:
        bp.parent.mkdir(parents=True, exist_ok=True)
        headers = {"Accept": "application/vnd.github+json"}
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=20.0),
                                     follow_redirects=True) as client:
            meta = await client.get(XRAY_RELEASE_API, headers=headers)
            meta.raise_for_status()
            assets = (meta.json() or {}).get("assets", [])
            asset = next((a for a in assets if a.get("name") == _arch_asset_name()), None)
            if not asset:
                logger.warning("[REALITY] Xray release asset %s not found", _arch_asset_name())
                return None
            wanted_ver = (meta.json() or {}).get("tag_name") or "latest"
            marker = Path(_VERSION_MARKER)
            if bp.exists() and marker.exists() and marker.read_text().strip() == wanted_ver:
                return str(bp)

            logger.info("[REALITY] downloading %s (%s)...", asset["name"], wanted_ver)
            dl = await client.get(asset["browser_download_url"])
            dl.raise_for_status()
        zip_path = Path(BIN_DIR) / "xray.zip"
        zip_path.write_bytes(dl.content)
        with zipfile.ZipFile(zip_path) as zf:
            member = next(n for n in zf.namelist() if Path(n).name == "xray")
            zf.extract(member, BIN_DIR)
            extracted = Path(BIN_DIR) / member
            target = Path(BIN_DIR) / "xray"
            if extracted != target:
                shutil.move(str(extracted), str(target))
        zip_path.unlink(missing_ok=True)
        os.chmod(bp, 0o755)
        Path(_VERSION_MARKER).parent.mkdir(parents=True, exist_ok=True)
        Path(_VERSION_MARKER).write_text(wanted_ver, encoding="utf-8")
        logger.info("[REALITY] Xray-core %s ready at %s", wanted_ver, bp)
        return str(bp)
    except Exception as exc:
        logger.error("[REALITY] could not provision Xray-core binary: %s", exc)
        return None


async def generate_keypair() -> dict:
    """کلیدهای معتبر Reality را با خود Xray تولید می‌کند."""
    if _keygen_override is not None:
        return dict(await _keygen_override())

    binary = await ensure_binary()
    if not binary:
        raise RuntimeError("Xray binary unavailable; cannot generate Reality keys")

    proc = await asyncio.create_subprocess_exec(
        binary, "x25519",
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    out, err = await asyncio.wait_for(proc.communicate(), timeout=15.0)
    if proc.returncode != 0:
        raise RuntimeError(f"xray x25519 failed rc={proc.returncode}: {err.decode(errors='ignore')}")

    priv = pub = None
    for line in out.decode(errors="ignore").splitlines():
        line = line.strip()
        low = line.lower()
        if low.startswith("private key:"):
            priv = line.split(":", 1)[1].strip()
        elif low.startswith("public key:"):
            pub = line.split(":", 1)[1].strip()
    if not priv or not pub:
        raise RuntimeError(f"unexpected xray x25519 output: {out.decode(errors='ignore')[:200]}")
    return {"private_key": priv, "public_key": pub}


def build_inbound(uid: str, link: dict) -> dict | None:
    """یک inbound واقعی Xray برای لینک‌های Reality-enabled می‌سازد."""
    r = link.get("reality") or {}
    if not r.get("enabled"):
        return None
    pk, pub, sid, sni = r.get("private_key"), r.get("public_key"), r.get("short_id"), r.get("sni")
    port = int(r.get("port") or 0)
    if not (pk and pub and sid and sni and 1 <= port <= 65535):
        return None

    vless_variant = (link.get("variants") or {}).get("vless") or {}
    transport = vless_variant.get("transport", "ws")
    mode = "stream-up" if transport == "xhttp-stream-up" else "packet-up"

    return {
        "tag": f"in-r-{uid[:8]}",
        "listen": "0.0.0.0",
        "port": port,
        "protocol": "vless",
        "settings": {
            "decryption": "none",
            "clients": [{"id": uid, "level": 0}],
        },
        "sniffing": {"enabled": True, "destOverride": ["http", "tls", "quic"]},
        "streamSettings": {
            "network": "xhttp",
            "security": "reality",
            "xhttpSettings": {"mode": mode},
            "realitySettings": {
                "show": False,
                "dest": f"{sni}:{int(r.get('dest_port') or 443)}",
                "xver": 0,
                "serverNames": [sni],
                "privateKey": pk,
                "shortIds": [sid],
            },
        },
    }


async def _snapshot_links():
    """از main ماژول‌های موردنیاز late-import می‌گیریم تا چرخهٔ ایمپورت نشه."""
    import main as panel
    async with panel.LINKS_LOCK:
        items = []
        for uid, link in list(panel.LINKS.items()):
            r = link.get("reality") or {}
            if not r.get("enabled"):
                continue
            exp = panel.parse_expires_at(link.get("expires_at"))
            expired = exp is not None and exp < datetime.now(timezone.utc)
            if expired or not link.get("active"):
                continue
            items.append((uid, dict(link)))
    return items


def build_config(links_snapshot: list[tuple[str, dict]]) -> dict:
    inbounds = []
    for uid, link in links_snapshot:
        ib = build_inbound(uid, link)
        if ib:
            inbounds.append(ib)
    return {
        "log": {"loglevel": "warning"},
        "inbounds": inbounds,
        "outbounds": [{"protocol": "freedom", "tag": "direct"}],
    }


async def _write_config(config: dict) -> bool:
    try:
        tmp = CONFIG_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        os.replace(tmp, CONFIG_PATH)
        return True
    except Exception as exc:
        logger.error("[REALITY] failed writing xray config: %s", exc)
        return False


async def _spawn(binary: str):
    global _proc
    _proc = await asyncio.create_subprocess_exec(
        binary, "run", "-c", CONFIG_PATH,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    asyncio.ensure_future(_drain_logs())


async def _drain_logs():
    global _proc
    proc = _proc
    if not proc or not proc.stderr:
        return
    async for raw in proc.stderr:
        line = raw.decode(errors="ignore").rstrip()
        if line:
            logger.info("[xray] %s", line)


async def _stop_current():
    global _proc
    proc, _proc = _proc, None
    if proc is None or proc.returncode is not None:
        return
    try:
        proc.terminate()
        await asyncio.wait_for(proc.wait(), timeout=5.0)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
    except Exception:
        pass


async def restart_with_config(config: dict):
    global _starting
    async with _PROC_LOCK:
        if _starting:
            return
        _starting = True
        try:
            if not await _write_config(config):
                return
            binary = await ensure_binary()
            if not binary:
                logger.warning("[REALITY] Xray binary unavailable; skipping process start")
                return
            await _stop_current()
            await _spawn(binary)
            rc_ready = _proc.returncode is None if _proc else False
            logger.info("[REALITY] xray %s (pid=%s, inbounds=%d)", "running" if rc_ready else "exited?",
                        _proc.pid if _proc else "-", len(config.get("inbounds", [])))
        finally:
            _starting = False


async def sync_all(*_args):
    """لیست LINKS فعلی → کلیدهای غایب را می‌سازد → ذخیره → ری‌استارت xray."""
    import main as panel

    links = await _snapshot_links()
    dirty = False
    built = []
    seen_ports = set()
    for uid, link in links:
        r = link["reality"]
        port = int(r.get("port") or 0)
        if port <= 0 or port in seen_ports:
            continue
        seen_ports.add(port)
        if not r.get("short_id"):
            # پیش‌فرض در sanitize ست شده؛ اگه خالی بود هم امن تولیدش کنیم
            import secrets
            r["short_id"] = secrets.token_hex(4)
        if not r.get("private_key") or not r.get("public_key"):
            try:
                kp = await generate_keypair()
                r["private_key"], r["public_key"] = kp["private_key"], kp["public_key"]
                dirty = True
                logger.info("[REALITY] generated fresh keys for '%s' (port %d)",
                            link.get("label", uid), port)
            except Exception as exc:
                logger.error("[REALITY] keygen failed for '%s': %s", link.get("label", uid), exc)
                continue
        built.append((uid, link))

    if dirty:
        try:
            await panel.save_db()
        except Exception as exc:
            logger.warning("[REALITY] persisting new keys failed: %s", exc)

    config = build_config(built)
    await restart_with_config(config)
    return len(config["inbounds"])


async def shutdown():
    async with _PROC_LOCK:
        await _stop_current()


def status() -> dict:
    running = bool(_proc and _proc.returncode is None)
    return {
        "running": running,
        "pid": _proc.pid if _proc else None,
        "binary": str(_binary_path()),
        "binary_exists": _binary_path().exists(),
        "binary_cache_only": _keygen_override is not None,
        "config_path": CONFIG_PATH,
        "version": cached_version(),
    }
