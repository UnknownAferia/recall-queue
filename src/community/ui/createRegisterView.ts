import type { ContainerBuilder } from "discord.js";

import { ViewFactory } from "../../ui/ViewFactory.js";

export function createRegisterView(): ContainerBuilder {
  return ViewFactory.createContainer(0x9b59b6)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Verification",
        "Registration",
        "Vora requires your MLBB ID and Server Region to function.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### The First Step",
          "Use ```/register``` to open up our registration form.",
          ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Vora is an independent community project and is not affiliated with Moonton.",
      ),
    );
}
