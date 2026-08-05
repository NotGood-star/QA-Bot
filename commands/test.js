const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

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

    return totalMs > 0 ? totalMs : 60000;
}

async function getRobloxThumbnail(url) {
    try {
        const match = url.match(/games\/(\d+)/) || url.match(/roblox\.com\/games\/(\d+)/);
        if (!match) return null;
        const placeId = match[1];

        const res = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
        const data = await res.json();
        if (!data.universeId) return null;

        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${data.universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`);
        const thumbData = await thumbRes.json();
        return thumbData.data?.[0]?.imageUrl || null;
    } catch (e) {
        return null;
    }
}

module.exports = {
    async handleSelectMenu(interaction, client) {
        if (interaction.customId !== 'request_test_menu') return;

        if (interaction.values[0] === 'scheduled_test') {
            await interaction.message.edit({ components: interaction.message.components }).catch(() => {});

            const modal = new ModalBuilder()
                .setCustomId('test_create_modal')
                .setTitle('QA Test Submission');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('game_name').setLabel('Game Name').setStyle(TextInputStyle.Short).setPlaceholder('QA Central').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('game_url').setLabel('Game URL').setStyle(TextInputStyle.Short).setPlaceholder('https://www.roblox.com/games/...').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('max_testers').setLabel('Max Testers').setStyle(TextInputStyle.Short).setPlaceholder('10').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('start_time').setLabel('Start Time Duration (e.g. 10m, 1h)').setStyle(TextInputStyle.Short).setPlaceholder('10m').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('end_time').setLabel('End Time Duration (e.g. 1h, 2h)').setStyle(TextInputStyle.Short).setPlaceholder('1h').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('prize').setLabel('Prize in Robux').setStyle(TextInputStyle.Short).setPlaceholder('100').setRequired(true)
                )
            );

            await interaction.showModal(modal);
        }
    },

    async handleModal(interaction, client) {
        if (interaction.customId !== 'test_create_modal') return;

        await interaction.deferReply({ ephemeral: true });

        const gameName = interaction.fields.getTextInputValue('game_name');
        const gameUrl = interaction.fields.getTextInputValue('game_url');
        const maxTesters = interaction.fields.getTextInputValue('max_testers');
        const startTimeStr = interaction.fields.getTextInputValue('start_time');
        const endTimeStr = interaction.fields.getTextInputValue('end_time');
        const prize = interaction.fields.getTextInputValue('prize');

        const startMs = parseDuration(startTimeStr);
        const durationMs = parseDuration(endTimeStr);

        const startTimeTimestamp = Math.floor((Date.now() + startMs) / 1000);
        const endTimeTimestamp = Math.floor((Date.now() + startMs + durationMs) / 1000);

        const fetchedPfp = await getRobloxThumbnail(gameUrl);
        const gamePfp = fetchedPfp || interaction.guild.iconURL() || 'https://i.imgur.com/AfFp7pu.png';

        const upcomingChannel = interaction.guild.channels.cache.get(CHANNELS.UPCOMING_CHANNEL);
        const testingChannel = interaction.guild.channels.cache.get(CHANNELS.TESTING_CHANNEL);

        if (!upcomingChannel || !testingChannel) {
            return await interaction.editReply({ content: `❌ Could not find Upcoming or Testing channels! Ensure IDs are correct.` });
        }

        // Upcoming Embed
        const upcomingEmbed = new EmbedBuilder()
            .setTitle(`🟡 UPCOMING TEST • ${gameName}`)
            .setDescription(`### Prize: ${prize} Robux`)
            .setColor(0xF1C40F)
            .setThumbnail(gamePfp)
            .addFields(
                { name: '🎮 Game Name', value: `\`${gameName}\``, inline: true },
                { name: '👥 Max Testers', value: `\`${maxTesters}\``, inline: true },
                { name: '💰 Prize', value: `${prize} Robux`, inline: false },
                { name: '⏰ Starts At', value: `<t:${startTimeTimestamp}:t> (<t:${startTimeTimestamp}:R>)`, inline: false },
                { name: '👤 Hosted By', value: `${interaction.user}`, inline: false }
            )
            .setFooter({ text: 'QA Central Testing System', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        const upcomingRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(gameUrl).setLabel('🎮 Play Game')
        );

        const upcomingMsg = await upcomingChannel.send({ embeds: [upcomingEmbed], components: [upcomingRow] });
        await interaction.editReply({ content: `✅ Test submitted successfully! Posted to Upcoming Tests channel.` });

        // Timer to move to Active Testing Channel
        setTimeout(async () => {
            try {
                await upcomingMsg.delete().catch(() => {});

                const liveEmbed = new EmbedBuilder()
                    .setTitle(`🟢 LIVE TEST • ${gameName}`)
                    .setDescription(`### Prize: ${prize} Robux`)
                    .setColor(0x2ECC71)
                    .setThumbnail(gamePfp)
                    .addFields(
                        { name: '🎮 Game Name', value: `\`${gameName}\``, inline: true },
                        { name: '👥 Max Testers', value: `\`${maxTesters}\``, inline: true },
                        { name: '💰 Prize', value: `${prize} Robux`, inline: false },
                        { name: '⏰ Ends At', value: `<t:${endTimeTimestamp}:t> (<t:${endTimeTimestamp}:R>)`, inline: false },
                        { name: '👤 Hosted By', value: `${interaction.user}`, inline: false }
                    )
                    .setFooter({ text: 'QA Central Testing System', iconURL: interaction.client.user.displayAvatarURL() })
                    .setTimestamp();

                const liveRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(gameUrl).setLabel('🎮 Play Game')
                );

                const liveMsg = await testingChannel.send({ embeds: [liveEmbed], components: [liveRow] });

                const thread = await liveMsg.startThread({
                    name: `🧪・${gameName}`,
                    autoArchiveDuration: 60,
                    reason: 'Playtest live discussion thread'
                });

                await thread.send({
                    content: `Test thread created for **${gameName}**! Hosted by ${interaction.user}.\nPlay here: ${gameUrl}`
                });

                // Timer to end test
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
