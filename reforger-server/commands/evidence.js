const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('evidence')
        .setDescription('Open the private evidence workflow in EXD HQ')
        .addIntegerOption(option =>
            option
                .setName('case_number')
                .setDescription('Open an existing HQ case number instead of creating one')
                .setMinValue(1)
                .setRequired(false)
        )
};
