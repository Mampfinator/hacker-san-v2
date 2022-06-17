import { ClientEvents } from "discord.js";
// use in DiscordClientService to relay events to the @On handler.
export const DISCORD_EVENT_NAMES: (keyof ClientEvents)[] = [
    "ready",
    "interactionCreate",
    "messageCreate"
]