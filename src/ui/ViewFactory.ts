import {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import { BotConfig } from "../config/bot.js";

export class ViewFactory {
  public static createContainer(
    accentColor: number = BotConfig.embedColor,
  ): ContainerBuilder {
    return new ContainerBuilder().setAccentColor(accentColor);
  }

  public static heading(
    eyebrow: string,
    title: string,
    description?: string,
  ): TextDisplayBuilder {
    return new TextDisplayBuilder().setContent(
      [
        `-# ${eyebrow.toUpperCase()}`,
        `# ${title}`,
        description,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n"),
    );
  }

  public static text(content: string): TextDisplayBuilder {
    return new TextDisplayBuilder().setContent(content);
  }

  public static separator(
    spacing: SeparatorSpacingSize = SeparatorSpacingSize.Small,
  ): SeparatorBuilder {
    return new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(spacing);
  }

  public static footer(note?: string): TextDisplayBuilder {
    return new TextDisplayBuilder().setContent(
      [
        note ? `-# ${note}` : null,
        `-# ${BotConfig.footer} • v${BotConfig.version}`,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n"),
    );
  }
}
