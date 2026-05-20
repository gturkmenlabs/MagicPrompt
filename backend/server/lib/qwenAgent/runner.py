#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path
from typing import Any


def _default_model() -> str:
    return os.environ.get("QWEN_AGENT_MODEL", "qwen3-32b")


def _default_provider() -> str:
    return "openai-compatible" if os.environ.get("QWEN_AGENT_MODEL_SERVER") else "dashscope"


def _candidate_repo_paths() -> list[str]:
    cwd = Path.cwd()
    home = Path.home()
    candidates = [
        os.environ.get("QWEN_AGENT_REPO_PATH", ""),
        str(cwd / "Qwen-Agent-main"),
        str(cwd.parent / "Qwen-Agent-main"),
        str(home / "Downloads" / "Qwen-Agent-main"),
    ]
    return [str(Path(x).expanduser()) for x in candidates if x]


def _resolve_repo_path() -> str | None:
    for candidate in _candidate_repo_paths():
        path = Path(candidate).expanduser()
        if (path / "qwen_agent").exists():
            return str(path)
    return None


def _json_print(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))


def _status_payload(ready: bool, repo_path: str | None = None, error: str | None = None, code: str | None = None) -> dict[str, Any]:
    return {
        "ok": True,
        "ready": ready,
        "sdk": "qwen-agent",
        "model": _default_model(),
        "provider": _default_provider(),
        "repoPath": repo_path,
        "error": error,
        "code": code,
    }


def _extract_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
            else:
                text = getattr(item, "text", None)
            if text:
                parts.append(str(text))
        return "\n".join(parts).strip()
    return ""


def _load_agent_components(repo_path: str):
    if repo_path not in sys.path:
        sys.path.insert(0, repo_path)
    from qwen_agent.agents import Assistant  # type: ignore

    return Assistant


def _build_llm_cfg() -> dict[str, Any]:
    model = _default_model()
    model_server = os.environ.get("QWEN_AGENT_MODEL_SERVER", "").strip()
    max_input_tokens = int(os.environ.get("QWEN_AGENT_MAX_INPUT_TOKENS", "32000"))
    generate_cfg: dict[str, Any] = {
        "max_input_tokens": max_input_tokens,
        "max_retries": 1,
    }

    use_raw_api = os.environ.get("QWEN_AGENT_USE_RAW_API", "")
    if use_raw_api:
        generate_cfg["use_raw_api"] = use_raw_api.lower() == "true"
    elif not model_server:
        generate_cfg["use_raw_api"] = True

    api_key = (
        os.environ.get("QWEN_AGENT_API_KEY")
        or os.environ.get("DASHSCOPE_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or "EMPTY"
    )

    if model_server:
        return {
            "model": model,
            "model_server": model_server,
            "api_key": api_key,
            "generate_cfg": generate_cfg,
        }

    return {
        "model": model,
        "model_type": os.environ.get("QWEN_AGENT_MODEL_TYPE", "qwen_dashscope"),
        "api_key": api_key,
        "generate_cfg": generate_cfg,
    }


def _ensure_runtime_ready() -> tuple[str | None, str | None, str | None]:
    repo_path = _resolve_repo_path()
    if not repo_path:
        return None, "QWEN_AGENT_REPO_MISSING", (
            "Qwen-Agent checkout not found. Set QWEN_AGENT_REPO_PATH or place Qwen-Agent-main next to the repo."
        )

    try:
        _load_agent_components(repo_path)
    except Exception as exc:  # pragma: no cover - surfaced to Node
        return repo_path, "QWEN_AGENT_IMPORT_FAILED", str(exc)

    if not os.environ.get("QWEN_AGENT_MODEL_SERVER"):
        has_dashscope_key = bool(os.environ.get("QWEN_AGENT_API_KEY") or os.environ.get("DASHSCOPE_API_KEY"))
        if not has_dashscope_key:
            return repo_path, "QWEN_KEY_MISSING", (
                "Missing DASHSCOPE_API_KEY or QWEN_AGENT_API_KEY for Qwen-Agent."
            )

    return repo_path, None, None


def _run_agent(payload: dict[str, Any]) -> dict[str, Any]:
    repo_path, code, error = _ensure_runtime_ready()
    if code or not repo_path:
        return {
            "ok": False,
            "sdk": "qwen-agent",
            "model": _default_model(),
            "provider": _default_provider(),
            "repoPath": repo_path,
            "code": code,
            "error": error,
        }

    try:
        Assistant = _load_agent_components(repo_path)
        llm_cfg = _build_llm_cfg()
        bot = Assistant(
            llm=llm_cfg,
            system_message=str(payload.get("systemPrompt") or "").strip(),
            name="Super Reasoning Qwen Agent",
            description="Qwen-Agent bridge for Super Reasoning AI Lab.",
        )
        messages = [{"role": "user", "content": str(payload.get("query") or "")}]
        lang = "zh" if payload.get("language") == "zh" else "en"
        knowledge = str(payload.get("knowledge") or "")

        last_response = []
        for response in bot.run(messages=messages, lang=lang, knowledge=knowledge):
            last_response = response

        answer = ""
        for message in last_response:
            role = message.get("role") if isinstance(message, dict) else getattr(message, "role", "")
            if role == "assistant":
                content = message.get("content") if isinstance(message, dict) else getattr(message, "content", "")
                answer = _extract_text(content)

        if not answer and last_response:
            last = last_response[-1]
            content = last.get("content") if isinstance(last, dict) else getattr(last, "content", "")
            answer = _extract_text(content)

        return {
            "ok": True,
            "sdk": "qwen-agent",
            "model": llm_cfg.get("model", _default_model()),
            "provider": _default_provider(),
            "repoPath": repo_path,
            "answer": answer.strip(),
        }
    except Exception as exc:  # pragma: no cover - surfaced to Node
        return {
            "ok": False,
            "sdk": "qwen-agent",
            "model": _default_model(),
            "provider": _default_provider(),
            "repoPath": repo_path,
            "code": "QWEN_AGENT_RUN_FAILED",
            "error": str(exc),
        }


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        _json_print({
            "ok": False,
            "sdk": "qwen-agent",
            "model": _default_model(),
            "provider": _default_provider(),
            "code": "QWEN_AGENT_INVALID_INPUT",
            "error": "Invalid JSON payload.",
        })
        return

    action = payload.get("action")
    if action == "status":
        repo_path, code, error = _ensure_runtime_ready()
        _json_print(_status_payload(ready=code is None, repo_path=repo_path, error=error, code=code))
        return

    if action == "run":
        _json_print(_run_agent(payload))
        return

    _json_print({
        "ok": False,
        "sdk": "qwen-agent",
        "model": _default_model(),
        "provider": _default_provider(),
        "code": "QWEN_AGENT_UNKNOWN_ACTION",
        "error": f"Unsupported action: {action}",
    })


if __name__ == "__main__":
    main()
