import { Message, EmbedBuilder, PermissionsBitField, TextChannel, Client } from 'discord.js';
import { parseDuration, formatDuration } from './durationParser';
import { schedulePollEnd } from './pollManager'; 

export const pollEmojis = [
  "🖤",
  "🩶",
  "🤍",
  "❤️",
  "💛",
  "💚",
  "🩷",
  "💙",
  "🩵",
  "💜",
  "🤎",

];

function cleanQuotes(text: string): string {
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      return text.slice(1, -1);
  }
  return text;
}

export async function handlePollCommand(client: Client, message: Message): Promise<void> { // Dodano client jako argument
  if (!message.guild || !message.member) {
      await message.reply('This command can only be used on a server.');
      return;
  }

  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.reply('You do not have administrator permissions to use this command.');
      return;
  }

  const contentWithoutPrefix = message.content.slice('!poll'.length).trim(); // Usuń !poll i białe znaki
  const rawArgs = contentWithoutPrefix.match(/("[^"]+"|'[^']+'|\S+)/g) || [];

  if (rawArgs.length === 0) {
      await message.reply('Missing duration, question and options. Usage: `!poll [duration e.g., 1h30m] <question or "quoted question"> <option1> [option2 ...]`');
      return;
  }

  let durationMs: number | null = null;
  let endTime: number | null = null;
  let durationStr: string | null = null;

  const potentialDuration = rawArgs[0];
  const parsed = parseDuration(potentialDuration!);

  if (parsed !== null) {
      durationMs = parsed;
      endTime = Date.now() + durationMs;
      durationStr = formatDuration(durationMs);
      rawArgs.shift();
      console.log(`Parsed duration: ${durationStr} (${durationMs}ms)`);
  } else {
      console.log(`No duration specified or first argument is not a valid duration.`);
  }

  if (rawArgs.length < 3) {
      await message.reply('Missing question and/or options. You need a question and at least two options.');
      return;
  }

  let question: string;
  let optionsRaw: string[];
  const firstQuotedIndex = rawArgs.findIndex(arg => arg.startsWith('"') || arg.startsWith("'"));

  if (firstQuotedIndex === 0) {
      question = cleanQuotes(rawArgs[0]!);
      optionsRaw = rawArgs.slice(1);
  } else if (firstQuotedIndex > 0) {
      question = rawArgs.slice(0, firstQuotedIndex).join(' ');
      optionsRaw = rawArgs.slice(firstQuotedIndex);
  } else {
      question = rawArgs[0]!;
      optionsRaw = rawArgs.slice(1);
      if (rawArgs[0] && rawArgs[0].includes(' ') && !rawArgs[0].match(/^["'].*["']$/)) {
           console.warn(`[Poll Command] Question "${question}" was not quoted and contains spaces. Interpretation might be ambiguous.`);
      }
  }

  const options = optionsRaw.map(cleanQuotes);

   if (!question || question.trim().length === 0) {
      await message.reply('The poll question cannot be empty.');
      return;
  }
  if (options.length < 2) {
      await message.reply('A poll must have at least two options.');
      return;
  }
   if (options.some(opt => !opt || opt.trim().length === 0)) {
       await message.reply('None of the poll options can be empty.');
      return;
  }
  if (options.length > pollEmojis.length) {
      await message.reply(`The maximum number of options for a poll is ${pollEmojis.length}.`);
      return;
  }


  let pollDescription = `**Question**\n${question}\n\n**Choice**\n`;
  options.forEach((option, index) => {
      pollDescription += `${option} - ${pollEmojis[index]} \n`;
  });

  if (durationStr) {
      pollDescription += `\n*This poll will automatically end in ${durationStr}.*`;
  } else {
       pollDescription += `\n*This poll has no time limit.*`;
  }

  const embed = new EmbedBuilder()
  .setColor("#7105ed") 
  .setTitle('📊 Poll')
  .setDescription(pollDescription)
  .setTimestamp()
  .setFooter({
      text: `Poll created by ${message.author.tag}`,
      iconURL: message.author.displayAvatarURL()
   });

  try {
      if (!(message.channel instanceof TextChannel)) {
          await message.reply('Cannot send a poll in this channel type.');
          return;
      }

      const pollMessage = await message.channel.send({
          content: durationStr ? '@everyone' : undefined,
          embeds: [embed]
      });
      console.log(`[Poll Command] Created poll (ID: ${pollMessage.id}) in channel ${message.channel.name} by ${message.author.tag}`);

      for (let i = 0; i < options.length; i++) {
          await pollMessage.react(pollEmojis[i]!);
      }

      if (endTime && durationMs) {
          await schedulePollEnd(client, {
              channelId: message.channel.id,
              messageId: pollMessage.id,
              options: options,
              endTime: endTime,
              question: question,
              authorTag: message.author.tag
          });
      }

      if (message.deletable) {
          await message.delete().catch(err => console.error("Failed to delete the !poll message:", err));
      }

  } catch (error) {
      console.error('Error whilst creating poll:', error);
      await message.reply('An error occurred whilst creating the poll. Please check the bot\'s permissions.').catch(console.error);
  }
}
