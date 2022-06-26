import { Injectable } from "@nestjs/common";
import { ActionType, IActionType } from "../action";
import { ActionUtil } from "../util";

//@Injectable()
@ActionType("echo")
export class EchoAction implements IActionType {
    async execute({ data, channel, command }) {
        const { message } = data as { message: string };

        if (channel.isText()) {
            await channel.send(ActionUtil.interpolate(message, command));
        }
    }
}
