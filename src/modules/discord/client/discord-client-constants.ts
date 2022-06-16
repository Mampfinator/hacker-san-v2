import { ClientEvents } from "discord.js";

export const DISCORD_EVENT_NAMES: (keyof ClientEvents)[] = [
    "ready",
    "interactionCreate",
]