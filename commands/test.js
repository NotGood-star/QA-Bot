const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Helper to extract Roblox Universe/Place ID from URL and fetch thumbnail automatically
async function getRobloxThumbnail(url) {
    try {
        const match = url.match(/games\/(\d+)/) || url.match(/roblox\.com\/games\/(\d+)/);
        if (!match) return null;
        const placeId = match[1];

        // Fetch universe ID from Roblox API using place ID
        const res = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
        const data = await res.json();
        if (!data.universeId) return null;

        // Fetch icon thumbnail
        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${data.universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`);
        const thumbData = await thumbRes.json();
        return thumbData.data?.[0]?.imageUrl || null;
    } catch (e) {
        return null;
    }
}

module.exports = {
    async handleSelectMenu(interaction, client) {
        if (interaction.values[0] === 'scheduled_test') {
            const modal = new ModalBuilder()
                .setCustomId('test_create_modal')
                .setTitle('QA Test Submission');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('game_name').setLabel('Game Name').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('game_url').setLabel('Game URL').setStyle(TextInputStyle.Short).setPlaceholder('https://www.roblox.com/games/...').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('requirements').setLabel('Requirements / Looking For').setStyle(TextInputStyle.Paragraph).setRequired(true)),
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
        const requirements = interaction.fields.getTextInputValue('requirements');
        const maxTesters = interaction.fields.getTextInputValue('max_testers');
        const prize = interaction.fields.getTextInputValue('prize');

        // Automatically fetch game thumbnail from Roblox URL if possible
        const fetchedPfp = await getRobloxThumbnail(gameUrl);
        const gamePfp = fetchedPfp || interaction.guild.iconURL() || 'https://i.imgur.com/AfFp7pu.png';

        const upcomingChannel = interaction.guild.channels.cache.get(client.CHANNELS.UPCOMING_CHANNEL);

        if (!upcomingChannel) {
            return await interaction.editReply({ content: '❌ Target upcoming channel could not be found by its ID!' });
        }

        // Clean, structured modern embed look
        const upcomingEmbed = new EmbedBuilder()
            .setTitle(`🟡 UPCOMING TEST • ${gameName}`)
            .setDescription(`### Prize: ${prize} ${client.ROBUX_EMOJI}`)
            .setColor(0xFEE75C)
            .setThumbnail(gamePfp)
            .addFields(
                { name: '🎮 Game Name', value: `\`${gameName}\``, inline: true },
                { name: '👥 Max Testers', value: `\`${maxTesters}\``, inline: true },
                { name: '🔗 Game Link', value: `[Click Here to View Game](${gameUrl})`, inline: false },
                { name: '📋 Requirements', value: requirements, inline: false },
                { name: '👤 Hosted By', value: `${interaction.user}`, inline: false }
            )
            .setFooter({ text: 'QA Central Testing System', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const upcomingMsg = await upcomingChannel.send({ embeds: [upcomingEmbed] });

        // Also automatically start a thread right away for the upcoming test if desired
        const thread = await upcomingMsg.startThread({ 
            name: `🧪・${gameName}`, 
            autoArchiveDuration: 60 
        });
        
        await thread.send(`${client.POLL_YES_EMOJI} Test thread created for **${gameName}**! Hosted by ${interaction.user}.\nGame Link: ${gameUrl}`);

        await interaction.editReply({ content: `✅ Success! Test submitted to the upcoming channel.` });
    }
};
