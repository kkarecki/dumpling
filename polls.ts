import { Message, EmbedBuilder, PermissionsBitField, TextChannel } from 'discord.js';

const pollEmojis = [
  "❤️",
  "🩷",
  "💛",
  "💚",
  "💙",
  "🩵",
  "💜",
  "🤎",
  "🖤",
  "🩶",
  "🤍",
];

function cleanQuotes(text: string): string {
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      return text.slice(1, -1);
  }
  return text;
}

export async function handlePollCommand(message: Message): Promise<void> {
  if (!message.guild || !message.member) {
      await message.reply('This command can only be used on a server.');
      return;
  }

  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.reply('You do not have administrator permissions to use this command.');
      return;
  }

  const rawArgs = message.content.match(/("[^"]+"|'[^']+'|\S+)/g) || [];
  rawArgs.shift();

  if (rawArgs.length === 0) {
      await message.reply('Missing question and options. Usage: `!poll <question or "quoted question"> <"option 1"> ["option 2" ...] or <option1> [option2 ...]`');
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
           console.warn(`Question "${question}" was not quoted and contains spaces. Interpretation might be ambiguous.`);
      }
  }

  const options = optionsRaw.map(cleanQuotes);

  if (options.length < 2) {
      await message.reply('A poll must have at least two options.');
      return;
  }

  if (options.length > pollEmojis.length) {
      await message.reply(`The maximum number of options for a poll is ${pollEmojis.length}.`);
      return;
  }

  let pollDescription = `**Question**\n**${question}**\n\n**Choice**\n`;
  options.forEach((option, index) => {
      pollDescription += `${option} - ${pollEmojis[index]} \n`;
  });

  const embed = new EmbedBuilder()
    .setColor(`#7105ed`)
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
          content: '@everyone',
          embeds: [embed]
      });
      // --------------------------

      console.log(`Created poll (ID: ${pollMessage.id}) in channel ${message.channel.name} by ${message.author.tag}`);

      for (let i = 0; i < options.length; i++) {
          await pollMessage.react(pollEmojis[i]!);
      }

      if (message.deletable) {
          await message.delete().catch(err => console.error("Failed to delete the !poll message:", err));
      }

  } catch (error) {
      console.error('Error whilst creating poll:', error);
      await message.reply('An error occurred whilst creating the poll. Please check the bot\'s permissions.').catch(console.error);
  }
}
