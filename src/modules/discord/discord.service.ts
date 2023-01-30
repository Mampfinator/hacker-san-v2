import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DiscordConfig } from "../config/config";
import { DiscordClientService } from "./discord-client.service";

@Injectable()
export class DiscordService {}
