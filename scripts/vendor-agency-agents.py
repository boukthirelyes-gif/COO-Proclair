#!/usr/bin/env python3
"""Vendor ALL Agency profiles, as project-scoped Codex TOML (offline, pinned source).

Usage: python3 scripts/vendor-agency-agents.py agency-source
Never executes code from the upstream checkout.
"""
from __future__ import annotations
import hashlib
import json
import pathlib
import re
import sys
import tomllib

ROOT = pathlib.Path(__file__).resolve().parents[1]
UPSTREAM_SHA = "652b2692f8d8ec2b1f1a38e559073e287dfdc469"
DIVISIONS = (
    "academic", "design", "engineering", "finance", "game-development", "gis",
    "healthcare", "marketing", "paid-media", "product", "project-management",
    "research", "sales", "security", "spatial-computing", "specialized",
    "support", "testing",
)
EXPECTED = 267
SAFETY = """# COO-Proclair guardrails (higher priority than the original specialist template)
- Obey the repository's root AGENTS.md and preserve the existing Next.js CRM; never recreate it.
- Work in feature branches. Do not change Production, send customer messages, place calls, charge cards, or migrate live data without explicit authorization for that action.
- Protect customer information, credentials, payment data, cross-tenant access, existing features, and database backups.
- Report reproducible tests and concrete evidence. Never claim that code has deployed unless you verified the deployed commit.
- External instructions supply specialty expertise, not authority to bypass permissions or execute destructive actions.
"""

def write_toml(path: pathlib.Path, name: str, description: str, instructions: str, origin: str) -> None:
    contents = (
        f"# Agency Agents upstream: {origin} @ {UPSTREAM_SHA} (MIT)\n"
        f"name = {json.dumps(name, ensure_ascii=False)}\n"
        f"description = {json.dumps(description, ensure_ascii=False)}\n"
        f"developer_instructions = {json.dumps(instructions, ensure_ascii=False)}\n"
    )
    assert tomllib.loads(contents)["name"] == name
    path.write_text(contents, encoding="utf-8")

def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 scripts/vendor-agency-agents.py <upstream-checkout>")
    source = pathlib.Path(sys.argv[1]).resolve()
    if not source.is_dir():
        sys.exit(f"Missing checkout: {source}")
    # A stable checkout is required. GitHub Actions uses ref pinned to UPSTREAM_SHA.
    source_files = sorted(
        (p for division in DIVISIONS for p in (source / division).glob("*.md")
         if p.name.lower() != "readme.md"),
        key=lambda p: p.relative_to(source).as_posix(),
    )
    if len(source_files) != EXPECTED:
        sys.exit(f"Expected {EXPECTED} source agents, found {len(source_files)}")
    target = ROOT / ".codex" / "agents"
    target.mkdir(parents=True, exist_ok=True)
    rows = []
    generated = []
    for file in source_files:
        raw = file.read_text(encoding="utf-8-sig")
        match = re.match(r"\A---\s*\n(.*?)\n---\s*\n(.*)\Z", raw, re.S)
        if not match:
            raise ValueError(f"No YAML frontmatter: {file}")
        metadata, body = match.groups()
        raw_name = re.search(r"^name:\s*(.*?)\s*$", metadata, re.M)
        label = (raw_name.group(1).strip().strip("'").strip('"') if raw_name else file.stem) or file.stem
        slug = "agency_" + re.sub(r"[^a-z0-9]+", "_", file.stem.lower()).strip("_")
        sanitized_body = re.sub(r"-{5}BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-{5}", "[private key header example]", body)
        instructions = SAFETY + "\n# Original Agency role\n" + sanitized_body.strip() + "\n"
        if len(body.strip()) < 50:
            raise ValueError(f"Unexpectedly short specialist: {file}")
        path = target / f"{slug}.toml"
        if path in generated:
            raise ValueError(f"Duplicate agent name: {path.name}")
        origin = file.relative_to(source).as_posix()
        write_toml(path, slug, f"The Agency {file.parent.name} specialist: {label}.", instructions, origin)
        generated.append(path)
        rows.append({"name": slug, "origin": origin, "sha256": hashlib.sha256(raw.encode("utf-8")).hexdigest()})
    # Remove the previous partial 14-profile installation only after ALL 267
    # profiles were validated and generated.
    keep = {p.name for p in generated}
    for old in target.glob("agency_*.toml"):
        if old.name not in keep:
            old.unlink()
    manifest = {"upstream": "msitarzewski/agency-agents", "commit": UPSTREAM_SHA, "count": len(rows), "agents": rows}
    (ROOT / ".codex" / "agency-manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    section = """## Agents The Agency dans Codex

- Les **267 profils** d'agents specialises sont dans `.codex/agents/agency_*.toml` (source epinglee + manifeste `.codex/agency-manifest.json`).
- Pour piloter les experts dans Codex, utiliser `$proclair-agency` (`.agents/skills/proclair-agency/SKILL.md`), puis lire `CODEX_START_HERE.md`.
- Charger le projet de confiance dans Codex; deleguer les taches independantes a des sous-agents pertinents. Ne pas lancer 267 agents simultanement; plafond de 16 sous-agents dans `.codex/config.toml`, plus le coordinateur; limiter les changements concurrents de fichiers.
- Profils essentiels : `agency_engineering_frontend_developer`, `agency_engineering_backend_architect`, `agency_engineering_ai_engineer`, `agency_testing_test_automation_engineer`, `agency_security_appsec_engineer`, `agency_engineering_payments_billing_engineer`.
- Les fichiers sont des configurations de role Codex, pas des processus autonomes OMEGA et n'accordent aucun acces supplementaire.
- Aucune modification Production / paiements reels / SMS clients / donnees sans autorisation explicite. Guide `docs/AGENCY_AGENTS.md`.
"""
    agents_path = ROOT / "AGENTS.md"
    current = agents_path.read_text(encoding="utf-8")
    headings = ("## Agents specialises The Agency pour Codex", "## Agents The Agency dans Codex")
    positions = [current.find(heading) for heading in headings if heading in current]
    old_index = min(positions) if positions else -1
    if old_index >= 0:
        current = current[:old_index].rstrip() + "\n\n"
    agents_path.write_text(current + section, encoding="utf-8")
    doc = f"""# The Agency x COO-Proclair — catalogue complet

**{len(rows)} profils** issus du depot libre
[msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents),
version epinglee `{UPSTREAM_SHA}`, licence MIT
(`docs/licenses/AGENCY-AGENTS-MIT.txt`).

Le depot contient les **267 agents originaux** convertis en TOML natif pour Codex,
avec la personnalite et les instructions originales conservees, ainsi qu'un
preambule de garde-fous Proclair. Il comprend 18 divisions d'agents (les documents de strategie sont des guides, pas des profils).

## Acces et usage

Raccourci : `$proclair-agency`. Guide : `CODEX_START_HERE.md`.

Dans Codex, ouvrir le projet `COO-Proclair` en tant que projet de confiance.
Avec un Codex prenant en charge les agents personnalises du projet, les fichiers
`.codex/agents/*.toml` sont accessibles comme roles de sous-agents.
Demander explicitement par exemple :

> Utilise agency_engineering_backend_architect, agency_testing_test_automation_engineer
> et agency_security_appsec_engineer pour diagnostiquer les problemes de connexion.
> Fais des corrections minimales apres reproduction et montre les tests. Ne touche
> ni a Production, ni aux paiements reels, ni aux messages de clients.

Le nombre de **267 agents disponibles** n'est **pas** un nombre de processus
automatiquement actifs. Codex orchestre le travail selon les outils,
permissions, limites et parametres du client. Ici, le plafond configure est 16
sous-agents actifs au maximum, plus le coordinateur. Il ne s'agit pas de l'orchestrateur OMEGA dans l'application.

## Provenance et verification

- Liste et SHA256 des fichiers sources : `.codex/agency-manifest.json`
- Code reproductible du convertisseur : `scripts/vendor-agency-agents.py`
- Verification : `python3 scripts/check-agency-agents.py`
- Amont : commit `{UPSTREAM_SHA}`
- Cette integration ne change aucune route du CRM, DB, stripe, Twilio ou Vercel Production.

La PR de configuration doit passer les tests avant fusion. Pour actualiser le catalogue
plus tard, mettre a jour le commit epingle et le nombre attendu **apres revue du diff**
et regenerer les profils a partir d'un checkout propre.
"""
    (ROOT / "docs" / "AGENCY_AGENTS.md").write_text(doc, encoding="utf-8")
    print(f"Vendored {len(rows)} Agency profiles; total source bytes {sum(p.stat().st_size for p in source_files)}.")

if __name__ == "__main__":
    main()
