import {
  Client,
  GatewayIntentBits,
  ActivityType,
  Partials, 
  GuildMember,
  EmbedBuilder,
  Events,
  MessageReaction,
  User,
  type PartialMessageReaction,
  type PartialUser
} from "discord.js";
import {
  handleReactionAdd as handleReactionRoleAdd,
  initializeReactionRole,
  setClient,
} from "./reaction-roles"; 
import { handlePollCommand } from "./polls";
import { initializePolls, handlePollVote } from './pollManager';
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
  partials: [
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
      Partials.User 
   
  ],
});

client.on(Events.MessageCreate, async (message) => {

  if (message.author.bot) return;

  if (message.guild && message.content.startsWith('!')) {
      const command = message.content.toLowerCase().split(' ')[0]; // Get the command part like "!poll"

      if (command === '!poll') {
          console.log(`[MessageCreate] Detected potential !poll command from ${message.author.tag}`);
          await handlePollCommand(client, message).catch(error => {
              console.error("Unhandled error in handlePollCommand:", error);
              message.reply("An unexpected error occurred whilst processing the poll command.").catch(console.error);
          });
          return; 
      }

      else if (command === '!help') {
          try {
              const embed = new EmbedBuilder()
                  .setTitle(`Help Page`)
                  .setColor(`#7105ed`)
                  .setDescription(`**!client** - Sends a download link and minimum requirements.\n\n**Admin Commands**\n**!poll** [duration] <question> <option1> [option2...] - Creates a poll. Duration (e.g., 1h30m) is optional.`) // Updated poll usage
                  .setThumbnail(`https://cdn.discordapp.com/attachments/1362925824096997598/1362925860339978370/WhiteGlow.png?ex=6806255f&is=6804d3df&hm=dac68dad312bf2ab96e02d4bcd0779cbbdec06e298b46c10743e6a1443d8df38&`);

              await message.channel.send({ embeds: [embed] });

              if (message.deletable) {
                  await message.delete().catch(console.error);
              }
          } catch (error) {
              console.error("Failed to send the help embed message: ", error);
              await message.reply("An error occurred whilst generating help information.").catch(console.error); // Adjusted error message
          }
          return;
      }

      else if (command === '!client') {
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
                  .setThumbnail(`https://cdn.discordapp.com/attachments/1362925824096997598/1362925860339978370/WhiteGlow.png?ex=6806255f&is=6804d3df&hm=dac68dad312bf2ab96e02d4bcd0779cbbdec06e298b46c10743e6a1443d8df38&`);

              await message.channel.send({ embeds: [embed] });

              if (message.deletable) {
                  await message.delete().catch(console.error);
              }
          } catch (error) {
              console.error("Failed to send the client embed message: ", error);
              await message.reply("An error occurred whilst generating client information.").catch(console.error); // Adjusted error message
          }
          return;
      }

      else if (command === '!ping') {
          await message.reply("Pong!");
          return;
      }
  }
});

setClient(client); 

let currentIndex = 0; 

client.on(Events.ClientReady, async (readyClient) => { 
  if (!readyClient.user) {
      console.error("CRITICAL: ClientUser is not available in Ready event.");
      return;
  }

  console.log(`Connected as: ${readyClient.user.tag}!`);

  try {
      await initializeReactionRole();
      console.log("Reaction roles initialized.");
  } catch (error) {
      console.error("Error initializing reaction roles:", error);
  }


  try {
      await initializePolls(readyClient);
      console.log("Active polls initialized/rescheduled.");
  } catch (error) {
      console.error("Error initializing polls:", error);
  }

  updateStatus(); 
  setInterval(updateStatus, 10000); 
});

client.on(Events.MessageReactionAdd, async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {

  if (user.bot) return;

  await handlePollVote(reaction as MessageReaction, user as User)
      .catch(error => console.error("Error during handlePollVote:", error));

  await handleReactionRoleAdd(reaction as MessageReaction, user as User)
      .catch(error => console.error("Error during handleReactionRoleAdd:", error));
});

client.on(Events.GuildMemberAdd, async (member: GuildMember) => { 
  try {

      if (!config.roleIds || !config.roleIds.new) {
           console.error("Config error: 'roleIds.new' is missing in config.json");
           return;
      }
      const role = member.guild.roles.cache.get(config.roleIds.new);
      if (!role) {
          console.error(`Role with ID ${config.roleIds.new} not found in guild ${member.guild.name}`);
          return;
      }
      await member.roles.add(role);
      console.log(`Assigned role ${role.name} to ${member.user.tag}`);
  } catch (error) {
      console.error("Error assigning role:", error);
  }
});

client.on(Events.Error, (error: Error) => { 
  console.error("An uncaught error occurred:", error); 
});


function updateStatus() {
  if (!client.user) return;
  if (!config.statusMessages || !Array.isArray(config.statusMessages) || config.statusMessages.length === 0) {

      return;
  }

  currentIndex = currentIndex % config.statusMessages.length;
  const status = config.statusMessages[currentIndex];

  if (typeof status !== "string") {
      console.error("Invalid status message (not a string) at index", currentIndex);
      currentIndex = (currentIndex + 1) % config.statusMessages.length;
      return;
  }

  try {
      client.user.setPresence({
          activities: [{ name: status, type: ActivityType.Playing }],
          status: "online",
      });
  } catch(presenceError) {
      console.error("Error setting presence:", presenceError);
  }


  currentIndex = (currentIndex + 1) % config.statusMessages.length;
}

client.login(token).catch(loginError => {
  console.error("FATAL: Failed to login. Check token and network.", loginError);
  process.exit(1);
});