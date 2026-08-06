const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage interactive role selection panels')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('select')
                .setDescription('Post an interactive role selection dropdown panel')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('The title of the role selection panel')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role1')
                        .setDescription('First role option')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role2')
                        .setDescription('Second role option')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role3')
                        .setDescription('Third role option (Optional)')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('role4')
                        .setDescription('Fourth role option (Optional)')
                        .setRequired(false))
        ),

    async execute(interaction) {
        const title = interaction.options.getString('title');
        const roles = [
            interaction.options.getRole('role1'),
            interaction.options.getRole('role2'),
            interaction.options.getRole('role3'),
            interaction.options.getRole('role4')
        ].filter(Boolean); // Remove empty/optional roles

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription('Select an option from the dropdown menu below to assign your role.')
            .setColor(0x2B2D31)
            .setTimestamp();

        const options = roles.map(role => ({
            label: role.name,
            value: `role_${role.id}`,
            description: `Click to get or switch to the @${role.name} role`
        }));

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('role_select_menu')
                .setPlaceholder('Choose your role...')
                .addOptions(options)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Role select panel posted successfully!', ephemeral: true });
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId !== 'role_select_menu') return;

        const selectedValue = interaction.values[0];
        const selectedRoleId = selectedValue.replace('role_', '');
        const member = interaction.member;

        // Get all role IDs present in this menu to manage single-choice exclusion
        const allMenuRoleIds = interaction.component.options.map(opt => opt.value.replace('role_', ''));

        try {
            // Remove any other roles from this menu that the user currently has (exclusive selection)
            const rolesToRemove = allMenuRoleIds.filter(id => id !== selectedRoleId && member.roles.cache.has(id));
            if (rolesToRemove.length > 0) {
                await member.roles.remove(rolesToRemove);
            }

            // Toggle or add the chosen role
            if (member.roles.cache.has(selectedRoleId)) {
                await member.roles.remove(selectedRoleId);
                await interaction.reply({ content: `❌ Removed the <@&${selectedRoleId}> role.`, ephemeral: true });
            } else {
                await member.roles.add(selectedRoleId);
                await interaction.reply({ content: `✅ Successfully assigned the <@&${selectedRoleId}> role!`, ephemeral: true });
            }
        } catch (error) {
            console.error('Error handling role selection:', error);
            await interaction.reply({ content: `❌ Failed to update your roles. Please check bot permissions and role hierarchy.`, ephemeral: true });
        }
    }
};
