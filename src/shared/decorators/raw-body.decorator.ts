import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export const RawBody = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.rawBody;
    }
)