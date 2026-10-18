#!/usr/bin/env python3
"""Check the vendored Agency catalogue and its Codex configuration."""
from __future__ import annotations
import json
import pathlib
import re
import sys
import tomllib

ROOT = pathlib.Path(__file__).resolve().parents[1]
cfg = tomllib.loads((ROOT / ".codex/config.toml").read_text(encoding="utf-8"))
assert cfg["agents"]["enabled"] is True
assert 1 <= cfg["agents"]["max_concurrent_threads_per_session"] <= 4
manifest = json.loads((ROOT / ".codex/agency-manifest.json").read_text(encoding="utf-8"))
assert manifest["count"] == 267
assert manifest["commit"] == "652b2692f8d8ec2b1f1a38e559073e287dfdc469"
assert len(manifest["agents"]) == 267
files = sorted((ROOT / ".codex/agents").glob("agency_*.toml"))
assert len(files) == 267, f"Expected 267 profiles, found {len(files)}"
names = set()
originals = set()
for path in files:
    d = tomllib.loads(path.read_text(encoding="utf-8"))
    assert d["name"] == path.stem and d["name"] not in names, path
    assert not re.search(r"-{5}BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-{5}", path.read_text(encoding="utf-8")), path
    assert d["description"] and d["developer_instructions"], path
    assert "# COO-Proclair guardrails" in d["developer_instructions"], path
    assert "# Original Agency role" in d["developer_instructions"], path
    assert "652b2692f8d8ec2b1f1a38e559073e287dfdc469" in path.read_text(encoding="utf-8").splitlines()[0], path
    names.add(d["name"])
for entry in manifest["agents"]:
    assert entry["name"] in names and entry["name"] not in originals, entry
    assert len(entry["sha256"]) == 64, entry
    originals.add(entry["name"])
assert originals == names
skill = (ROOT / ".agents/skills/proclair-agency/SKILL.md").read_text(encoding="utf-8")
assert skill.startswith("---\nname: proclair-agency\n")
assert "agency-manifest.json" in skill and "4 agents" in skill
print("PASS: 267 Agency roles, Proclair skill and sanitized security profiles.")
