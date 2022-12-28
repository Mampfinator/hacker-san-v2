import { TriggerActionsCommand } from "../commands/trigger-actions.command";
import { Util } from "../../../util"

export namespace ActionUtil {
    export function interpolate(
        base: string,
        { options }: TriggerActionsCommand,
    ) {
        const { url: link, channelId } = options;

        const dict = {
            link,
            channelId,
        };

        return Util.interpolate(base, dict);
    }
}
