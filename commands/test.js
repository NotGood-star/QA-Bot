const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Helper to parse time offsets like "2d 5m 3s" or "30m"
function parseDuration(str) {
    let totalMs = 0;
    const days = str.match(/(\d+)\s*d/);
    const hours = str.match(/(\d+)\s*h/);
    const minutes = str.match(/(\d+)\s*m/);
    const seconds = str.match(/(\d+)\s*s/);

    if (days) totalMs += parseInt(days[1]) * 24 * 60 * 60 * 1000;
    if (hours) totalMs += parseInt(hours[1]) * 60 * 60 * 1000;
    if (minutes) totalMs += parseInt(minutes[1]) * 60 * 1000;
    if (seconds) totalMs += parseInt(seconds[1]) * 1000;

    return totalMs;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Manage QA playtests')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Open the QA Central test request form')
                .addIntegerOption(option => option.setName('prize').setDescription('Robux prize amount').setRequired(true))
                .addIntegerOption(option => option.setName('max_testers').setDescription('Max testers allowed').setRequired(true))
                .addStringOption(option => option.setName('start_in').setDescription('Start countdown (e.g. 30m, 1h, 1d)').setRequired(true))
                .addStringOption(option => option.setName('duration').setDescription('Test duration length (e.g. 45m, 1h)').setRequired(true))
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            const settings = client.guildSettings.get(interaction.guildId);
            if (!settings || !settings.upcomingChannelId || !settings.testingChannelId) {
                return await interaction.reply({ 
                    content: '❌ Please configure your channels first using `/qa setup`!', 
                    ephemeral: true 
                });
            }

            const prize = interaction.options.getInteger('prize');
            const maxTesters = interaction.options.getInteger('max_testers');
            const startInStr = interaction.options.getString('start_in');
            const durationStr = interaction.options.getString('duration');

            client.pendingTests.set(interaction.user.id, { prize, maxTesters, startInStr, durationStr });

            // Display QA Central style modal form
            const modal = new ModalBuilder()
                .setCustomId('test_create_modal')
                .setTitle('Test info');

            const gameNameInput = new TextInputBuilder()
                .setCustomId('game_name')
                .setLabel('Game name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('QA Central')
                .setRequired(true);

            const gameUrlInput = new TextInputBuilder()
                .setCustomId('game_url')
                .setLabel('Game URL')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://www.roblox.com/games/1818/Classic-Crossroads')
                .setRequired(true);

            const requirementsInput = new TextInputBuilder()
                .setCustomId('requirements')
                .setLabel('Looking for')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Tell testers about what you want them to look for')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(gameNameInput),
                new ActionRowBuilder().addComponents(gameUrlInput),
                new ActionRowBuilder().addComponents(requirementsInput)
            );

            await interaction.showModal(modal);
        }
    },

    async handleModal(interaction, client) {
        if (interaction.customId !== 'test_create_modal') return;

        const gameName = interaction.fields.getTextInputValue('game_name');
        const gameUrl = interaction.fields.getTextInputValue('game_url');
        const requirements = interaction.fields.getTextInputValue('requirements');

        const pending = client.pendingTests.get(interaction.user.id);
        if (!pending) {
            return await interaction.reply({ content: '❌ Session expired. Please run `/test create` again.', ephemeral: true });
        }

        const settings = client.guildSettings.get(interaction.guildId);
        const upcomingChannel = interaction.guild.channels.cache.get(settings.upcomingChannelId);
        const testingChannel = interaction.guild.channels.cache.get(settings.testingChannelId);

        const startMs = parseDuration(pending.startInStr);
        const durationMs = parseDuration(pending.durationStr);

        const startTimeTimestamp = Math.floor((Date.now() + startMs) / 1000);
        const endTimeTimestamp = Math.floor((Date.now() + startMs + durationMs) / 1000);

        // 1. Post Upcoming Test Embed
        const upcomingEmbed = new EmbedBuilder()
            .setTitle(`🟡 UPCOMING TEST • ${gameName}`)
            .setColor(0xF1C40F)
            .addFields(
                { name: '🎮 Game URL', value: gameUrl, inline: false },
                { name: '💰 Prize', value: `${pending.prize} Robux`, inline: true },
                { name: '👥 Testers', value: `0/${pending.maxTesters}`, inline: true },
                { name: '📋 Looking For', value: requirements, inline: false },
                { name: '⏰ Starts In', value: `<t:${startTimeTimestamp}:R> (<t:${startTimeTimestamp}:f>)`, inline: false },
                { name: 'Hosted by', value: `${interaction.user}`, inline: false }
            )
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('view_details').setLabel('📋 View Details').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );

        const upcomingMsg = await upcomingChannel.send({ embeds: [upcomingEmbed], components: [row] });
        await interaction.reply({ content: `✅ Test request successfully submitted for **${gameName}**!`, ephemeral: true });

        // 2. Automated Start Scheduler
        setTimeout(async () => {
            try {
                await upcomingMsg.delete().catch(() => {});

                const liveEmbed = new EmbedBuilder()
                    .setTitle(`🟢 LIVE TEST • ${gameName}`)
                    .setColor(0x2ECC71)
                    .addFields(
                        { name: '🎮 Game URL', value: gameUrl, inline: false },
                        { name: '💰 Prize', value: `${pending.prize} Robux`, inline: true },
                        { name: '👥 Joined', value: `0/${pending.maxTesters}`, inline: true },
                        { name: '📋 Focus', value: requirements, inline: false },
                        { name: '⏰ Ends At', value: `<t:${endTimeTimestamp}:t> (<t:${endTimeTimestamp}:R>)`, inline: false },
                        { name: 'Hosted by', value: `${interaction.user}`, inline: false }
                    )
                    .setTimestamp();

                const liveRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('join_test').setLabel('✅ Join Test').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('leave_test').setLabel('❌ Leave Test').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('report_bug').setLabel('🐞 Report Bug').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('feedback').setLabel('💬 Feedback').setStyle(ButtonStyle.Secondary)
                );

                const liveMsg = await testingChannel.send({ embeds: [liveEmbed], components: [liveRow] });

                const thread = await liveMsg.startThread({
                    name: `🎮 Test • ${gameName}`,
                    autoArchiveDuration: 60,
                    reason: 'Playtest live discussion thread'
                });

                await thread.send({
                    content: `Welcome to the playtest for **${gameName}**, hosted by ${interaction.user}!\n\nPlease:\n✅ Join the game: ${gameUrl}\n✅ Test all features thoroughly.\n✅ Report bugs using the button above.\n✅ Provide clean feedback.\n\nGood luck!`
                });

                // 3. Automated End Scheduler
                setTimeout(async () => {
                    try {
                        const endedEmbed = new EmbedBuilder()
                            .setTitle(`🔴 TEST ENDED • ${gameName}`)
                            .setColor(0x7F8C8D)
                            .addFields(
                                { name: 'Developer', value: `${interaction.user}`, inline: true },
                                { name: 'Prize Pool', value: `${pending.prize} Robux`, inline: true },
                                { name: 'Status', value: 'Completed', inline: true }
                            )
                            .setTimestamp();

                        const disabledRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('join_test').setLabel('✅ Join Test').setStyle(ButtonStyle.Success).setDisabled(true),
                            new ButtonBuilder().setCustomId('leave_test').setLabel('❌ Leave Test').setStyle(ButtonStyle.Danger).setDisabled(true),
                            new ButtonBuilder().setCustomId('report_bug').setLabel('🐞 Report Bug').setStyle(ButtonStyle.Secondary).setDisabled(true),
                            new ButtonBuilder().setCustomId('feedback').setLabel('💬 Feedback').setStyle(ButtonStyle.Secondary).setDisabled(true)
                        );

                        await liveMsg.edit({ embeds: [endedEmbed], components: [disabledRow] });
                        await thread.setLocked(true, 'Playtest ended.');
                    } catch (err) {
                        console.error('Error ending test automatically:', err);
                    }
                }, durationMs);

            } catch (err) {
                console.error('Error starting test automatically:', err);
            }
        }, startMs);
    }
};
