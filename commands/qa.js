const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qa')
        .setDescription('Post the QA Test Request Panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Post the interactive test request dropdown panel in this channel')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'panel') {
            const embed = new EmbedBuilder()
                .setTitle('🧪 QA Central Test Request')
                .setDescription('Select an option from the dropdown menu below to request a playtest for your game, just like the QA Central system!')
                .setColor(0x3498DB)
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('request_test_menu')
                    .setPlaceholder('Click here to request a test...')
                    .addOptions([
                        {
                            label: 'Scheduled Test (Paid/Voluntary)',
                            description: 'Request a playtest with custom time scheduling and prizes',
                            value: 'scheduled_test',
                            emoji: '📅'
                        }
                    ])
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ QA Request panel posted successfully!', ephemeral: true });
        }
    }
};
