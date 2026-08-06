const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot send a message or embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The text message for the bot to send (Optional if using embed)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('embed_title')
                .setDescription('The title for an embedded message (Optional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('embed_description')
                .setDescription('The description text for an embedded message (Optional)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the message in (Defaults to current channel)')
                .setRequired(false)),

    async execute(interaction) {
        const textMessage = interaction.options.getString('message');
        const embedTitle = interaction.options.getString('embed_title');
        const embedDescription = interaction.options.getString('embed_description');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        if (!textMessage && !embedTitle && !embedDescription) {
            return await interaction.reply({
                content: '❌ You must provide either a text message, an embed title, or an embed description!',
                ephemeral: true
            });
        }

        let embed = null;
        if (embedTitle || embedDescription) {
            embed = new EmbedBuilder()
                .setColor(0x2B2D31)
                .setTimestamp();

            if (embedTitle) embed.setTitle(embedTitle);
            if (embedDescription) embed.setDescription(embedDescription);
        }

        try {
            await targetChannel.send({
                content: textMessage || undefined,
                embeds: embed ? [embed] : []
            });

            await interaction.reply({
                content: `✅ Message sent successfully to ${targetChannel}!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error executing /say command:', error);
            await interaction.reply({
                content: '❌ Failed to send message. Make sure I have permission to send messages in that channel!',
                ephemeral: true
            });
        }
    }
};
