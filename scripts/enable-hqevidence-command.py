import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path


def update_config(path: Path) -> None:
    with path.open(encoding="utf-8") as handle:
        config = json.load(handle)

    commands = config.get("commands")
    if not isinstance(commands, list):
        raise RuntimeError(f"{path} has no commands list")

    evidence = next(
        (command for command in commands if command.get("command") == "evidence"),
        None,
    )
    if evidence is None:
        raise RuntimeError(f"{path} has no evidence command")

    hq_evidence = next(
        (command for command in commands if command.get("command") == "hqevidence"),
        None,
    )
    enabled = bool(evidence.get("enabled"))
    if hq_evidence is None:
        hq_evidence = {"command": "hqevidence", "enabled": enabled}
        commands.insert(commands.index(evidence) + 1, hq_evidence)
    else:
        hq_evidence["enabled"] = enabled

    if "commandLevel" in evidence:
        hq_evidence["commandLevel"] = evidence["commandLevel"]

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    backup = path.with_name(f"{path.name}.bak-hqevidence-{stamp}")
    shutil.copy2(path, backup)

    temporary = path.with_name(f".{path.name}.hqevidence.tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(config, handle, indent=2)
        handle.write("\n")
    temporary.replace(path)

    print(f"{path.name}: hqevidence enabled={enabled}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Provide at least one ReforgerJS config path")

    for config_path in sys.argv[1:]:
        update_config(Path(config_path).resolve())
