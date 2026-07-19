import {
  EmbedBuilder,
  type APIEmbedField,
  type ColorResolvable,
} from "discord.js";

import { BotConfig } from "../config/bot.js";

interface BaseEmbedOptions {
  title: string;
  description?: string;
  color?: ColorResolvable;
  fields?: APIEmbedField[];
}

export class EmbedFactory {
  public static create(options: BaseEmbedOptions): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(options.color ?? BotConfig.embedColor)
      .setTitle(options.title)
      .setTimestamp()
      .setFooter({
        text: `${BotConfig.footer} • Version ${BotConfig.version}`,
      });

    if (options.description) {
      embed.setDescription(options.description);
    }

    if (options.fields?.length) {
      embed.addFields(options.fields);
    }

    return embed;
  }

  public static success(
    title: string,
    description: string,
  ): EmbedBuilder {
    return this.create({
      title,
      description,
      color: 0x57f287,
    });
  }

  public static error(
    title: string,
    description: string,
  ): EmbedBuilder {
    return this.create({
      title,
      description,
      color: 0xed4245,
    });
  }

  public static information(
    title: string,
    description: string,
  ): EmbedBuilder {
    return this.create({
      title,
      description,
      color: 0x5865f2,
    });
  }

  public static warning(
    title: string,
    description: string,
  ): EmbedBuilder {
    return this.create({
      title,
      description,
      color: 0xfee75c,
    });
  }
}