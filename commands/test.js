const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Manage QA playtests')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new playtest')
                .addStringOption(option => option.setName('game_link').setDescription('Roblox game link').setRequired(true))
                .addIntegerOption(option => option.setName('prize').setDescription('Robux prize amount').setRequired(true))
                .addStringOption(option => option.setName('requirements').setDescription('Tester requirements').setRequired(true))
                .addIntegerOption(option => option.setName('max_testers').setDescription('Max testers allowed').setRequired(true))
                .addStringOption(option => option.setName('start_time').setDescription('Start time description (e.g. 8:00 PM)').setRequired(true))
                .addStringOption(option => option.setName('end_time').setDescription('End time description (e.g. 9:00 PM)').setRequired(true))
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            const settings = client.guildSettings.get(interaction.guildId);
            if (!settings || !settings.upcomingChannelId) {
                return await interaction.reply({ 
                    content: '❌ Please configure your channels first using `/qa setup`!', 
                    ephemeral: true 
                });
            }

            const gameLink = interaction.options.getString('game_link');
            const prize = interaction.options.getInteger('prize');
            const requirements = interaction.options.getString('requirements');
            const maxTesters = interaction.options.getInteger('max_testers');
            const startTime = interaction.options.getString('start_time');
            const endTime = interaction.options.getString('end_time');

            const upcomingChannel = interaction.guild.channels.cache.get(settings.upcomingChannelId);
            if (!upcomingChannel) {
                return await interaction.reply({ content: '❌ Upcoming tests channel not found! Run `/qa setup` again.', ephemeral: true });
            }

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

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('view_details').setLabel('📋 View Details').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );

            // Post directly to Upcoming Tests Channel
            await upcomingChannel.send({ embeds: [embed], components: [row] });

            await interaction.reply({ content: `✅ Test successfully created and posted to ${upcomingChannel}!`, ephemeral: true });
        }
    }
};
