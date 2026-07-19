import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createMainMenuComponents } from "../../ui/createMainMenuComponents.js";
import { createMainMenuEmbed } from "../../ui/createMainMenuEmbed.js";

const button: Button = {
  customId: CustomIds.buttons.navigation.mainMenu,

  async execute(client, interaction): Promise<void> {
    const player =
      await client.services.player.getByDiscordId(
        interaction.user.id,
      );

    await interaction.update({
      embeds: [createMainMenuEmbed(player)],
      components: player ? createMainMenuComponents() : [],
    });
  },
};

export default button;