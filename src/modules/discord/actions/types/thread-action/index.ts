import { CreateMapHandler } from "./commands/create-map.handler";
import { RemoveMapHandler } from "./commands/remove-map.handler";

export * from "./commands/create-map.command";
export * from "./commands/remove-map.command";
export * from "./temp-channel-map.entity";
export * from "./thread.action";

export const ThreadActionCommandHandlers = [
    RemoveMapHandler,
    CreateMapHandler,
];