import { ActionPayload, ActionType, IActionType } from "../action";

@ActionType("rename")
export class RenameAction implements IActionType {
    async execute({ data, channel }: ActionPayload) {
        const { name } = data as { name: string };
        await channel.setName(name);
    }
}
