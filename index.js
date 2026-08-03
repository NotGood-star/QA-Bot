require("dotenv").config();

const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
const PORT = process.env.PORT || 3000;

// Simple web server for Render
app.get("/", (req, res) => {
    res.send("QA Bot is online!");
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// Discord Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once("ready", () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
