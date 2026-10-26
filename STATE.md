# ReforgerJS state

Updated: 26 October 2026

## Done

- `/evidence` keeps the original Discord player lookup and evidence report workflow.
- `/hqevidence` opens the private EXD HQ case workflow separately.
- The original evidence command still falls back to BattleMetrics search links when its API is unavailable.
- Only the first ReforgerJS instance registers and handles shared slash commands.
- The Discord token was refreshed across all three live instances.
- The unused privileged Message Content intent was removed.
- All three live Discord clients connect to the Exodus guild without restart loops.

## Next

- Confirm both commands with one real staff interaction in Discord.
- Investigate the separate BattleMetrics 403 responses.
- Investigate the separate server 3 RCON warning.

## Key facts

- All three instances use one Discord application and receive the same interactions.
- A slash command must only be enabled on one instance.
- The live checkout contains older operational changes outside Git. Preserve them during deployments.
