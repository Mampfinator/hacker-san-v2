import { ActionType, IActionType } from "../action";
import { ActionUtil } from "../util";

@ActionType("echo")
export class EchoAction implements IActionType {
    async execute({ data, channel, command }) {
        const { message } = data as { message: string };

        if (channel.isText()) {
            await channel.send(ActionUtil.interpolate(message, command));
        }
    }
}
