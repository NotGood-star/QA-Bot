const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const http = require('http');
require('dotenv').config();

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('QA Central Bot is running!\n');
});
server.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

client.commands = new Collection();
client.CHANNELS = {
    REQUEST_CHANNEL: '1533505277146562783',
    UPCOMING_CHANNEL: '1533505439885693060',
    TESTING_CHANNEL: '1533505078064058550'
};
client.ROBUX_EMOJI = '<:robux:1503781043386319067>';

// Load main test handler logic
const testHandler = require('./commands/test.js');

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const commands = [
        new SlashCommandBuilder()
            .setName('qa')
            .setDescription('Post the QA Test Request Panel')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(sub => sub.setName('panel').setDescription('Post the test request dropdown panel'))
    ].map(command => command.toJSON());

    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered slash commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'qa') {
                const sub = interaction.options.getSubcommand();
                if (sub === 'panel') {
                    const embed = new EmbedBuilder()
                        .setTitle('🧪 QA Central Test Request')
                        .setDescription('Select an option from the dropdown menu below to request a playtest for your game.')
                        .setColor(0x3498DB);

                    const row = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('request_test_menu')
                            .setPlaceholder('Click here to request a test...')
                            .addOptions([{
                                label: 'Scheduled Test',
                                description: 'Request a playtest with timing and prize setup',
                                value: 'scheduled_test',
                                emoji: '📅'
                            }])
                    );

                    await interaction.channel.send({ embeds: [embed], components: [row] });
                    await interaction.reply({ content: '✅ Panel posted successfully!', ephemeral: true });
                }
            }
        } 
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'request_test_menu') {
                await testHandler.handleSelectMenu(interaction, client);
            }
        } 
        else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'test_create_modal') {
                await testHandler.handleModal(interaction, client);
            }
        }
        else if (interaction.isButton()) {
            await interaction.reply({ content: 'This button is currently inactive or handled via threads.', ephemeral: true });
        }
    } catch (err) {
        console.error('Interaction error:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred processing this interaction.', ephemeral: true }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
