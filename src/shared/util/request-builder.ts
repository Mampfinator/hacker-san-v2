import axios, { Method } from "axios";
import { join } from "path";

export class RequestBuilder {
    private method: Method = "GET";
    private readonly params: Record<string, string> = {};
    private readonly headers: Record<string, string> = {};
    private url: string;
    
    constructor(
        baseUrl: string,
    ) {
        this.url = baseUrl;
    }

    public setMethod(method: Method): this {
        this.method = method;
        return this;
    }
    
    public addParam(key: string, value: string): this {
        this.params[key] = value;
        return this;
    }

    public addParams(params: Record<string, string>): this {
        Object.assign(this.params, params);
        return this;
    }

    public addHeader(key: string, value: string): this {
        this.headers[key] = value;
        return this;
    }

    public setAuth(token: string): this {
        this.addHeader("Authorization", `Bearer ${token}`);
        return this;
    }

    public setBasicAuth(clientId: string, secret: string): this {
        this.addHeader("Authorization", `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`);
        return this;
    }

    public setPath(path: string): this {
        this.url = join(this.url, path);
        return this;
    }
    
    public send(): Promise<any> {
        return axios({
            method: this.method,
            url: this.url,
            params: this.params,
            headers: this.headers,
        });
    }
}