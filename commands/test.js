const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const CHANNELS = {
    REQUEST_CHANNEL: '1533505277146562783',
    UPCOMING_CHANNEL: '1533505439885693060',
    TESTING_CHANNEL: '1533505078064058550'
};

const ROBUX_EMOJI = '<:robux:1477933883617181857>';
const POLL_YES_EMOJI = '<:PollYes:776384252261433344>';

// Helper to parse timing strings like 10m, 1h, 1d
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

    return totalMs > 0 ? totalMs : 60000; // Default to 1m if empty/invalid
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
                    new TextInputBuilder().setCustomId('timing').setLabel('Start In & Duration (e.g. 10m | 1h)').setStyle(TextInputStyle.Short).setPlaceholder('10m | 1h').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('max_testers').setLabel('Max Testers').setStyle(TextInputStyle.Short).setPlaceholder('10').setRequired(true)
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
        const timingRaw = interaction.fields.getTextInputValue('timing');
        const maxTesters = interaction.fields.getTextInputValue('max_testers');
        const prize = interaction.fields.getTextInputValue('prize');

        // Parse timing strings (e.g., "10m | 1h" or "30m 2h")
        const parts = timingRaw.split('|').map(p => p.trim());
        const startInStr = parts[0] || '10m';
        const durationStr = parts[1] || '1h';

        const startMs = parseDuration(startInStr);
        const durationMs = parseDuration(durationStr);

        const startTimeTimestamp = Math.floor((Date.now() + startMs) / 1000);
        const endTimeTimestamp = Math.floor((Date.now() + startMs + durationMs) / 1000);

        const fetchedPfp = await getRobloxThumbnail(gameUrl);
        const gamePfp = fetchedPfp || interaction.guild.iconURL() || 'https://i.imgur.com/AfFp7pu.png';

        const testingChannel = interaction.guild.channels.cache.get(CHANNELS.TESTING_CHANNEL);

        if (!testingChannel) {
            return await interaction.editReply({ content: `❌ Could not find Active Testing Channel! Ensure ID is correct.` });
        }

        // Build Live Test Embed with Dynamic Discord Timestamps
        const liveEmbed = new EmbedBuilder()
            .setTitle(`🟢 LIVE TEST • ${gameName}`)
            .setDescription(`### Prize: ${prize} ${ROBUX_EMOJI}`)
            .setColor(0x2ECC71)
            .setThumbnail(gamePfp)
            .addFields(
                { name: '🎮 Game Name', value: `\`${gameName}\``, inline: true },
                { name: '👥 Max Testers', value: `\`${maxTesters}\``, inline: true },
                { name: '🔗 Game Link', value: `[Click Here to Play](${gameUrl})`, inline: false },
                { name: '⏰ Starts At', value: `<t:${startTimeTimestamp}:t> (<t:${startTimeTimestamp}:R>)`, inline: true },
                { name: '⏰ Ends At', value: `<t:${endTimeTimestamp}:t> (<t:${endTimeTimestamp}:R>)`, inline: true },
                { name: '👤 Hosted By', value: `${interaction.user}`, inline: false }
            )
            .setFooter({ text: 'QA Central Testing System', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        const liveRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('join_test').setLabel('✅ Join Test').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('report_bug').setLabel('🐞 Report Bug').setStyle(ButtonStyle.Secondary)
        );

        const liveMsg = await testingChannel.send({ embeds: [liveEmbed], components: [liveRow] });

        const thread = await liveMsg.startThread({
            name: `🧪・${gameName}`,
            autoArchiveDuration: 60,
            reason: 'Playtest live discussion thread'
        });

        await thread.send({
            content: `${POLL_YES_EMOJI} Test thread created for **${gameName}**! Hosted by ${interaction.user}.\nPlay here: ${gameUrl}`
        });

        await interaction.editReply({ content: `✅ Test submitted successfully with start/end tracking active!` });
    }
};
