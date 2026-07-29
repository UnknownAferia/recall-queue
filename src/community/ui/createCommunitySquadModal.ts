import {
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import {
  CommunitySquadRegionLabels,
  CommunitySquadRegions,
} from "../../constants/communitySquad.js";
import { CommunityCustomIds } from "../../constants/community.js";
import type { CommunitySquadDashboard } from "../../types/communitySquad.js";

function textInput(
  customId: string,
  style: TextInputStyle,
  minimumLength: number,
  maximumLength: number,
  required: boolean,
  placeholder: string,
  value?: string | null,
) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setStyle(style)
    .setMinLength(minimumLength)
    .setMaxLength(maximumLength)
    .setRequired(required)
    .setPlaceholder(placeholder);
  if (value) {
    input.setValue(value);
  }
  return input;
}

export function createCommunitySquadProfileModal(
  squad?: CommunitySquadDashboard,
): ModalBuilder {
  const region = new StringSelectMenuBuilder()
    .setCustomId(CommunityCustomIds.squad.inputs.region)
    .setPlaceholder("Choose the server region your squad plays on")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      CommunitySquadRegions.map((value) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(CommunitySquadRegionLabels[value])
          .setValue(value)
          .setDefault(squad?.region === value),
      ),
    );

  return new ModalBuilder()
    .setCustomId(
      squad
        ? CommunityCustomIds.squad.editModal
        : CommunityCustomIds.squad.createModal,
    )
    .setTitle(squad ? "Edit Vora Squad" : "Create Vora Squad")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Squad name")
        .setDescription("The public name shown to players and scrim opponents.")
        .setTextInputComponent(
          textInput(
            CommunityCustomIds.squad.inputs.name,
            TextInputStyle.Short,
            2,
            40,
            true,
            "Example: Celestial Five",
            squad?.name,
          ),
        ),
      new LabelBuilder()
        .setLabel("Short tag (optional)")
        .setDescription("Two to five letters. Vora creates one if left empty.")
        .setTextInputComponent(
          textInput(
            CommunityCustomIds.squad.inputs.tag,
            TextInputStyle.Short,
            0,
            5,
            false,
            "Example: C5",
            squad?.tag,
          ),
        ),
      new LabelBuilder()
        .setLabel("Region")
        .setDescription("Used for recruitment and future scrim suggestions.")
        .setStringSelectMenuComponent(region),
      new LabelBuilder()
        .setLabel("Short introduction (optional)")
        .setDescription("Tell recruits what your squad values or plays for.")
        .setTextInputComponent(
          textInput(
            CommunityCustomIds.squad.inputs.description,
            TextInputStyle.Paragraph,
            0,
            240,
            false,
            "Example: Friendly ranked squad looking for reliable evenings.",
            squad?.description,
          ),
        ),
    );
}

export function createCommunitySquadJoinModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(CommunityCustomIds.squad.joinModal)
    .setTitle("Join a Vora Squad")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Squad invite code")
        .setDescription("Ask the captain to copy the current code from /squad.")
        .setTextInputComponent(
          textInput(
            CommunityCustomIds.squad.inputs.inviteCode,
            TextInputStyle.Short,
            8,
            9,
            true,
            "Example: A1B2-C3D4",
          ),
        ),
    );
}
