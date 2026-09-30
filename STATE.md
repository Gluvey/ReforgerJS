# ReforgerJS state

Updated: 30 September 2026

## Done

- `/evidence` keeps the original Discord player lookup and evidence report workflow.
- `/hqevidence` opens the private EXD HQ case workflow separately.
- The original evidence command still falls back to BattleMetrics search links when its API is unavailable.
- Only the first ReforgerJS instance registers and handles shared slash commands.

## Next

- Confirm both commands with one real staff interaction in Discord.

## Key facts

- All three instances use one Discord application and receive the same interactions.
- A slash command must only be enabled on one instance.
- The live checkout contains older operational changes outside Git. Preserve them during deployments.
