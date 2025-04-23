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
import { handleBotInfoCommand } from "./botinfo";
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
      const command = message.content.toLowerCase().split(' ')[0];
      

      if (command === '!poll') {
          console.log(`Detected potential !poll command from ${message.author.tag}`);
          await handlePollCommand(client, message).catch(error => {
              console.error("Unhandled error in handlePollCommand:", error);
              message.reply("An unexpected error occurred whilst processing the poll command.").catch(console.error);
          });
          return; 
      }

      else if (command === '!bot') {
        console.log(`[MessageCreate] Detected !bot command from ${message.author.tag}`);
        await handleBotInfoCommand(message).catch(error => {
            console.error("Unhandled error in handleBotInfoCommand:", error);
            message.reply("An unexpected error occurred whilst fetching bot info.").catch(console.error);
        });
        return; 
    }

      else if (command === '!help') {
          try {
            const originalThumbnail = `https://cdn.discordapp.com/attachments/1362925824096997598/1362925860339978370/WhiteGlow.png?ex=6806255f&is=6804d3df&hm=dac68dad312bf2ab96e02d4bcd0779cbbdec06e298b46c10743e6a1443d8df38&`;

            const embed = new EmbedBuilder()
    .setColor(`#7105ed`)
    .setTitle('ℹ️ Bot Commands Help')
    .setThumbnail(originalThumbnail)
    .setDescription('Here’s a list of available commands, separated by access level:')
    .addFields(
        {
            name: '👤 User Commands',
            value: '\u200B' 
        },
        {
            name: '🖥️ !client',
            value: 'Sends the download link and minimum requirements for ariaClient.',
            inline: false 
        },
        {
            name: '\u200B',
            value: '\u200B'
        },
        {
            name: '🛡️ Admin Commands',
            value: '\u200B'
        },
        {
            name: '📊 !poll',
            value: 'Creates a poll in the current channel.\n\n' +
                   '**Syntax:**\n`!poll [duration] <question> <option1> [option2...]`\n\n' +
                   '• **[duration]** (Optional): Set a time limit (e.g., `30s`, `10m`, `1h`, `1d`).\n' +
                   '• **<question>**: The question to ask.\n' +
                   '• **<option1> [option2...]**: At least two poll options, separated by spaces.\n\n' +
                   '**Example:**\n`!poll 1h Favourite season? Summer Autumn Winter Spring`',
            inline: false
        }
    )
    .setTimestamp()
    .setFooter({ text: `Command Help Information`, iconURL: originalThumbnail });

            

              await message.channel.send({ embeds: [embed] });

              if (message.deletable) {
                  await message.delete().catch(console.error);
              }
          } catch (error) {
              console.error("Failed to send the help embed message: ", error);
              await message.reply("An error occurred whilst generating help information.").catch(console.error);
          }
          return;
      }

      else if (command === '!client') {
          try {
            const thumbnailUrl = `https://cdn.discordapp.com/attachments/1362925824096997598/1362925860339978370/WhiteGlow.png?ex=6806255f&is=6804d3df&hm=dac68dad312bf2ab96e02d4bcd0779cbbdec06e298b46c10743e6a1443d8df38&`;

            const embed = new EmbedBuilder()
                .setTitle(`📊 Client requirements and download link`)
                .setColor(`#7105ed`)
                .setDescription(
                    `⬇️ **ariaClient**\n[Download](https://sesame.ariaclient.fun/download/client/latest)\n\n` +
                    `⚠️ Windows Defender and SmartScreen may detect the software as a threat. In such a case, we recommend temporarily disabling real-time protection.\n\n` + 
                    `📋 **Requirements**` 
                )
                .addFields(
                    {
                        name: '⚙️ Minimum hardware',
                        value: '• 4GB RAM\n• 4-thread CPU\n• SSD storage',
                        inline: true
                    },
                    {
                        name: '🪟 Operating system',
                        value: '• Windows 10 21H2 (19044)\n• Windows 10 22H2 (19045)\n• Windows 11 23H2 (22631)\n• Windows 11 24H2 (26100)\n*Requires 64-bit*',
                        inline: true
                    },
                    {
                        name: '🔑 Other',
                        value: '• MS account with MC licence\n• Logged into the MS Store',
                        inline: false
                    }
                )
                .setThumbnail(thumbnailUrl)
                .setTimestamp()
                .setFooter({ text: 'ariaClient Information', iconURL: thumbnailUrl });

              await message.channel.send({ embeds: [embed] });

              if (message.deletable) {
                  await message.delete().catch(console.error);
              }
          } catch (error) {
              console.error("Failed to send the client embed message: ", error);
              await message.reply("An error occurred whilst generating client information.").catch(console.error);
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