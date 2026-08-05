const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

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

        const upcomingChannel = interaction.guild.channels.cache.get(client.CHANNELS.UPCOMING_CHANNEL);

        if (!upcomingChannel) {
            return await interaction.editReply({ content: '❌ Target upcoming channel could not be found by its ID!' });
        }

        const upcomingEmbed = new EmbedBuilder()
            .setTitle(`🟡 UPCOMING TEST • ${gameName}`)
            .setDescription(`### Prize: ${prize} ${client.ROBUX_EMOJI}`)
            .setColor(0xFEE75C)
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

        const thread = await upcomingMsg.startThread({ 
            name: `🧪・${gameName}`, 
            autoArchiveDuration: 60 
        });
        
        await thread.send(`${client.POLL_YES_EMOJI} Test thread created for **${gameName}**! Hosted by ${interaction.user}.\nGame Link: ${gameUrl}`);

        await interaction.editReply({ content: `✅ Success! Test submitted to the upcoming channel.` });
    }
};
