import { ActionType, IActionType } from "../action";

@ActionType("rename")
export class RenameAction implements IActionType {
    async execute({ data, channel }) {
        const { name } = data as { name: string };
        await channel.setName(name);
    }
}
