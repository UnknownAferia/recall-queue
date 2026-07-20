import { CustomIds } from "../../constants/customIds.js";
import type { StringSelectMenu } from "../../interfaces/StringSelectMenu.js";
import { handleRolePreferenceSelection } from "../../utils/handleRolePreferenceSelection.js";

const selectMenu: StringSelectMenu = {
  customId:
    CustomIds.selectMenus.rolePreferences.primary,

  async execute(client, interaction): Promise<void> {
    await handleRolePreferenceSelection(
      client,
      interaction,
      "primary",
    );
  },
};

export default selectMenu;