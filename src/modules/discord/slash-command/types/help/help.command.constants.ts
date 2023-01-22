import { bold, Colors, EmbedBuilder, italic } from "discord.js";

export const HELP_COMMAND_TOPIC_MAP = new Map<string | undefined, EmbedBuilder>()
    .set(undefined, new EmbedBuilder()
        .setColor(Colors.Aqua)
        .setTitle("General Help")
        .setDescription(`
            Hi! Welcome to the Hacker-san general help! For help about specific topics, use \`/help topic:[...]\`.
            Hacker-san is yet another notification bot but with a focus on customisability & server automation.
            You can find details about what certain Actions do in their respective \`/action create\` entry.
        `)
        .addFields(
            {
                name: "Open Source",
                value: "See https://github.com/Mampfinator/hacker-san-v2 for current (WIP) code. Contributions are welcome, especially if they're on the To-Do List!",
                inline: true,
            },
            {
                name: "Money",
                value: "Hacker-san is entirely free to use! But if you'd like to support me, I (Sir Eatsalot#6644) have a [Throne](https://throne.me/sireatsalot) where you can buy me food & stuff.",
                inline: true,
            },
            {
                name: "Dashboard",
                value: "A Dashboard is pretty high up on the list of To-Dos! But currently resources are focused elsewhere."
            },
            {
                name: "Support",
                value: "If you need help with anything regarding the bot, feel free to contact me directly via Discord or Twitter or wherever else you can find me. If you find what you assume to be a bug, you can [create an issue](https://github.com/Mampfinator/hacker-san-v2/issues/new) on Github."
            }
        )
    )
    .set(
        "platforms",
        new EmbedBuilder()
            .setColor(Colors.Fuchsia)
            .setTitle("About Platforms")
            .addFields(
                {
                    name: "YouTube Events",
                    value: `${bold("Post")}: A channel has posted a new ${italic("Community Posts")}
                    ${bold("Upload")}: A channel has uploaded a new video. This includes ${italic("Shorts")}.
                    ${bold("Live")}: A channel went live. This includes ${italic("Premieres")}.
                    ${bold("Offline")}: A live event has ended. This includes ${italic("Premieres")}.
                    ${bold("Upcoming")}: A channel has made a live event reservation. This includes Premieres.`,
                    inline: true,
                },
                {
                    name: "Details on YouTube Channels",
                    value: `${bold(`Supported Channel formats`)} (for \`channel:\` options for \`/action\`, etc.):
                    1.) \`(https://youtube.com/)@user\`
                    2.) \`(https://youtube.com/channel/)channelID\`
                    3.) \`https://youtube.com/c/VanityURL\`
                    
                    If no link is detected, it'll attempt to parse a handle first and if that fails, will interpret input as a channel ID.
                    In general, if you just paste a channel link, it'll probably work. If doesn't, feel free to contact the bot dev.`,
                    inline: true,
                },
            ),
    );
