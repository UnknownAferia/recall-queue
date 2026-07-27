import {
  discordCtaHref,
  type DiscordCtaSource,
} from "../lib/websiteAnalytics";

interface DiscordCtaProps {
  readonly source: DiscordCtaSource;
}

export function DiscordCta({ source }: DiscordCtaProps) {
  return (
    <section className="final-cta compact-cta">
      <div className="final-glow" aria-hidden="true" />
      <div className="page-shell">
        <p className="eyebrow">YOUR NEXT TEAM IS ON DISCORD</p>
        <h2>Ready to find your five?</h2>
        <p>Register once, verify your identity and tell Vora how you play.</p>
        <a
          className="button button-primary"
          href={discordCtaHref(source)}
          target="_blank"
          rel="noreferrer"
        >
          Join Vora on Discord
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
