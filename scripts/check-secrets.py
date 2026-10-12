"""Inspect all reachable Git history plus the working tree; never print secret values."""
import os,re,subprocess
from pathlib import Path

def git(*args):
    return subprocess.check_output(['git',*args])

def sensitive_path(name):
    path=Path(name)
    return (path.name=='.env' or (path.name.startswith('.env.') and path.name!='.env.example') or
            any(part in ('.local','.vercel','node_modules','.next') for part in path.parts) or
            path.suffix.lower() in ('.sqlite','.sqlite3','.db','.dump','.backup','.pem','.key'))

known=[]
variables=['PROCLAIR_ADMIN_PASSWORD','PROCLAIR_SESSION_SECRET','CRON_SECRET','ROTOR_ACCESS_TOKEN','ROTOR_REFRESH_TOKEN']
for key in variables:
    value=os.environ.get(key)
    if value and len(value)>=12: known.append(value.encode())
if Path('.env').exists():
    for line in Path('.env').read_text().splitlines():
        key,sep,value=line.partition('=')
        if sep and key.strip() in variables:
            value=value.strip().strip('"\'')
            if len(value)>=12: known.append(value.encode())
pattern=re.compile(rb'(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|gh[opusr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')
issues=set();count=0
for entry in git('rev-list','--objects','--all').decode().splitlines():
    parts=entry.split(' ',1)
    if len(parts)!=2:continue
    oid,name=parts
    if sensitive_path(name):issues.add('Historique : fichier privé '+name)
    if git('cat-file','-t',oid).strip()!=b'blob':continue
    body=git('cat-file','blob',oid);count+=1
    if pattern.search(body) or any(value in body for value in known):issues.add('Historique : secret potentiel dans '+name)
for name in git('ls-files','--cached','--others','--exclude-standard').decode().splitlines():
    path=Path(name)
    if not path.is_file():continue
    if sensitive_path(name):issues.add('Fichier privé exposé : '+name)
    body=path.read_bytes()
    if pattern.search(body) or any(value in body for value in known):issues.add('Secret potentiel : '+name)
if issues:
    for issue in sorted(issues):print(issue)
    raise SystemExit(1)
print(f'Contrôle terminé : {count} blobs Git vérifiés ; aucun fichier privé ni secret détecté.')
