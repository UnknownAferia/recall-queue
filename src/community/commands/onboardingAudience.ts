import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { createAlertView } from "../../ui/createAlertView.js";
import type { CommunityClient } from "../CommunityClient.js";
import { OnboardingAudienceError } from "../errors/OnboardingAudienceError.js";
import { createOnboardingAudienceView } from "../ui/createOnboardingAudienceView.js";

export const OnboardingAudienceCommandName = "onboarding-audience";

export const onboardingAudienceCommandData = new SlashCommandBuilder()
  .setName(OnboardingAudienceCommandName)
  .setDescription("Manage accounts excluded from Vora onboarding")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("exclude-role")
      .setDescription("Exclude the current human members of a role")
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Take a one-time snapshot of this role")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Why these accounts are outside the player audience")
          .setMinLength(3)
          .setMaxLength(300),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("exclude-member")
      .setDescription("Exclude one member from automated onboarding")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member to exclude")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Why this account is outside the player audience")
          .setMinLength(3)
          .setMaxLength(300),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("restore-member")
      .setDescription("Return one excluded member to automated onboarding")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member to restore")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("List active onboarding exclusions"),
  );

export async function executeOnboardingAudienceCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    return;
  }

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      components: [
        createAlertView(
          "warning",
          "Operations Access Required",
          "Only members with Manage Server can change the onboarding audience.",
        ),
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
    return;
  }

  await interaction.reply({
    components: [
      createAlertView(
        "information",
        "Updating Onboarding Audience",
        "Vora Community is applying the requested audience change.",
      ),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });

  try {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "exclude-role") {
      const role = interaction.options.getRole("role", true);
      const count = await client.onboarding.excludeRole(
        interaction.guild,
        role.id,
        interaction.user.id,
        interaction.options.getString("reason") ?? undefined,
      );

      await interaction.editReply({
        components: [
          createAlertView(
            "success",
            "Audience Updated",
            `${count} current human member(s) of **${role.name}** are now excluded from onboarding metrics and reminders. Future members of the role are not excluded automatically.`,
          ),
        ],
      });
      return;
    }

    if (subcommand === "exclude-member") {
      const user = interaction.options.getUser("member", true);
      const member = await interaction.guild.members.fetch(user.id);
      await client.onboarding.excludeMember(
        member,
        interaction.user.id,
        interaction.options.getString("reason") ?? undefined,
      );

      await interaction.editReply({
        components: [
          createAlertView(
            "success",
            "Member Excluded",
            `<@${user.id}> is no longer included in onboarding metrics or reminders.`,
          ),
        ],
      });
      return;
    }

    if (subcommand === "restore-member") {
      const user = interaction.options.getUser("member", true);
      const restored = await client.onboarding.restoreMember(
        interaction.guildId,
        user.id,
        interaction.user.id,
      );

      await interaction.editReply({
        components: [
          createAlertView(
            restored ? "success" : "information",
            restored ? "Member Restored" : "No Active Exclusion",
            restored
              ? `<@${user.id}> is eligible for onboarding again.`
              : `<@${user.id}> was not excluded from onboarding.`,
          ),
        ],
      });
      return;
    }

    const exclusions = await client.onboarding.listExclusions(
      interaction.guildId,
    );
    await interaction.editReply({
      components: [createOnboardingAudienceView(exclusions)],
    });
  } catch (error: unknown) {
    if (error instanceof OnboardingAudienceError) {
      await interaction.editReply({
        components: [
          createAlertView(
            "warning",
            "Audience Update Unavailable",
            error.message,
          ),
        ],
      });
      return;
    }

    throw error;
  }
}
