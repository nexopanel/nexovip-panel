#!/usr/bin/env python3
"""
Master patch: Apply ALL NexoVIP changes to original LUFFY_PANEL main.py
in one clean pass. Run from project root.
"""
import re, base64, time

with open("main.py.orig", "r", encoding="utf-8") as f:
    c = f.read()

print(f"Original: {len(c)} chars, {c.count(chr(10))+1} lines")

# ═══════════════════════════════════════════════════════════════
# 1. THEME: Golden → Neon Red
# ═══════════════════════════════════════════════════════════════
theme = {
    "rgba(255,215,0,": "rgba(239,42,58,",
    "#FFD700": "#ef2a3a",
    "#ffd700": "#ef2a3a",
    "#FFC200": "#ff5a63",
    "#ffc200": "#ff5a63",
    "#C8900A": "#8f1020",
    "#c8900a": "#8f1020",
    "#4a3a00": "#2a0a10",
    "--bg:#040810;--bg2:#080f1a;--bg3:#0d1626;": "--bg:#0a0104;--bg2:#100308;--bg3:#180510;",
    "--surface:rgba(8,15,26,0.95);--surface2:rgba(13,22,38,0.9);": "--surface:rgba(20,5,10,0.95);--surface2:rgba(30,8,15,0.9);",
    "--black:#060608;--black2:#0c0c10;--black3:#111118;": "--black:#0d0507;--black2:#180a0d;--black3:#201015;",
    "--surface:rgba(12,12,18,0.97);--surface2:rgba(20,20,28,0.9);--surface3:rgba(28,28,40,0.8);":
        "--surface:rgba(16,4,8,0.97);--surface2:rgba(24,8,14,0.9);--surface3:rgba(32,12,20,0.8);",
    "--gold:var(--accent);--gold-dim:rgba(255,215,0,0.08);--gold-border:rgba(255,215,0,0.15);":
        "--gold:var(--accent);--gold-dim:rgba(239,42,58,0.08);--gold-border:rgba(239,42,58,0.15);",
}
for old, new in theme.items():
    c = c.replace(old, new, 1)

# btn-gold gradient
c = c.replace(
    "background:linear-gradient(135deg,#ffd700,#ffaa00);color:#000;",
    "background:linear-gradient(135deg,#ef2a3a,#ff5a63);color:#000;")
c = c.replace(
    ".btn-gold{background:linear-gradient(135deg,#ffd700,#ffaa00);color:#000;",
    ".btn-gold{background:linear-gradient(135deg,#ef2a3a,#ff5a63);color:#000;")

# Font
c = c.replace("family=Cinzel:wght@700;900", "family=Space+Grotesk:wght@400;600;700")

# ═══════════════════════════════════════════════════════════════
# 2. BRAND: Luffy → NexoVIP
# ═══════════════════════════════════════════════════════════════
c = c.replace("<title>Luffy Panel</title>", "<title>NexoVIP</title>")
c = c.replace('Luffy Panel', 'NexoVIP')
c = c.replace('LUFFY_PANEL', 'NexoVIP')
c = c.replace('LUFFY', 'NexoVIP')
c = c.replace('Luffy-', 'NexoVIP-')
c = c.replace("Luffy", "NexoVIP")

# ═══════════════════════════════════════════════════════════════
# 3. SUBSCRIPTION-USERINFO: Add header + body headers + update-always
# ═══════════════════════════════════════════════════════════════
# Find the /sub/{uid} endpoint and add userinfo header
# First, check if userinfo is already there
if "subscription-userinfo" not in c:
    # Find the endpoint and add headers after the response generation
    # This is complex - search for the key pattern
    pass

# Find: total_bytes = max(0, int(link["limit_bytes"] or 0))
# and the userinfo line
if "subscription-userinfo" not in c:
    # Add userinfo construction before the clash check
    pat1 = '    if is_clash:'
    userinfo_block = '''    # Client apps (v2rayNG, Hiddify, V2Box, Streisand, ...) read these headers
    # and render them like: "Used: X GB / Total GB" + "Expiry: date".
    #   total=0  -> shown as "Unlimited"      expire=0 -> shown as "Never Expire"
    #   upload/download are bytes, expire is a unix timestamp.
    total_bytes = max(0, int(link["limit_bytes"] or 0))
    expire_ts = 0
    if expires_at is not None:
        expire_ts = int(expires_at.timestamp())
    _host = request.headers.get("host") or request.url.netloc
    sub_url = f"https://{_host}/sub/{uid}"
    userinfo = f"upload={int(link['used_bytes'] or 0)}; download=0; total={total_bytes}; expire={expire_ts}"

    if is_clash:'''
    if pat1 in c and userinfo_block not in c:
        c = c.replace(pat1, userinfo_block, 1)

# Add subscription-userinfo header to the non-clash response
# Find the headers dict for non-clash response and add userinfo
pat_userinfo_header = '"profile-web-page-url": sub_url,'
if '"subscription-userinfo": userinfo,' not in c:
    c = c.replace(
        '"profile-web-page-url": sub_url,',
        '"profile-web-page-url": sub_url,\n            "subscription-userinfo": userinfo,',
        1)

# Add update-always to HTTP headers
if '"update-always": "true",' not in c:
    c = c.replace(
        '"subscription-userinfo": userinfo,\n        }\n\n    sub_content = generate_subscription_content(link, uid, addresses)',
        '"subscription-userinfo": userinfo,\n        "update-always": "true",\n    }\n\n    sub_content = generate_subscription_content(link, uid, addresses)',
        1)

# Lower profile-update-interval from 6 to 1
c = c.replace('"profile-update-interval": "6"', '"profile-update-interval": "1"')

# ═══════════════════════════════════════════════════════════════
# 4. BODY HEADERS in generate_subscription_content
# ═══════════════════════════════════════════════════════════════
# Find generate_subscription_content and fix body header format
# Replace # comment lines with v2RayTun format
old_body_pattern = '# subscription-userinfo:'
if old_body_pattern in c:
    # Find and replace the body header block
    idx = c.find(old_body_pattern)
    # Find the start of the line
    line_start = c.rfind('\n', 0, idx) + 1
    # Find the end of the block (the return statement)
    return_idx = c.find('return "\\n".join(header_lines + links_out)', idx)
    if return_idx > 0:
        block_end = c.find('\n', return_idx) + 1
        old_block = c[line_start:block_end]
        new_block = '''    sub_info_line = f'subscription-userinfo: "upload={int(used or 0)}; download=0; total={total_bytes}; expire={expire_ts}"'
    profile_title = f"NexoVIP-{link['label']}"
    
    links_out = links_for_all_variants(link, uid)
    for addr in addresses:
        links_out.extend(links_for_all_variants(link, uid, address=addr))
    
    # Body headers: v2RayTun and similar clients parse these from the
    # decoded body. Format: key: "value" (no # prefix, with quotes).
    header_lines = [
        sub_info_line,
        f'profile-title: "{profile_title}"',
        'profile-update-interval: "1"',
        'update-always: "true"',
        "",
    ]
    return "\\n".join(header_lines + links_out)
'''
        c = c[:line_start] + new_block + c[block_end:]
        print("PATCHED: body headers to v2RayTun format")

# ═══════════════════════════════════════════════════════════════
# 5. USAGE IN FIRST CONFIG REMARK ONLY
# ═══════════════════════════════════════════════════════════════
# Add include_usage param to link_for_variant
if 'include_usage: bool = False' not in c:
    c = c.replace(
        'def link_for_variant(link: dict, uid: str, auth: str, address: str = None) -> str | None:',
        'def link_for_variant(link: dict, uid: str, auth: str, address: str = None, include_usage: bool = False) -> str | None:',
        1)

# Add usage/expiry computation when include_usage=True
old_remark = '''    return generate_vless_link(
        uid,
        remark=f"NexoVIP-{link.get('label', '')}",
        address=address,
        protocol=protocol,
        fingerprint=variant.get("fingerprint"),
        alpn=variant.get("alpn"),
    )'''

new_remark = '''    # Usage/expiry info only for the first config
    if include_usage:
        _used = link.get("used_bytes", 0) or 0
        _limit = link.get("limit_bytes", 0) or 0
        _usage_txt = f"{_fmt_bytes(_used)} / {'\\u221e' if _limit == 0 else _fmt_bytes(_limit)}"
        _exp_raw = link.get("expires_at")
        _secs = seconds_until_expiry(_exp_raw)
        if _secs is None:
            _exp_txt = "\\u221e"
        elif _secs <= 0:
            _exp_txt = "Expired"
        else:
            _exp_txt = f"{_secs // 86400}d"
        _remark = f"{link.get('label', '')} [\\U0001f4ca{_usage_txt} \\U0001f4c5{_exp_txt}]"
    else:
        _remark = link.get('label', '')
    return generate_vless_link(
        uid,
        remark=f"NexoVIP-{_remark}",
        address=address,
        protocol=protocol,
        fingerprint=variant.get("fingerprint"),
        alpn=variant.get("alpn"),
    )'''

if 'include_usage: bool = False' in c and 'if include_usage:' not in c:
    c = c.replace(old_remark, new_remark, 1)

# Fix links_for_all_variants to pass include_usage for first only
old_all = '''def links_for_all_variants(link: dict, uid: str, address: str = None) -> list[str]:
    """Generate share links for all active variants of this link."""
    out = []
    for auth in AUTH_TYPES:
        share_link = link_for_variant(link, uid, auth, address=address)
        if share_link:
            out.append(share_link)
    return out'''

new_all = '''def links_for_all_variants(link: dict, uid: str, address: str = None) -> list[str]:
    """Generate share links for all active variants of this link."""
    out = []
    first = True
    for auth in AUTH_TYPES:
        share_link = link_for_variant(link, uid, auth, address=address, include_usage=first)
        if share_link:
            out.append(share_link)
            first = False
    return out'''

if old_all in c:
    c = c.replace(old_all, new_all, 1)
elif 'for auth in AUTH_TYPES:\n        share_link = link_for_variant(link, uid, auth, address=address)\n        if share_link:\n            out.append(share_link)' in c:
    c = c.replace(
        'for auth in AUTH_TYPES:\n        share_link = link_for_variant(link, uid, auth, address=address)\n        if share_link:\n            out.append(share_link)',
        'first = True\n    for auth in AUTH_TYPES:\n        share_link = link_for_variant(link, uid, auth, address=address, include_usage=first)\n        if share_link:\n            out.append(share_link)\n            first = False',
        1)

# ═══════════════════════════════════════════════════════════════
# SAVE
# ═══════════════════════════════════════════════════════════════
with open("main.py", "w", encoding="utf-8") as f:
    f.write(c)

print(f"Patched: {len(c)} chars, {c.count(chr(10))+1} lines")

# Verify
import py_compile
py_compile.compile("main.py", doraise=True)
print("SYNTAX OK")

# Verify key patches applied
checks = [
    ("subscription-userinfo header", '"subscription-userinfo": userinfo,' in c),
    ("update-always header", '"update-always": "true",' in c),
    ("body headers v2raytun format", 'subscription-userinfo: "upload=' in c),
    ("profile-update-interval: 1", '"profile-update-interval": "1"' in c),
    ("include_usage param", "include_usage: bool = False" in c),
    ("first flag in loop", "first = True\n    for auth in AUTH_TYPES:" in c),
    ("NexoVIP branding", "NexoVIP" in c and "Luffy Panel" not in c),
    ("Red theme", "#ef2a3a" in c),
    ("Space Grotesk font", "Space+Grotesk" in c),
]
print("\n=== VERIFICATION ===")
for name, ok in checks:
    status = "✅" if ok else "❌"
    print(f"  {status} {name}")
