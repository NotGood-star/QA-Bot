require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];

const commandsPath = path.join(__dirname, "commands");

function loadCommands(folder) {
    const files = fs.readdirSync(folder);

    for (const file of files) {
        const filePath = path.join(folder, file);

        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith(".js")) {
            const command = require(filePath);

            if (command.data) {
                commands.push(command.data.toJSON());
            }
        }
    }
}

loadCommands(commandsPath);

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("Registering slash commands...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("✅ Slash commands registered!");
    } catch (err) {
        console.error(err);
    }
})();
