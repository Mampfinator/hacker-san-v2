# Hacker-san V2
The long-awaited and completely overdue improved notification bot for [PRISMCord](https://discord.gg/prismworld) - now with slash commands and 7% less jank.

## Features
- Live/Schedule/Upload/Offline notifications for YouTube & Twitter (with more planned!), along with community posts for YouTube
- Customizable Action system 
- An over-designed but at the very least working slash command loader.

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

Remember that you may need to pass an or multiple additional `--` before command line arguments depending on how you start the app.

For YouTube & Twitcasting (soon:tm:), you'll need to expose an external IP/adress for WebHook messages. This is configurable in your **config.toml**.

## Contributing
*Good luck*. I am open to PRs & issues tho. If you run into problems or have questions, you can find me on PRISMcord as Sir Eatsalot.