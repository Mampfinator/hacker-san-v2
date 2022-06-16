import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { XMLParser,  X2jOptions } from "fast-xml-parser";

export const XML = createParamDecorator(
    (data: Partial<X2jOptions> | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const parser = new XMLParser(data);
        return parser.parse(request.body);
    }
)