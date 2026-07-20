import {
  Client,
  Collection,
  GatewayIntentBits,
} from "discord.js";

import type { Button } from "../interfaces/Button.js";
import type { Command } from "../interfaces/Command.js";
import type { Modal } from "../interfaces/Modal.js";
import type { StringSelectMenu } from "../interfaces/StringSelectMenu.js";
import { ServiceContainer } from "../services/ServiceContainer.js";

export class VoraClient extends Client {
  public readonly commands = new Collection<string, Command>();
  public readonly buttons = new Collection<string, Button>();
  public readonly modals = new Collection<string, Modal>();

  public readonly stringSelectMenus =
    new Collection<string, StringSelectMenu>();

  public readonly services: ServiceContainer;

  public constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    this.services = new ServiceContainer();
  }
}