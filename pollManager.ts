import {
  Client,
  TextChannel,
  EmbedBuilder,
  MessageReaction,
  User,
} from "discord.js";
import fs from "fs/promises";
import path from "path";
import { pollEmojis } from "./polls";
import { formatDuration } from "./durationParser";

interface ActivePoll {
  channelId: string;
  messageId: string;
  options: string[];
  endTime: number;
  question: string;
  authorTag: string;
}

const ACTIVE_POLLS_FILE = path.join(__dirname, "activePolls.json");

const pollTimeouts = new Map<string, NodeJS.Timeout>();

async function readActivePolls(): Promise<Record<string, ActivePoll>> {
  try {
    await fs.access(ACTIVE_POLLS_FILE);
    const data = await fs.readFile(ACTIVE_POLLS_FILE, "utf-8");
    return JSON.parse(data) as Record<string, ActivePoll>;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return {};
    }
    console.error("Error reading active polls file:", error);
    return {};
  }
}

async function writeActivePolls(
  polls: Record<string, ActivePoll>
): Promise<void> {
  try {
    await fs.writeFile(ACTIVE_POLLS_FILE, JSON.stringify(polls, null, 2));
  } catch (error) {
    console.error("Error writing active polls file:", error);
  }
}

export async function announceResults(
  client: Client,
  messageId: string
): Promise<void> {
  console.log(`Announcing results for poll: ${messageId}`);
  const polls = await readActivePolls();
  const pollData = polls[messageId];

  const existingTimeout = pollTimeouts.get(messageId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    pollTimeouts.delete(messageId);
  }

  if (!pollData) {
    console.warn(
      `Poll data not found for messageId ${messageId} when trying to announce results.`
    );
    return;
  }

  try {
    const channel = await client.channels.fetch(pollData.channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      console.error(
        `Channel ${pollData.channelId} not found or not a TextChannel.`
      );
      delete polls[messageId];
      await writeActivePolls(polls);
      return;
    }

    const message = await channel.messages
      .fetch(pollData.messageId)
      .catch(() => null);
    if (!message) {
      console.warn(
        `Poll message ${pollData.messageId} not found in channel ${pollData.channelId}.`
      );
      delete polls[messageId];
      await writeActivePolls(polls);
      channel
        .send(
          `Poll message for "${pollData.question}" was not found (maybe deleted?). Cannot announce results.`
        )
        .catch(console.error);
      return;
    }

    const results: { option: string; emoji: string; votes: number }[] = [];
    let totalVotes = 0;

    const reactions = message.reactions.cache;

    for (let i = 0; i < pollData.options.length; i++) {
      const emoji = pollEmojis[i];
      if (!emoji) continue;
      const reaction = reactions.get(emoji);
      const voteCount = reaction ? reaction.count - 1 : 0;
      results.push({
        option: pollData.options[i]!,
        emoji: emoji,
        votes: voteCount < 0 ? 0 : voteCount,
      });
      totalVotes += voteCount < 0 ? 0 : voteCount;
    }

    results.sort((a, b) => b.votes - a.votes);

    let resultsDescription = `**Results for: ${pollData.question}**\n\n`;
    if (totalVotes === 0) {
      resultsDescription += "No votes were cast.\n";
    } else {
      results.forEach((result) => {
        const percentage =
          totalVotes > 0
            ? ((result.votes / totalVotes) * 100).toFixed(1)
            : "0.0";
        resultsDescription += `${result.emoji} ${result.option}: **${result.votes}** votes (${percentage}%)\n`;
      });
    }
    resultsDescription += `\nTotal votes: ${totalVotes}`;

    const resultsEmbed = new EmbedBuilder()
      .setColor("#7105ed")
      .setTitle("📊 Poll Results")
      .setDescription(resultsDescription)
      .setTimestamp()
      .setFooter({ text: `Poll created by ${pollData.authorTag}` });

    await channel.send({ embeds: [resultsEmbed] });
  } catch (error) {
    console.error(`Error announcing results for poll ${messageId}:`, error);
  } finally {
    delete polls[messageId];
    await writeActivePolls(polls);
    console.log(`Removed poll ${messageId} from active polls.`);
  }
}

export async function schedulePollEnd(
  client: Client,
  pollInfo: ActivePoll
): Promise<void> {
  const polls = await readActivePolls();
  polls[pollInfo.messageId] = pollInfo;
  await writeActivePolls(polls);

  const durationMs = pollInfo.endTime - Date.now();
  if (durationMs <= 0) {
    console.warn(
      `Poll ${pollInfo.messageId} scheduled with non-positive duration. Announcing immediately.`
    );
    await announceResults(client, pollInfo.messageId);
    return;
  }

  const existingTimeout = pollTimeouts.get(pollInfo.messageId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  console.log(
    `Scheduling poll ${pollInfo.messageId} to end in ${formatDuration(
      durationMs
    )}`
  );
  const timeoutId = setTimeout(() => {
    announceResults(client, pollInfo.messageId).catch((err) =>
      console.error(
        `Error in scheduled announceResults for ${pollInfo.messageId}:`,
        err
      )
    );
    pollTimeouts.delete(pollInfo.messageId);
  }, durationMs);

  pollTimeouts.set(pollInfo.messageId, timeoutId);
}

export async function initializePolls(client: Client): Promise<void> {
  console.log("Initializing polls...");
  const polls = await readActivePolls();
  const now = Date.now();
  let rescheduledCount = 0;
  let announcedCount = 0;

  for (const messageId in polls) {
    const poll = polls[messageId]!;
    const remainingTime = poll.endTime - now;

    if (remainingTime <= 0) {
      console.log(`Poll ${messageId} has expired. Announcing results.`);
      await announceResults(client, messageId);
      announcedCount++;
    } else {
      console.log(
        `Rescheduling poll ${messageId} to end in ${formatDuration(
          remainingTime
        )}`
      );
      const timeoutId = setTimeout(() => {
        announceResults(client, messageId).catch((err) =>
          console.error(
            `Error in rescheduled announceResults for ${messageId}:`,
            err
          )
        );
        pollTimeouts.delete(messageId);
      }, remainingTime);
      pollTimeouts.set(messageId, timeoutId);
      rescheduledCount++;
    }
  }
  console.log(
    `Initialization complete. Rescheduled ${rescheduledCount} polls, announced results for ${announcedCount} expired polls.`
  );
}

export async function handlePollVote(
  reaction: MessageReaction,
  user: User
): Promise<void> {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("[PollVote] Failed to fetch partial reaction:", error);
      return;
    }
  }
  if (reaction.message.partial) {
    try {
      await reaction.message.fetch();
    } catch (error) {
      console.error("[PollVote] Failed to fetch partial message:", error);
      return;
    }
  }
  if (user.partial) {
    try {
      await user.fetch();
    } catch (error) {
      console.error("[PollVote] Failed to fetch partial user:", error);
      return;
    }
  }

  const message = reaction.message;
  const emojiIdentifier = reaction.emoji.name;

  const polls = await readActivePolls();
  const pollData = polls[message.id];

  if (!pollData) {
    return;
  }

  const validPollEmojis = pollEmojis.slice(0, pollData.options.length);
  if (!emojiIdentifier || !validPollEmojis.includes(emojiIdentifier)) {
    return;
  }

  console.log(
    `[PollVote] User ${user.tag} reacted with valid poll emoji ${emojiIdentifier} on poll ${message.id}`
  );

  for (const existingReaction of message.reactions.cache.values()) {
    const existingEmojiIdentifier = existingReaction.emoji.name;

    if (
      existingEmojiIdentifier &&
      validPollEmojis.includes(existingEmojiIdentifier) &&
      existingEmojiIdentifier !== emojiIdentifier
    ) {
      try {
        if (existingReaction.users.cache.has(user.id)) {
          console.log(
            `[PollVote] Removing previous vote ${existingEmojiIdentifier} for user ${user.tag} on poll ${message.id}`
          );
          await existingReaction.users.remove(user.id);
        } else {
          const users = await existingReaction.users.fetch();
          if (users.has(user.id)) {
            console.log(
              `[PollVote] Removing previous vote ${existingEmojiIdentifier} (fetched) for user ${user.tag} on poll ${message.id}`
            );
            await existingReaction.users.remove(user.id);
          }
        }
      } catch (error) {
        console.error(
          `Failed to remove reaction ${existingEmojiIdentifier} for user ${user.tag} (likely missing 'Manage Messages' permission):`,
          error
        );
      }
    }
  }
}
