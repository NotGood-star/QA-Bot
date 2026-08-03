const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../../data/config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("qa")
        .setDescription("QA System Commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription("Setup the QA system")
                .addChannelOption(option =>
                    option
                        .setName("upcoming_channel")
                        .setDescription("Upcoming Tests Channel")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("testing_channel")
                        .setDescription("Live Testing Channel")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),

    async execute(interaction) {

        const upcoming =
            interaction.options.getChannel("upcoming_channel");

        const testing =
            interaction.options.getChannel("testing_channel");

        let config = { guilds: {} };

        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        }

        config.guilds[interaction.guild.id] = {
            upcomingChannel: upcoming.id,
            testingChannel: testing.id
        };

        fs.writeFileSync(
            configPath,
            JSON.stringify(config, null, 4)
        );

        await interaction.reply({
            embeds: [
                {
                    color: 0x2ECC71,
                    title: "✅ QA Setup Complete",
                    fields: [
                        {
                            name: "📢 Upcoming Tests",
                            value: `<#${upcoming.id}>`
                        },
                        {
                            name: "🧪 Testing Channel",
                            value: `<#${testing.id}>`
                        }
                    ],
                    footer: {
                        text: "QA Bot"
                    },
                    timestamp: new Date()
                }
            ]
        });

    }
};
