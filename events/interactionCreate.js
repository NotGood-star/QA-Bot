module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Error executing command.', ephemeral: true }).catch(() => {});
            }
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'request_test_menu') {
                const testCommand = client.commands.get('test') || require('../commands/test');
                if (testCommand.handleSelectMenu) {
                    await testCommand.handleSelectMenu(interaction, client);
                }
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'test_create_modal') {
                const testCommand = client.commands.get('test') || require('../commands/test');
                if (testCommand.handleModal) {
                    await testCommand.handleModal(interaction, client);
                }
            }
        }
    },
};
