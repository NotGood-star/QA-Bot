const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Channel IDs mapping as requested
const CHANNELS = {
    REQUEST_CHANNEL: '1533505277146562783',
    UPCOMING_CHANNEL: '1533505439885693060',
    TESTING_CHANNEL: '1533505078064058550'
};

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
    // Handles Dropdown Selection from Panel
    async handleSelectMenu(interaction, client) {
        if (interaction.customId !== 'request_test_menu') return;

        if (interaction.values[0] === 'scheduled_test') {
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
                .setPlaceholder('https://www.roblox.com/games/...')
                .setRequired(true);

            const requirementsInput = new TextInputBuilder()
                .setCustomId('requirements')
                .setLabel('Looking for')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Tell testers about what you want them to look for')
                .setRequired(true);

            const prizeInput = new TextInputBuilder()
                .setCustomId('prize')
                .setLabel('Prize in Robux (e.g. 100)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('100')
                .setRequired(true);

            const timingInput = new TextInputBuilder()
                .setCustomId('timing')
                .setLabel('Start In & Duration (e.g. 10m | 1h)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Start: 10m | Duration: 1h')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(gameNameInput),
                new ActionRowBuilder().addComponents(gameUrlInput),
                new ActionRowBuilder().addComponents(requirementsInput),
                new ActionRowBuilder().addComponents(prizeInput),
                new ActionRowBuilder().addComponents(timingInput)
            );

            await interaction.showModal(modal);
        }
    },

    // Handles Modal Form Submission and Automation Routing
    async handleModal(interaction, client) {
        if (interaction.customId !== 'test_create_modal') return;

        const gameName = interaction.fields.getTextInputValue('game_name');
        const gameUrl = interaction.fields.getTextInputValue('game_url');
        const requirements = interaction.fields.getTextInputValue('requirements');
        const prize = parseInt(interaction.fields.getTextInputValue('prize')) || 0;
        const timingRaw = interaction.fields.getTextInputValue('timing');

        // Simple parse logic for timing string (splits by pipe or space, e.g. "10m 1h")
        const parts = timingRaw.split('|').map(p => p.trim());
        const startInStr = parts[0] || '10m';
        const durationStr = parts[1] || '1h';

        const startMs = parseDuration(startInStr);
        const durationMs = parseDuration(durationStr);

        const startTimeTimestamp = Math.floor((Date.now() + startMs) / 1000);
        const endTimeTimestamp = Math.floor((Date.now() + startMs + durationMs) / 1000);

        const upcomingChannel = interaction.guild.channels.cache.get(CHANNELS.UPCOMING_CHANNEL);
        const testingChannel = interaction.guild.channels.cache.get(CHANNELS.TESTING_CHANNEL);

        if (!upcomingChannel || !testingChannel) {
            return await interaction.reply({ 
                content: `❌ Could not find target channels! Ensure IDs are correct.`, 
                ephemeral: true 
            });
        }

        // 1. Post to Upcoming Test Channel (`1533505439885693060`)
        const upcomingEmbed = new EmbedBuilder()
            .setTitle(`🟡 UPCOMING TEST • ${gameName}`)
            .setColor(0xF1C40F)
            .addFields(
                { name: '🎮 Game URL', value: gameUrl, inline: false },
                { name: '💰 Prize', value: `${prize} Robux`, inline: true },
                { name: '📋 Looking For', value: requirements, inline: false },
                { name: '⏰ Starts In', value: `<t:${startTimeTimestamp}:R> (<t:${startTimeTimestamp}:f>)`, inline: false },
                { name: 'Hosted by', value: `${interaction.user}`, inline: false }
            )
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('view_details').setLabel('📋 View Details').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );

        const upcomingMsg = await upcomingChannel.send({ embeds: [upcomingEmbed], components: [row] });
        await interaction.reply({ content: `✅ Test form submitted! Sent to upcoming tests channel.`, ephemeral: true });

        // 2. Automated Timer to move test to Active Testing Channel (`1533505078064058550`)
        setTimeout(async () => {
            try {
                await upcomingMsg.delete().catch(() => {});

                const liveEmbed = new EmbedBuilder()
                    .setTitle(`🟢 LIVE TEST • ${gameName}`)
                    .setColor(0x2ECC71)
                    .addFields(
                        { name: '🎮 Game URL', value: gameUrl, inline: false },
                        { name: '💰 Prize', value: `${prize} Robux`, inline: true },
                        { name: '📋 Focus', value: requirements, inline: false },
                        { name: '⏰ Ends At', value: `<t:${endTimeTimestamp}:t> (<t:${endTimeTimestamp}:R>)`, inline: false },
                        { name: 'Hosted by', value: `${interaction.user}`, inline: false }
                    )
                    .setTimestamp();

                const liveRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('join_test').setLabel('✅ Join Test').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('report_bug').setLabel('🐞 Report Bug').setStyle(ButtonStyle.Secondary)
                );

                const liveMsg = await testingChannel.send({ embeds: [liveEmbed], components: [liveRow] });

                const thread = await liveMsg.startThread({
                    name: `🎮 Test • ${gameName}`,
                    autoArchiveDuration: 60,
                    reason: 'Playtest live discussion thread'
                });

                await thread.send({
                    content: `Welcome to the live test for **${gameName}** hosted by ${interaction.user}!\nJoin the game here: ${gameUrl}`
                });

                // 3. Automated End Timer
                setTimeout(async () => {
                    try {
                        const endedEmbed = new EmbedBuilder()
                            .setTitle(`🔴 TEST ENDED • ${gameName}`)
                            .setColor(0x7F8C8D)
                            .addFields(
                                { name: 'Developer', value: `${interaction.user}`, inline: true },
                                { name: 'Status', value: 'Completed', inline: true }
                            )
                            .setTimestamp();

                        await liveMsg.edit({ embeds: [endedEmbed], components: [] });
                        await thread.setLocked(true, 'Test concluded.');
                    } catch (err) {
                        console.error('Error ending test:', err);
                    }
                }, durationMs);

            } catch (err) {
                console.error('Error transitioning test to live:', err);
            }
        }, startMs);
    }
};
