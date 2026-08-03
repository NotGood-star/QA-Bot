const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Manage QA playtests')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new playtest')
                .addStringOption(option =>
                    option.setName('game_link')
                        .setDescription('Roblox game link')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('prize')
                        .setDescription('Robux prize amount')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('requirements')
                        .setDescription('Tester requirements (e.g. 30+ day account)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('max_testers')
                        .setDescription('Maximum number of testers allowed')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('start_time')
                        .setDescription('Start time (e.g. Today 8:00 PM)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('end_time')
                        .setDescription('End time (e.g. Today 9:00 PM)')
                        .setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            const gameLink = interaction.options.getString('game_link');
            const prize = interaction.options.getInteger('prize');
            const requirements = interaction.options.getString('requirements');
            const maxTesters = interaction.options.getInteger('max_testers');
            const startTime = interaction.options.getString('start_time');
            const endTime = interaction.options.getString('end_time');

            // Build the Upcoming Test Embed
            const embed = new EmbedBuilder()
                .setTitle('🟡 UPCOMING TEST')
                .setColor(0xF1C40F)
                .addFields(
                    { name: '🎮 Game', value: gameLink, inline: false },
                    { name: '💰 Prize', value: `${prize} Robux`, inline: true },
                    { name: '👥 Testers', value: `0/${maxTesters}`, inline: true },
                    { name: '📋 Requirements', value: requirements, inline: false },
                    { name: '⏰ Starts', value: startTime, inline: true },
                    { name: '⏰ Ends', value: endTime, inline: true },
                    { name: 'Hosted by', value: `${interaction.user}`, inline: false }
                )
                .setTimestamp();

            await interaction.reply({
                content: 'Test successfully created and queued!',
                embeds: [embed],
                ephemeral: true
            });
        }
    }
};
