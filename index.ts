import {
Client,
GatewayIntentBits,
ActivityType,
Partials,
GuildMember,
EmbedBuilder,
Events,
} from "discord.js";
import {
handleReactionAdd,
initializeReactionRole,
setClient,
} from "./reaction-roles.ts";
import { handlePollCommand } from "./polls";
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

client.on("messageCreate", async (message) => {
if (message.author.bot) return;

if (message.content.toLowerCase() === "!help") {
try {
  const embed = new EmbedBuilder()
  .setTitle(`help page`)
  .setColor(`#7105ed`)
  .setDescription(`**!client** - sends a download link and minimum requirments\n\n**admin commands**\n**!poll** - create a poll`)
  .setThumbnail(`https://cdn.discordapp.com/attachments/1362925824096997598/1362925860339978370/WhiteGlow.png?ex=6806255f&is=6804d3df&hm=dac68dad312bf2ab96e02d4bcd0779cbbdec06e298b46c10743e6a1443d8df38&`)

await message.channel.send({ embeds: [embed] });
  
  if (message.deletable) {
    await message.delete().catch(console.error);
  }
} catch (error) {
  console.error("Failed to send the embed message: ", error);
  await message.reply("Information generation error.").catch(console.error);
}


}
});

client.on(Events.MessageCreate, async (message) => {

  if (message.author.bot) return;

  if (!message.guild) return;

  if (message.content.toLowerCase().startsWith('!poll')) {
      console.log(`Detected potential !poll command from ${message.author.tag}`);

      await handlePollCommand(message).catch(error => {
          console.error("Unhandled error in handlePollCommand:", error);
    
          message.reply("An unexpected error occurred while processing the poll command.").catch(console.error);
      });
      
      return;
  }
});

client.on("messageCreate", async (message) => {
if (message.author.bot) return;

if (message.content.toLowerCase() === "!client") {
try {
const embed = new EmbedBuilder()
.setTitle(`Client requirements and download link`)
.setColor(`#7105ed`)
.setDescription(`**ariaClient**\n[Download](https://sesame.ariaclient.fun/download/client/latest)\n\nWindows Defender and SmartScreen may detect the software as a threat. In such a case, we recommend temporarily disabling real-time protection.\n‎\n**Requirements**`)
.addFields(
{ name: 'Minimum hardware', value: '4GB RAM\n4-thread CPU\nSSD storage', inline: true },
{ name: 'Operating system', value: 'Windows 10 21H2 - 10.0.19044\nWindows 10 22H2 - 10.0.19045\nWindows 11 23H2 - 10.0.22631\nWindows 11 24H2 - 10.0.26100\n(requires 64-bit)', inline: true },
{ name: 'Other', value: 'MS account with MC licence, logged into the MS Store', inline: false },
)
.setThumbnail(`https://cdn.discordapp.com/attachments/1362925824096997598/1362925860339978370/WhiteGlow.png?ex=6806255f&is=6804d3df&hm=dac68dad312bf2ab96e02d4bcd0779cbbdec06e298b46c10743e6a1443d8df38&`)

await message.channel.send({ embeds: [embed] });
  
  if (message.deletable) {
    await message.delete().catch(console.error);
  }
} catch (error) {
  console.error("Failed to send the embed message: ", error);
  await message.reply("Information generation error.").catch(console.error);
}
}
});

setClient(client);

let currentIndex = 0;

client.on("ready", async () => {
if (!client.user) return;

console.log(`Connected as: ${client.user.tag}!`);

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

client.on("messageCreate", async (message: { author: { bot: any }; content: string; reply: (arg0: string) => any }) => {
if (message.author.bot) return;

if (message.content.toLowerCase() === "!ping") {
await message.reply("Pong!");
}
});

client.on("error", (error: any) => {
console.error("Something went wrong:", error);
});

function updateStatus() {
if (!client.user) return;

const status = config.statusMessages[currentIndex];

if (typeof status !== "string") {
console.error("Invalid status message at index", currentIndex);
currentIndex = (currentIndex + 1) % config.statusMessages.length;
return;
}

client.user.setPresence({
activities: [
{
name: status,
type: ActivityType.Playing,
},
],
status: "online",
});

currentIndex = (currentIndex + 1) % config.statusMessages.length;
}

client.login(token);