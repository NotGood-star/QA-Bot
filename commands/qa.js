const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

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

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const upcomingChannel = interaction.options.getChannel('upcoming_channel');
            const testingChannel = interaction.options.getChannel('testing_channel');

            // Save settings to client memory
            client.guildSettings.set(interaction.guildId, {
                upcomingChannelId: upcomingChannel.id,
                testingChannelId: testingChannel.id
            });

            const embed = new EmbedBuilder()
                .setTitle('⚙️ QA Bot Setup Complete')
                .setDescription('The channels have been successfully configured for your QA community.')
                .setColor(0x2ECC71)
                .addFields(
                    { name: 'Upcoming Tests Channel', value: `${upcomingChannel}`, inline: true },
                    { name: 'Testing Channel', value: `${testingChannel}`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
