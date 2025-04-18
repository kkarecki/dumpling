import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
  GuildMember,
} from "discord.js";
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

client.on("guildMemberAdd", async (member: GuildMember) => {
  try {
    if (!ROLE_ID) {
      console.error("ROLE_ID is not set in environment variables");
      return;
    }

    const role = member.guild.roles.cache.get(ROLE_ID);
    if (!role) {
      console.error(`Role with ID ${ROLE_ID} not found`);
      return;
    }

    await member.roles.add(role);
    console.log(`Assigned role ${role.name} to ${member.user.tag}`);
  } catch (error) {
    console.error("Error assigning role:", error);
  }
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

const ROLE_ID = "1361838149214666874"; // Stałe ID rangi
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
