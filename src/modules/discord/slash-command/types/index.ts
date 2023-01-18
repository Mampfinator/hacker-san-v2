import { ActionCommand } from "./action.command";
import { HelpCommand } from "./help.command";
import { PutMeToSleepCommand } from "./put-me-to-sleep.command";
import { QuickSetupCommand } from "./quick-setup/quick-setup.command";

export const SlashCommands = [HelpCommand, PutMeToSleepCommand, ActionCommand, QuickSetupCommand];
