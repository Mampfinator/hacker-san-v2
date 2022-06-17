import { Injectable } from "@nestjs/common";
import { ActionType, IActionType } from "../action";

@Injectable()
@ActionType("rename")
export class RenameAction implements IActionType {
    async execute({data, command, channel}) {
        const {name} = data as {name: string};
        await channel.setName(name);
    }
}