import { createHash } from "crypto";
import { Cookie } from "tough-cookie";

export const sleep = (ms: number) =>
    new Promise<void>(res => setTimeout(res, ms));

export const calculateSapisidHash = (SAPISID: Cookie): string => {
    const time = `${Math.round(new Date().getTime() / 1000)}`;
    const hash = `SAPISIDHASH ${time}_${createHash("sha1")
        .update(Buffer.from(time))
        .update(Buffer.from(SAPISID.value))
        .update(Buffer.from("https://www.youtube.com"))
        .digest("hex")}`;

    return hash;
};
