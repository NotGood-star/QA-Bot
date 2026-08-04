const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

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

    return totalMs > 0 ? totalMs : 60000;
}

module.exports = {
    async handleSelectMenu(interaction, client) {
        if (interaction.values[0] === 'scheduled_test') {
            const modal = new ModalBuilder()
                .setCustomId('test_create_modal')
                .setTitle('Test info');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('game_name').setLabel('Game name').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('game_url').setLabel('Game URL').setStyle(TextInputStyle.Short).setPlaceholder('https://www.roblox.com/games/...').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('game_pfp').setLabel('Game PFP Image URL').setStyle(TextInputStyle.Short).setPlaceholder('https://... (Image link)').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('max_testers').setLabel('Max Testers (e.g. 10)').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prize').setLabel('Prize in Robux (e.g. 100)').setStyle(TextInputStyle.Short).setRequired(true))
            );

            await interaction.showModal(modal);
        }
    },

    async handleModal(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const gameName = interaction.fields.getTextInputValue('game_name');
        const gameUrl = interaction.fields.getTextInputValue('game_url');
        const gamePfp = interaction.fields.getTextInputValue('game_pfp');
        const maxTesters = interaction.fields.getTextInputValue('max_testers');
        const prize = interaction.fields.getTextInputValue('prize');

        const startMs = parseDuration('10m'); 
        const durationMs = parseDuration('1h');

        const startTimeTimestamp = Math.floor((Date.now() + startMs) / 1000);
        const endTimeTimestamp = Math.floor((Date.now() + startMs + durationMs) / 1000);

        const upcomingChannel = interaction.guild.channels.cache.get(client.CHANNELS.UPCOMING_CHANNEL);
        const testingChannel = interaction.guild.channels.cache.get(client.CHANNELS.TESTING_CHANNEL);

        if (!upcomingChannel || !testingChannel) {
            return await interaction.editReply({ content: '❌ Target channels could not be found by their IDs!' });
        }

        const upcomingEmbed = new EmbedBuilder()
            .setTitle(`🟡 UPCOMING TEST • ${gameName}`)
            .setDescription(`### ${prize} ${client.ROBUX_EMOJI} Prize Pool`)
            .setColor(0xF1C40F)
            .setThumbnail(gamePfp)
            .addFields(
                { name: '🎮 Game Name', value: gameName, inline: false },
                { name: '🔗 Game Link', value: gameUrl, inline: false },
                { name: '👥 Max Testers', value: maxTesters, inline: true },
                { name: '⏰ Starts In', value: `<t:${startTimeTimestamp}:R>`, inline: true },
                { name: '👤 Hosted By', value: `${interaction.user}`, inline: false }
            );

        const upcomingMsg = await upcomingChannel.send({ embeds: [upcomingEmbed] });
        await interaction.editReply({ content: `✅ Success! Test submitted to upcoming channel.` });

        setTimeout(async () => {
            try {
                await upcomingMsg.delete().catch(() => {});

                const liveEmbed = new EmbedBuilder()
                    .setTitle(`🟢 LIVE TEST • ${gameName}`)
                    .setDescription(`### ${prize} ${client.ROBUX_EMOJI} Prize Pool`)
                    .setColor(0x2ECC71)
                    .setThumbnail(gamePfp)
                    .addFields(
                        { name: '🎮 Game Name', value: gameName, inline: false },
                        { name: '🔗 Game Link', value: gameUrl, inline: false },
                        { name: '👥 Joined Testers', value: `0/${maxTesters}`, inline: true },
                        { name: '⏰ Ends At', value: `<t:${endTimeTimestamp}:R>`, inline: true },
                        { name: '👤 Hosted By', value: `${interaction.user}`, inline: false }
                    );

                const liveMsg = await testingChannel.send({ embeds: [liveEmbed] });
                const thread = await liveMsg.startThread({ name: `🎮 Test • ${gameName}`, autoArchiveDuration: 60 });
                await thread.send(`Welcome to the live test thread for **${gameName}** hosted by ${interaction.user}!\nPlay here: ${gameUrl}`);

                setTimeout(async () => {
                    try {
                        const endedEmbed = new EmbedBuilder()
                            .setTitle(`🔴 TEST ENDED • ${gameName}`)
                            .setColor(0x7F8C8D)
                            .setThumbnail(gamePfp)
                            .addFields({ name: 'Status', value: 'Completed', inline: true });

                        await liveMsg.edit({ embeds: [endedEmbed], components: [] });
                        await thread.setLocked(true, 'Test concluded.');
                    } catch (e) {
                        console.error('End timer error:', e);
                    }
                }, durationMs);

            } catch (e) {
                console.error('Start timer error:', e);
            }
        }, startMs);
    }
};
