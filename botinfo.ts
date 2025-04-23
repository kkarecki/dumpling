// bun i
// bun upgrade

import {
  DMChannel,
  EmbedBuilder,
  Message,
  NewsChannel,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import si from "systeminformation";
import config from "./config.json";

function formatUptime(readyTimestamp: number | null): string {
  if (!readyTimestamp) return "N/A";
  const uptimeMs: number = Date.now() - readyTimestamp;
  const secondsTotal: number = Math.floor(uptimeMs / 1000);
  const days: number = Math.floor(secondsTotal / 86400);
  const hours: number = Math.floor((secondsTotal % 86400) / 3600);
  const minutes: number = Math.floor((secondsTotal % 3600) / 60);
  const seconds: number = Math.floor(secondsTotal % 60);

  let uptimeStr = "";
  if (days > 0) uptimeStr += `${days}d `;
  if (hours > 0) uptimeStr += `${hours}h `;
  if (minutes > 0) uptimeStr += `${minutes}m `;
  uptimeStr += `${seconds}s`;
  return uptimeStr.trim() || "0s";
}

function createProgressBar(percentage: number, length: number = 10): string {
  const filledBlocks: number = Math.round((percentage / 100) * length);
  const emptyBlocks: number = length - filledBlocks;
  const filledStr: string = "|".repeat(filledBlocks);
  const emptyStr: string = " ".repeat(emptyBlocks);
  return `[${filledStr}${emptyStr}]`;
}

function formatBytesToGiB(bytes: number): string {
  if (bytes === 0) return "0 GiB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(0);
}

export async function handleBotInfoCommand(message: Message): Promise<void> {
  if (!message.channel || !message.channel.isTextBased()) {
    console.warn(
      `Command invoked in non-text-based or missing channel (ID: ${message.channelId})`
    );
    try {
      await message.author.send(
        "The `!bot` command can only be used in text-based channels."
      );
    } catch (dmError) {
      console.warn("Failed to send DM warning to user.", dmError);
    }
    return;
  }

  let processingMessage: Message | null = null;
  try {
    processingMessage = await message.reply(
      "⚙️ Fetching system information..."
    );

    const [cpuData, memData, osData, fsData] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.osInfo(),
      si.fsSize(),
    ]);

    const cpuLoad = cpuData.currentLoad.toFixed(0);
    const ramUsed = formatBytesToGiB(memData.used);
    const ramTotal = formatBytesToGiB(memData.total);
    const ramPercent = ((memData.used / memData.total) * 100).toFixed(0);
    const mainFs = fsData.find((fs) => fs.mount === "/") || fsData[0];
    let diskUsed = "N/A";
    let diskTotal = "N/A";
    let diskPercent = "0";
    if (mainFs) {
      diskUsed = formatBytesToGiB(mainFs.used);
      diskTotal = formatBytesToGiB(mainFs.size);
      diskPercent = mainFs.use.toFixed(0);
    }
    const bunVersion = Bun.version;
    const platform = osData.platform === "darwin" ? "macOS" : osData.platform;
    const osDistro = osData.distro;
    const cpuBar = createProgressBar(parseFloat(cpuLoad));
    const ramBar = createProgressBar(parseFloat(ramPercent));
    const diskBar = createProgressBar(parseFloat(diskPercent));
    const botUser = message.client.user;
    const uptime = formatUptime(message.client.readyTimestamp);
    const latency = message.client.ws.ping;
    const serverCount = message.client.guilds.cache.size;

    const embed = new EmbedBuilder()
      .setColor("#7105ed")
      .setTitle(`🤖 Information about ${botUser?.username || "the Bot"}`)
      .setThumbnail(botUser?.displayAvatarURL() || null)
      .addFields(
        {
          name: "👤 Author",
          value: `Mention: <@${config.botAuthorId}>\nGitHub: [${config.botAuthorGh}](https://github.com/${config.botAuthorGh})`,
          inline: true,
        },
        {
          name: "⚙️ Environment",
          value: `**Version:** \`${config.botVersion}\`\n**Runtime:** \`${bunVersion}\`\n**OS:** \`${platform} (${osDistro})\``,
          inline: true,
        },
        {
          name: "\u200B",
          value: "\u200B",
          inline: false,
        },
        {
          name: "📊 Statistics",
          value: `**Uptime:** ${uptime}\n**Latency:** ${latency}ms\n**Servers:** ${serverCount}`,
          inline: false,
        },
        {
          name: "💻 Resource Usage",
          value:
            "```yml\n" +
            `${cpuBar} ${cpuLoad}%   CPU\n` +
            `${ramBar} ${ramPercent}%   RAM ${ramUsed} GiB/${ramTotal} GiB\n` +
            `${diskBar} ${diskPercent}%   Disk ${diskUsed} GiB/${diskTotal} GiB` +
            "```",
          inline: false,
        }
      )
      .setTimestamp()
      .setFooter({
        text: `Requested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL() ?? undefined,
      });

    if (processingMessage) {
      await processingMessage.delete().catch(console.error);
    }

    await (
      message.channel as TextChannel | DMChannel | NewsChannel | ThreadChannel
    ).send({ embeds: [embed] });

    if (message.deletable) {
      await message.delete().catch((err) => {
        console.error("Failed to delete the user's command message:", err);
      });
    }
  } catch (error) {
    console.error("Error fetching system information:", error);
    if (processingMessage) {
      await processingMessage
        .edit("Failed to fetch system information. Please check the console.")
        .catch(console.error);
    } else {
      await message
        .reply("Failed to fetch system information. Please check the console.")
        .catch(console.error);
    }
  }
}
