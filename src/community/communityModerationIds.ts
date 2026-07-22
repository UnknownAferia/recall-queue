const CaseActionPrefix = "community:moderation:case";
const MessageReportPrefix = "community:report:message";
const UserReportPrefix = "community:report:user";

export type CommunityCaseButtonAction = "confirm" | "cancel";

export function createCommunityCaseButtonId(
  action: CommunityCaseButtonAction,
  caseId: string,
): string {
  return `${CaseActionPrefix}:${action}:${caseId}`;
}

export function parseCommunityCaseButtonId(
  customId: string,
): { action: CommunityCaseButtonAction; caseId: string } | null {
  const match = customId.match(
    /^community:moderation:case:(confirm|cancel):([a-f\d]{24})$/i,
  );

  return match
    ? {
        action: match[1] as CommunityCaseButtonAction,
        caseId: match[2]!,
      }
    : null;
}

export function createMessageReportModalId(
  channelId: string,
  messageId: string,
): string {
  return `${MessageReportPrefix}:${channelId}:${messageId}`;
}

export function createUserReportModalId(targetDiscordId: string): string {
  return `${UserReportPrefix}:${targetDiscordId}`;
}

export type ParsedCommunityReportModal =
  | { type: "message"; channelId: string; messageId: string }
  | { type: "user"; targetDiscordId: string };

export function parseCommunityReportModalId(
  customId: string,
): ParsedCommunityReportModal | null {
  const message = customId.match(
    /^community:report:message:(\d{17,20}):(\d{17,20})$/,
  );

  if (message) {
    return {
      type: "message",
      channelId: message[1]!,
      messageId: message[2]!,
    };
  }

  const user = customId.match(/^community:report:user:(\d{17,20})$/);

  return user ? { type: "user", targetDiscordId: user[1]! } : null;
}
