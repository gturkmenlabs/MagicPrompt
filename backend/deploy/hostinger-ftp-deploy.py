#!/usr/bin/env python3
"""
Upload the built `dist/` folder to Hostinger public_html over FTP/FTPS.

Required env vars:
  HOSTINGER_FTP_HOST        e.g. ftp://ftp.example.com
  HOSTINGER_FTP_USER        e.g. your_ftp_username
  HOSTINGER_FTP_PASSWORD

Optional env vars:
  HOSTINGER_FTP_PATH        default: public_html
  HOSTINGER_FTP_PORT        default: 21
  HOSTINGER_FTP_SECURE      auto | true | false (default: auto)
  HOSTINGER_BUILD_FIRST     true | false (default: true)
  HOSTINGER_DIST_DIR        default: dist
"""

from __future__ import annotations

import os
import posixpath
import subprocess
from ftplib import FTP, FTP_TLS
from pathlib import Path


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def normalize_host(raw: str) -> str:
    host = raw.strip()
    if host.startswith("ftp://"):
        host = host[6:]
    elif host.startswith("ftps://"):
        host = host[7:]
    return host.rstrip("/")


def run_build_if_needed(dist_dir: Path) -> None:
    build_first = env("HOSTINGER_BUILD_FIRST", "true").lower() != "false"
    if dist_dir.exists() or not build_first:
        return

    print("[build] dist/ not found, running npm run build ...")
    subprocess.run(["npm", "run", "build"], check=True)


def ftp_connect(host: str, port: int, user: str, password: str, secure_mode: str):
    secure_mode = secure_mode.lower()
    if secure_mode not in {"auto", "true", "false"}:
        raise SystemExit("HOSTINGER_FTP_SECURE must be auto, true, or false")

    if secure_mode in {"true", "auto"}:
        try:
            ftp = FTP_TLS()
            ftp.connect(host, port, timeout=30)
            ftp.login(user, password)
            ftp.prot_p()
            print("[ftp] connected with FTPS")
            return ftp
        except Exception as exc:
            if secure_mode == "true":
                raise SystemExit(f"FTPS connection failed: {exc}") from exc
            print(f"[ftp] FTPS failed, falling back to plain FTP: {exc}")

    ftp = FTP()
    ftp.connect(host, port, timeout=30)
    ftp.login(user, password)
    print("[ftp] connected with plain FTP")
    return ftp


def ensure_remote_dir(ftp, remote_dir: str) -> None:
    remote_dir = remote_dir.strip("/")
    if not remote_dir:
        return

    parts = [part for part in remote_dir.split("/") if part]
    current = ""
    for part in parts:
        current = posixpath.join(current, part) if current else part
        try:
            ftp.cwd(current)
        except Exception:
            try:
                ftp.mkd(current)
            except Exception:
                pass
            ftp.cwd(current)


def upload_tree(ftp, local_root: Path, remote_root: str) -> None:
    files = sorted([p for p in local_root.rglob("*") if p.is_file()])
    if not files:
        raise SystemExit(f"No files found in {local_root}")

    remote_root = remote_root.strip("/")
    current_pwd = ftp.pwd().rstrip("/")
    remote_root_exists = False
    if remote_root:
        remote_root_exists = current_pwd.endswith(f"/{remote_root}") or current_pwd == f"/{remote_root}"
        if not remote_root_exists:
            try:
                ftp.cwd(remote_root)
                remote_root_exists = True
            except Exception:
                ensure_remote_dir(ftp, remote_root)
                ftp.cwd(remote_root)
                remote_root_exists = True

    for file_path in files:
        relative = file_path.relative_to(local_root).as_posix()
        remote_dir = posixpath.dirname(relative)
        ftp.cwd("/")
        if remote_root:
            if remote_root_exists:
                ftp.cwd(remote_root)
            else:
                ensure_remote_dir(ftp, remote_root)
                ftp.cwd(remote_root)
        if remote_dir and remote_dir != ".":
            ensure_remote_dir(ftp, remote_dir)

        with file_path.open("rb") as fh:
            print(f"[upload] {relative}")
            ftp.storbinary(f"STOR {file_path.name}", fh)

    ftp.cwd("/")


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    dist_dir = Path(env("HOSTINGER_DIST_DIR", str(root / "dist")))
    if not dist_dir.is_absolute():
        dist_dir = (root / dist_dir).resolve()

    host = normalize_host(env("HOSTINGER_FTP_HOST", ""))
    user = env("HOSTINGER_FTP_USER", "")
    password = env("HOSTINGER_FTP_PASSWORD", "")
    remote_path = env("HOSTINGER_FTP_PATH", "public_html")
    port = int(env("HOSTINGER_FTP_PORT", "21"))
    secure_mode = env("HOSTINGER_FTP_SECURE", "auto")

    if not host or not user or not password:
        print("Missing FTP credentials.")
        print("Set HOSTINGER_FTP_HOST, HOSTINGER_FTP_USER, and HOSTINGER_FTP_PASSWORD.")
        return 1

    run_build_if_needed(dist_dir)
    if not dist_dir.exists():
        print(f"dist directory not found: {dist_dir}")
        return 1

    ftp = ftp_connect(host, port, user, password, secure_mode)
    try:
        upload_tree(ftp, dist_dir, remote_path)
        print(f"[done] Uploaded {dist_dir} to {host}/{remote_path}")
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
