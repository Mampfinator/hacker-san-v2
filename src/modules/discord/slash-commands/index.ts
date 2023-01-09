// We need to import commands *somewhere* so the SlashCommand decorator can run.
// Maybe find a way to dynamically import commands?
// Might run into side effect prevention issues tho.

import "./types/info.command";
import "./types/action.command";
import "./types/help.command";
import "./types/settings.command";
import "./types/overview.command";
import "./types/quick-setup.command";
