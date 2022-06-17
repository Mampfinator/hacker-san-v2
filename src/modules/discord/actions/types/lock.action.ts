import { Injectable } from "@nestjs/common";
import { ActionType, IActionType } from "../action";

@Injectable()
@ActionType("lock")
export class LockAction implements IActionType {
    async execute({command, channel, data}) {
        const {mode} = data as {mode: "lock" | "unlock"};
        const permission = mode === "lock" ? false : null;
        await channel.permissionOverwrites.create(channel.guildId, {SEND_MESSAGES: permission});
    }
}