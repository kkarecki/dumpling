import { ActivityType, Client, GatewayIntentBits, Partials } from "discord.js";
import { token } from "./token.json";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.on("ready", () => {
  console.log(`Użyto konta ${client.user?.tag}!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === "!ping") {
    await message.reply("Pong!");
  }
});

client.on("error", (error) => {
  console.error("Wystąpił błąd:", error);
});

const statusMessages: string[] = [
  "Type /help",
  "ariaClient is the best!",
  "ariaclient.fun",
  "nice status bro",
];

let currentIndex = 0;

updateStatus();

setInterval(updateStatus, 10000);

function updateStatus() {
  if (!client.user) return;

  const status = statusMessages[currentIndex];
  if (typeof status !== "string") {
    console.error("Invalid status message");
    return;
  }
  currentIndex = (currentIndex + 1) % statusMessages.length;

  client.user.setPresence({
    activities: [
      {
        name: status,
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  });
}

client.login(token);
