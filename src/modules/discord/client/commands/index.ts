// We need to import commands *somewhere* so the SlashCommand decorator can run.
// Maybe find a way to dynamically import commands?
// Might run into side effect prevention issues tho.

import "./info.command";
import "./action.command";
import "./help.command";
import "./settings.command";
import "./overview.command";
