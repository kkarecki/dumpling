import { Client, GatewayIntentBits, Partials } from "discord.js";
import { token } from "./token.json";

// Utwórz nowego klienta Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// Gotowość bota
client.on("ready", () => {
  console.log(`Użyto konta ${client.user?.tag}!`);
});

// Obsługa wiadomości
client.on("messageCreate", async (message) => {
  // Ignoruj wiadomości od innych botów
  if (message.author.bot) return;

  // Prosta komenda ping
  if (message.content.toLowerCase() === "!ping") {
    await message.reply("Pong!");
  }
});

// Obsługa błędów
client.on("error", (error) => {
  console.error("Wystąpił błąd:", error);
});

// Zaloguj bota używając tokenu z pliku .env
client.login(token);
