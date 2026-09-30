const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('evidence')
        .setDescription('Collect evidence for a ban')
        .addStringOption(option =>
            option
                .setName('identifier')
                .setDescription('Player name, BE GUID, Reforger ID, IP address, or Steam ID')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for the ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('evidence')
                .setDescription('Optional link to screenshots, video, or other evidence')
                .setRequired(false)
        )
};
