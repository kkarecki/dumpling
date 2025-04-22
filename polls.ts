import {
  Message,
  EmbedBuilder,
  PermissionsBitField,
  TextChannel,
} from "discord.js";

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

/**
  @param message 
 */
export async function handlePollCommand(message: Message): Promise<void> {
  if (!message.guild || !message.member) {
    await message.reply("This command can only be used on a server.");
    return;
  }

  if (
    !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    await message.reply(
      "You don’t have administrator permissions to use this command."
    );
    return;
  }

  const args = message.content.match(/("[^"]+"|'[^']+'|\S+)/g) || [];
  args.shift();

  const cleanedArgs = args.map((arg) =>
    (arg.startsWith('"') && arg.endsWith('"')) ||
    (arg.startsWith("'") && arg.endsWith("'"))
      ? arg.slice(1, -1)
      : arg
  );

  if (cleanedArgs.length < 3) {
    await message.reply(
      'Usage: !poll "Question" "Option1" "Option2" [Optional_Options...] `'
    );
    return;
  }

  const question = cleanedArgs[0];
  const options = cleanedArgs.slice(1);

  if (options.length > pollEmojis.length) {
    await message.reply(
      `The maximum number of options in a poll is ${pollEmojis.length}.`
    );
    return;
  }

  let pollDescription = `**${question}**\n\n`;
  options.forEach((option, index) => {
    pollDescription += `${pollEmojis[index]} ${option}\n`;
  });

  const embed = new EmbedBuilder()
    .setColor("#7105ed")
    .setTitle("React to vote in the poll.")
    .setDescription(pollDescription)
    .setFooter({ text: `Author ${message.author.tag}` });

  try {
    if (!(message.channel instanceof TextChannel)) {
      await message.reply(
        "This type of channel does not support sending surveys."
      );
      return;
    }

    const pollMessage = await message.channel.send({ embeds: [embed] });
    console.log(
      `A poll has been created (ID: pollMessage.id) in channel ∗∗pollMessage.id)in channel ∗∗{message.channel.name}** by ${message.author.tag}.`
    );

    for (let i = 0; i < options.length; i++) {
      await pollMessage.react(pollEmojis[i]!);
    }

    if (message.deletable) {
      await message
        .delete()
        .catch((err) =>
          console.error("Unable to remove the !poll message.", err)
        );
    }
  } catch (error) {
    console.error("Error creating poll:", error);
    await message
      .reply(
        "An error occurred while creating the poll. Please check the bots permissions (send messages, add reactions, embed links)."
      )
      .catch(console.error);
  }
}
