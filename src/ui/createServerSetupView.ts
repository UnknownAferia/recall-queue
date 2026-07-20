import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import type { GuildSetupPlan } from "../domain/guildSetup/GuildSetupPlanner.js";
import { ViewFactory } from "./ViewFactory.js";

function formatItems(
  heading: string,
  items: readonly { readonly name: string }[],
): string {
  if (items.length === 0) {
    return `### ${heading}\n> Nothing to create`;
  }

  return [
    `### ${heading}  ·  ${items.length}`,
    items.map((item) => `> ${item.name}`).join("\n"),
  ].join("\n");
}

function formatRenames(
  items: readonly {
    readonly currentName: string;
    readonly name: string;
  }[],
): string {
  if (items.length === 0) {
    return "### Brand Migration\n> Nothing to rename";
  }

  return [
    `### Brand Migration  ·  ${items.length}`,
    items
      .map((item) => `> ${item.currentName}  →  ${item.name}`)
      .join("\n"),
  ].join("\n");
}

export function createServerSetupView(
  guildName: string,
  plan: GuildSetupPlan,
  applied = false,
): ContainerBuilder {
  const status = plan.isComplete
    ? "The Vora server blueprint is fully installed."
    : "Review the planned additions and permission repairs before applying the setup.";

  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.serverSetup.refresh)
      .setLabel("Refresh Preview")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.serverSetup.apply)
      .setLabel("Apply Setup")
      .setEmoji("✨")
      .setStyle(ButtonStyle.Success)
      .setDisabled(plan.isComplete),
  );

  return ViewFactory.createContainer(plan.isComplete ? 0x23a55a : 0x5865f2)
    .addTextDisplayComponents(
      ViewFactory.heading(
        `Server Blueprint v${plan.blueprintVersion}`,
        "Vora Server Setup",
        `**${guildName}**\n${status}`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          applied && plan.isComplete
            ? "### ✅ Setup completed successfully"
            : null,
          formatItems("Roles", plan.rolesToCreate),
          formatItems("Categories", plan.categoriesToCreate),
          formatItems("Channels", plan.channelsToCreate),
          formatRenames(plan.renamesRequired),
          formatItems("Permissions & Role Settings", plan.repairsRequired),
        ]
          .filter((entry): entry is string => Boolean(entry))
          .join("\n\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(actions)
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Existing server resources are never deleted by this setup.",
      ),
    );
}
