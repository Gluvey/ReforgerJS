const { EmbedBuilder } = require('discord.js');
const { classifyUserQueryInfo } = require('../../helpers');
const logger = require('../logger/logger');

module.exports = async (interaction, serverInstance, discordClient, extraData = {}) => {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        const user = interaction.user;
        const identifier = extraData.identifier.trim();
        const reason = extraData.reason;
        const evidenceUrl = extraData.evidence;
        const commandConfig = serverInstance.config.commands.find(command => command.command === 'evidence');
        const destinationChannel = commandConfig?.destinationChannel || 'your evidence channel';

        logger.info(
            `[Evidence Command] User: ${user.username} (ID: ${user.id}) used /evidence with identifier: ${identifier}, reason: ${reason || 'N/A'}, evidence URL: ${evidenceUrl || 'N/A'}`
        );

        if (!serverInstance.config.connectors?.mysql?.enabled) {
            await interaction.editReply('MySQL is not enabled in the configuration. This command cannot be used.');
            return;
        }

        const pool = process.mysqlPool || serverInstance.mysqlPool;
        if (!pool) {
            await interaction.editReply('Database connection is not initialized.');
            return;
        }

        if (identifier.length < 3) {
            await interaction.editReply(`Identifier ${identifier} is too short. Please provide at least 3 characters.`);
            return;
        }

        if (!reason || reason.length < 3) {
            await interaction.editReply('Reason is too short. Please provide at least 3 characters.');
            return;
        }

        const dbField = classifyUserQueryInfo(identifier);
        const validDBFields = ['playerName', 'playerIP', 'playerUID', 'beGUID', 'steamID'];

        logger.verbose(`[Evidence Command] Classified identifier: ${identifier} as field: ${dbField}`);

        if (!validDBFields.includes(dbField)) {
            await interaction.editReply(`Invalid identifier provided: ${identifier}. It must be one of: ${validDBFields.join(', ')}`);
            return;
        }

        const query = dbField === 'playerName'
            ? `SELECT playerName, playerIP, playerUID, beGUID, steamID, device, lastSeen FROM players WHERE ${dbField} LIKE ?`
            : `SELECT playerName, playerIP, playerUID, beGUID, steamID, device, lastSeen FROM players WHERE ${dbField} = ?`;
        const params = dbField === 'playerName' ? [`%${identifier}%`] : [identifier];

        let player;
        let connection;
        try {
            connection = await pool.getConnection();
            const [rows] = await pool.query(query, params);

            logger.verbose(`[Evidence Command] Database query returned ${rows.length} results for identifier: ${identifier}`);

            if (rows.length === 0) {
                logger.warn(`[Evidence Command] No information found for ${dbField}: ${identifier}`);
                await interaction.editReply(`No information can be found for ${dbField}: ${identifier}`);
                return;
            }

            if (rows.length > 1) {
                logger.warn(`[Evidence Command] Multiple players found for identifier: ${identifier}`);
                await interaction.editReply(`Found ${rows.length} players matching "${identifier}". You need to be more specific to get a single result.`);
                return;
            }

            [player] = rows;
        } catch (error) {
            logger.error(`[Evidence Command] Database query error: ${error.message}`);
            await interaction.editReply('An error occurred while querying the database. Please try again later.');
            return;
        } finally {
            connection?.release();
        }

        const battleMetricsSearchUrl = value =>
            `https://www.battlemetrics.com/rcon/players?filter%5Bsearch%5D=${encodeURIComponent(value)}&method=quick&redirect=1`;
        const battleMetricsClient = process.battleMetrics;
        let battleMetricsApiAvailable = Boolean(battleMetricsClient);

        if (!battleMetricsApiAvailable) {
            logger.warn('[Evidence Command] BattleMetrics API client is unavailable. Using search links.');
        }

        const battleMetricsUrl = async value => {
            if (!value) return null;

            if (battleMetricsApiAvailable) {
                try {
                    const url = await battleMetricsClient.fetchBMPlayerURL(value);
                    if (url) return url;
                } catch (error) {
                    battleMetricsApiAvailable = false;
                    logger.warn(`[Evidence Command] BattleMetrics lookup failed: ${error.message}. Using search links.`);
                }
            }

            return battleMetricsSearchUrl(value);
        };

        const reforgerBattleMetricsUrl = await battleMetricsUrl(player.playerUID);
        const steamBattleMetricsUrl = player.steamID ? await battleMetricsUrl(player.steamID) : null;
        let playerInfo = `Name: ${player.playerName || 'Missing Player Name'}`
            + `\nReforger ID: ${player.playerUID || 'Missing UUID'}`
            + `\nReforger ID BM URL: ${reforgerBattleMetricsUrl || 'Not Found'}`;

        if (player.device === 'PC') {
            playerInfo += `\nSteamID: ${player.steamID || 'Not Found'}`;
            if (steamBattleMetricsUrl) {
                playerInfo += `\nSteamID BM URL: ${steamBattleMetricsUrl}`;
            }
        }

        playerInfo += `\nReason: ${reason}`;
        if (evidenceUrl) {
            playerInfo += `\nEvidence URL: ${evidenceUrl}`;
        }

        const embed = new EmbedBuilder()
            .setTitle('Evidence report')
            .setDescription(`Paste the following into ${destinationChannel}\n`)
            .setColor('#00A5FF')
            .setFooter({ text: '[EXD] ReforgerJS', iconURL: discordClient.user.displayAvatarURL() })
            .setTimestamp()
            .addFields([{ name: '', value: `\`\`\`${playerInfo}\`\`\`` }]);

        logger.verbose(`[Evidence Command] Sending embed with player details for identifier: ${identifier}`);
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        logger.error(`[Evidence Command] Unexpected error: ${error.message}`);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'An unexpected error occurred while executing the command.',
                ephemeral: true
            });
        } else {
            await interaction.editReply('An unexpected error occurred while executing the command.');
        }
    }
};
