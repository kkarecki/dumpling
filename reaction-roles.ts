import {
  MessageReaction,
  User,
  type PartialUser,
  type PartialMessageReaction,
  Client,
  TextChannel,
} from "discord.js";
import config from "./config.json";

let client: Client;

export function setClient(discordClient: Client) {
  client = discordClient;
}

function isValidReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): boolean {
  const [reactionName, reactionId] = config.reactionEmoji.split(":");

  return (
    reaction.message.id === config.targetMessageId &&
    reaction.emoji.name === reactionName &&
    reaction.emoji.id === reactionId &&
    !user.bot
  );
}

async function ensureCompleteReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Failed to fetch the reaction:", error);
      return null;
    }
  }

  if (user.partial) {
    try {
      await user.fetch();
    } catch (error) {
      console.error("Failed to fetch the user:", error);
      return null;
    }
  }

  return { reaction: reaction as MessageReaction, user: user as User };
}
export async function handleReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  const complete = await ensureCompleteReaction(reaction, user);
  if (!complete || !isValidReaction(complete.reaction, complete.user)) return;

  try {
    const { reaction: fullReaction, user: fullUser } = complete;
    const member = fullReaction.message.guild?.members.cache.get(fullUser.id);
    if (!member) return;

    const memberRole = fullReaction.message.guild?.roles.cache.get(
      config.roleIds.member
    );
    if (!memberRole) {
      console.error(`Role ${config.roleIds.member} not found`);
      return;
    }

    if (!member.roles.cache.has(config.roleIds.member)) {
      await member.roles.add(memberRole);
    }

    const newRole = fullReaction.message.guild?.roles.cache.get(
      config.roleIds.new
    );
    if (newRole && member.roles.cache.has(config.roleIds.new)) {
      await member.roles.remove(newRole);
    }

    await fullReaction.users.remove(fullUser.id);
  } catch (error) {
    console.error("Error processing reaction:", error);
  }
}

export async function initializeReactionRole() {
  if (!client.user) {
    console.error("Bot nie jest gotowy!");
    return;
  }

  try {
    const channel = client.channels.cache.find(
      (ch) => ch.id === config.targetChannelId
    );

    if (!channel || !channel.isTextBased()) {
      console.error("Nie znaleziono odpowiedniego kanału!");
      return;
    }

    const message = await channel.messages
      .fetch(config.targetMessageId)
      .catch((err) => {
        console.error(err);

        console.error(`Message retrieval error: ${err}`);
        return null;
      });

    if (!message) {
      console.error(`Message ${config.targetMessageId} doesn't exist!`);
      return;
    }

    await message.react(config.reactionEmoji);
  } catch (error) {
    console.error("Critical error:", error);
  }
}


export { Client };
