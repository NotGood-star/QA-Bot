const { SlashCommandBuilder, PermissionFlagsBits, Embeds } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qa')
        .setDescription('Configure QA Bot channels and settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the upcoming tests and live testing channels')
                .addChannelOption(option =>
                    option.setName('upcoming_channel')
                        .setDescription('Channel where upcoming tests are posted')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('testing_channel')
                        .setDescription('Channel where live tests are posted')
                        .setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const upcomingChannel = interaction.options.getChannel('upcoming_channel');
            const testingChannel = interaction.options.getChannel('testing_channel');

            // Save configuration logic goes here (e.g., database or JSON storage)

            const embed = {
                title: '⚙️ QA Bot Setup Complete',
                description: 'The channels have been successfully configured for your QA community.',
                color: 0x2ECC71,
                fields: [
                    { name: 'Upcoming Tests Channel', value: `${upcomingChannel}`, inline: true },
                    { name: 'Testing Channel', value: `${testingChannel}`, inline: true }
                ],
                timestamp: new Date().toISOString()
            };

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
