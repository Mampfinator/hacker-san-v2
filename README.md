# Hacker-san V2
The long-awaited and completely overdue improved notification bot for [PRISMCord](https://discord.gg/prismworld) - now with slash commands and 7% less jank.

## Features

### Live Features
- Live/Schedule/Upload/Offline notifications for YouTube & Twitter (with more planned!), along with community posts for YouTube
- Customizable Action system 
- An over-designed but at the very least working slash command loader.

### Planned Features
- Temporary Actions: schedule actions to happen one time and one time only; ideal for off-channel collabs.
- More Platforms: support for more platforms (like Twitch & Twitcasting)
- Potentially a more user-friendly way of managing Actions. A frontend, mayhaps; or just a builder.
- Mod-message relay (with per-guild defined ignore settings!) to a specified stream chat (~~totally not stolen from Luna bot~~)


## What is an "Action"?
An Action, or in previous iterations, a Callback, is something to do when there's activity on YouTube or Twitter or the likes, be it a community post, a live stream or an upload.

There are currently 4 types of actions:
- **Echo**: sends a message to the specified channel. Doesn't really do a lot, but it can be used to set up KoroTagger with `!stream {link}` and `!tags {link}`.
- **Lock**: Locks or unlocks the channel. If a message is supplied, will also send that message (prefixed with an unlocked/locked padlock).
- **Notify**: Mostly functions like echo, but, as is the case with Twitter Spaces and YouTube community posts, if the website doesn't provide its own embeds, it will also send a custom embed.
- **Rename**: Renames the specified channel. Mainly useful to indicate if a channel is live or offline. See `/quick-setup rename` for the most common use case. 

All actions can be triggered on any of the following events:
- **Live**: When a stream goes live.
- **Offline**: When a stream goes offline.
- **Upload**: When a video is uploaded (currently only YouTube).
- **Post**: When a community post is made (currently only YouTube). May include other things in the future, such as Twitter posts.
- **Upcoming**: When a stream is scheduled.

## Self-hosting & Configuration
Create your configuration in the project root: a `.env` file for API keys, tokens and the database URL, and a `config.toml` for the rest. 
Have a look at `.env.example` and `config.example.toml` to see what options are available.

Install dependencies:
```
npm install
```

Build:
```
npm run build
```

Start: 
```
npm run start:prod
```

The app also has a few command line options you can pass: 
| Option         | Alias | Effect                                                                                                                                                                   |
|----------------|-------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| --port         | -p    | Usage: `--port <number>`/`-p <number>`; Overrides the port in config.toml.                                                                                                             |
| --always-dm    | /     | Forces the bot to DM its owner in case of an unexpected error. By default, checks NODE_ENV; if it's "production", it will DM. If not, it won't.                          |
| --no-login     | /     | Skips the Discord client login. Can be used for a bootstrap dry-run for troubleshooting.                                                                                 |
| --no-youtube   | /     | Overrides disabled/enabled in config.toml for "youtube".                                                                                                                 |
| --no-twitter   | /     | Overrides disabled/enabled in config.toml for "twitter".                                                                                                                 |
| --print-config | /     | Prints the evaluated configuration (WARNING: includes potentially sensitive data such as tokens and API keys) for debugging purposes and then attempts to start the app. |
| --skip-sync    | /     | Skips syncronization of all platforms on startup. Reduces startup time massively but can also lead to inconsistencies between the API and the database.                  |
| --deploy-global-commands | /      | Deploys slash commands globally. By default, checks whether NODE_ENV is `production`.

Remember that you may need to pass an or multiple additional `--` before command line arguments depending on how you start the app.

For YouTube & Twitcasting (soon:tm:), you'll need to expose an external IP/adress for WebHook messages. This is configurable in your **config.toml**.

## Contributing
*Good luck*. I am open to PRs & issues tho. If you run into problems or have questions, you can find me on PRISMcord as Sir Eatsalot.