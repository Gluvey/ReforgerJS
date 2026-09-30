const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const logger = require('../logger/logger');

const HQ_BASE_URL = 'https://hq.exd.gg';

module.exports = async (interaction, serverInstance, discordClient, extraData = {}) => {
    void serverInstance;

    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        const rawCaseNumber = extraData.case_number;
        const caseNumber = rawCaseNumber === undefined || rawCaseNumber === null
            ? null
            : Number.parseInt(String(rawCaseNumber), 10);

        if (caseNumber !== null && (!Number.isSafeInteger(caseNumber) || caseNumber < 1)) {
            await interaction.editReply('That HQ case number is not valid.');
            return;
        }

        const targetUrl = caseNumber
            ? `${HQ_BASE_URL}/support/manage/${caseNumber}`
            : `${HQ_BASE_URL}/support/manage/create`;
        const actionLabel = caseNumber ? `Open case #${caseNumber}` : 'Create HQ case';
        const embed = new EmbedBuilder()
            .setTitle('Evidence in EXD HQ')
            .setDescription(
                caseNumber
                    ? `Open case #${caseNumber} to add or review its private evidence.`
                    : 'Create the case in HQ, then add clips, screenshots or files there. HQ keeps the member, staff history and evidence together.'
            )
            .setColor('#BB2026')
            .setFooter({
                text: '[EXD] ReforgerJS',
                iconURL: discordClient.user.displayAvatarURL(),
            })
            .setTimestamp();
        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(actionLabel)
                    .setStyle(ButtonStyle.Link)
                    .setURL(targetUrl)
            ),
        ];

        logger.info(
            `[HQ Evidence Command] User ${interaction.user.id} opened the HQ evidence workflow${caseNumber ? ` for case ${caseNumber}` : ''}.`
        );

        await interaction.editReply({ embeds: [embed], components });
    } catch (error) {
        logger.error(`[HQ Evidence Command] Unexpected error: ${error.message}`);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'The HQ evidence link could not be opened. Please try again.',
                ephemeral: true,
            });
        } else {
            await interaction.editReply('The HQ evidence link could not be opened. Please try again.');
        }
    }
};
