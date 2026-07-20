import type { ContainerBuilder } from "discord.js";

import { ViewFactory } from "./ViewFactory.js";

export type AlertTone =
  | "information"
  | "success"
  | "warning"
  | "error";

const AlertColors: Readonly<Record<AlertTone, number>> = {
  information: 0x5865f2,
  success: 0x23a55a,
  warning: 0xf0b232,
  error: 0xda373c,
};

const AlertLabels: Readonly<Record<AlertTone, string>> = {
  information: "Vora Information",
  success: "Action Completed",
  warning: "Action Required",
  error: "Something Went Wrong",
};

export function createAlertView(
  tone: AlertTone,
  title: string,
  description: string,
): ContainerBuilder {
  return ViewFactory.createContainer(AlertColors[tone])
    .addTextDisplayComponents(
      ViewFactory.heading(
        AlertLabels[tone],
        title,
        description,
      ),
    )
    .addTextDisplayComponents(ViewFactory.footer());
}
