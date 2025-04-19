import {
  Client,
  GatewayIntentBits,
  ActivityType,
  Partials,
  GuildMember,
} from "discord.js";
import {
  handleReactionAdd,
  initializeReactionRole,
  setClient,
} from "./reaction-roles.ts";
import { token } from "./token.json";
import config from "./config.json";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

setClient(client);

let currentIndex = 0;

client.on("ready", async () => {
  if (!client.user) return;

  console.log(`Bot zalogowany jako ${client.user.tag}!`);

  await initializeReactionRole();

  updateStatus();
  setInterval(updateStatus, 10000);
});

client.on("messageReactionAdd", handleReactionAdd);

client.on("guildMemberAdd", async (member: GuildMember) => {
  try {
    const role = member.guild.roles.cache.get(config.roleIds.new);
    if (!role) {
      console.error(`Role with ID ${config.roleIds.new} not found`);
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

function updateStatus() {
  if (!client.user) return;

  const status = config.statusMessages[currentIndex];

  // Dodana walidacja typu
  if (typeof status !== "string") {
    console.error("Invalid status message at index", currentIndex);
    currentIndex = (currentIndex + 1) % config.statusMessages.length;
    return;
  }

  client.user.setPresence({
    activities: [
      {
        name: status, // Teraz TypeScript wie, że status jest stringiem
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  });

  currentIndex = (currentIndex + 1) % config.statusMessages.length;
}

client.login(token);
