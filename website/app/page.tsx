const discordInvite = "https://discord.gg/voramlbb";

const roles = [
  { name: "EXP", marker: "E", accent: "cyan" },
  { name: "Jungle", marker: "J", accent: "blue" },
  { name: "Mid", marker: "M", accent: "violet" },
  { name: "Gold", marker: "G", accent: "gold" },
  { name: "Roam", marker: "R", accent: "emerald" },
] as const;

const steps = [
  {
    number: "01",
    title: "Build your player identity",
    description:
      "Register your MLBB account, verify it once and choose the roles you actually want to play.",
  },
  {
    number: "02",
    title: "Enter the teammate pool",
    description:
      "Join the Discord voice lobby when you are ready. Vora looks for four compatible players.",
  },
  {
    number: "03",
    title: "Accept your squad",
    description:
      "A ready check confirms everyone is present before roles and a private squad room are revealed.",
  },
  {
    number: "04",
    title: "Queue together in MLBB",
    description:
      "Your five-player squad enters Mobile Legends together and plays against opponents found by the game.",
  },
] as const;

const principles = [
  {
    eyebrow: "ROLE FIT",
    title: "Every role has a player",
    description:
      "Primary, secondary and avoided roles shape each squad so five carries do not become somebody else's problem.",
  },
  {
    eyebrow: "COMPETITIVE SIGNAL",
    title: "Skill without stat theatre",
    description:
      "RSR, confidence and verified outcomes guide matchmaking. KDA is never invented or scraped from an unavailable API.",
  },
  {
    eyebrow: "RELIABILITY",
    title: "People who show up",
    description:
      "Ready-check history, behavior and integrity safeguards help protect every player's time.",
  },
] as const;

export default function Home() {
  return (
    <main>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Vora home">
          <img src="/brand/vora-mark.png" alt="" width="42" height="42" />
          <span>VORA</span>
        </a>

        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#why-vora">Why Vora</a>
          <a href="#faq">FAQ</a>
        </div>

        <a
          className="button button-small button-outline"
          href={discordInvite}
          target="_blank"
          rel="noreferrer"
        >
          Join Discord
        </a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />

        <div className="hero-content page-shell">
          <div className="availability">
            <span className="availability-dot" />
            Live on Discord
          </div>

          <h1>
            Find your five.
            <br />
            <span>Play as one.</span>
          </h1>

          <p className="hero-copy">
            Vora forms compatible five-player Mobile Legends squads around
            role fit, skill and reliability—without another app to install.
          </p>

          <div className="hero-actions">
            <a
              className="button button-primary"
              href={discordInvite}
              target="_blank"
              rel="noreferrer"
            >
              Find your squad
              <span aria-hidden="true">↗</span>
            </a>
            <a className="text-link" href="#how-it-works">
              See how it works
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <div className="hero-stats" aria-label="Product highlights">
          <div>
            <strong>5</strong>
            <span>players per squad</span>
          </div>
          <div>
            <strong>5</strong>
            <span>distinct MLBB roles</span>
          </div>
          <div>
            <strong>0</strong>
            <span>extra apps required</span>
          </div>
        </div>
      </section>

      <section className="section page-shell" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">FROM DISCORD TO DRAFT</p>
          <h2>One clear path to a better team.</h2>
          <p>
            Vora handles the awkward part before the game: finding people,
            confirming they are present and giving everyone a role.
          </p>
        </div>

        <ol className="steps">
          {steps.map((step) => (
            <li key={step.number}>
              <span className="step-number">{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="roles-section">
        <div className="page-shell roles-layout">
          <div>
            <p className="eyebrow">BUILT FOR 5-MAN QUEUE</p>
            <h2>A lineup with intention.</h2>
            <p className="section-copy">
              Tell Vora where you are strongest. The formation engine weighs
              role preferences across the entire pool and creates a complete
              lineup—not a random group of five.
            </p>
            <a
              className="text-link text-link-bright"
              href={discordInvite}
              target="_blank"
              rel="noreferrer"
            >
              Set up your role identity
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="role-orbit" aria-label="Five Mobile Legends roles">
            <div className="role-grid">
              {roles.map((role) => (
                <div className={`role-card ${role.accent}`} key={role.name}>
                  <span aria-hidden="true">{role.marker}</span>
                  <strong>{role.name}</strong>
                </div>
              ))}
            </div>
            <div className="squad-ready">
              <span className="ready-light" />
              5 / 5 &nbsp; SQUAD READY
            </div>
          </div>
        </div>
      </section>

      <section className="section page-shell" id="why-vora">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">WHY VORA</p>
            <h2>Matchmaking that respects the human behind the rating.</h2>
          </div>
          <p>
            Good teams need more than similar numbers. Vora combines
            competitive signals with the things that make a squad usable.
          </p>
        </div>

        <div className="principle-grid">
          {principles.map((principle, index) => (
            <article key={principle.eyebrow}>
              <div className="principle-index">0{index + 1}</div>
              <p className="eyebrow">{principle.eyebrow}</p>
              <h3>{principle.title}</h3>
              <p>{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="integrity-section">
        <div className="page-shell integrity-layout">
          <div className="integrity-mark" aria-hidden="true">
            <span>V</span>
          </div>
          <div>
            <p className="eyebrow">BUILT ON TRUST</p>
            <h2>Real results. Clear rules. Human review.</h2>
          </div>
          <p>
            Mobile Legends has no public match-data API for Vora. Results are
            supported by screenshots, squad confirmation and audited
            Operations review—never fabricated data.
          </p>
        </div>
      </section>

      <section className="section page-shell faq-section" id="faq">
        <div className="section-heading">
          <p className="eyebrow">THE SHORT VERSION</p>
          <h2>Before you queue.</h2>
        </div>

        <div className="faq-grid">
          <details>
            <summary>Does Vora create internal 5v5 matches?</summary>
            <p>
              No. Vora builds your five-player team. Your squad then queues
              together in Mobile Legends and Moonton finds the opposing team.
            </p>
          </details>
          <details>
            <summary>Do I need to download anything?</summary>
            <p>
              No. Registration, preferences, queueing, ready checks and squad
              coordination all happen inside Discord.
            </p>
          </details>
          <details>
            <summary>How does Vora know my skill level?</summary>
            <p>
              Verified match outcomes update your Ranked Skill Rating. Rating
              confidence keeps new-player movement responsive and established
              ratings stable.
            </p>
          </details>
          <details>
            <summary>Can I choose my role?</summary>
            <p>
              Yes. Every profile includes a primary role, secondary role and
              optional avoided role. Vora considers all five players together
              when assigning the final lineup.
            </p>
          </details>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-glow" aria-hidden="true" />
        <div className="page-shell">
          <p className="eyebrow">YOUR NEXT TEAM IS ON DISCORD</p>
          <h2>Stop searching one teammate at a time.</h2>
          <p>Register once. Choose your roles. Let Vora find the five.</p>
          <a
            className="button button-primary"
            href={discordInvite}
            target="_blank"
            rel="noreferrer"
          >
            Join Vora on Discord
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="page-shell footer-content">
          <a className="brand" href="#top" aria-label="Vora home">
            <img src="/brand/vora-mark.png" alt="" width="36" height="36" />
            <span>VORA</span>
          </a>
          <p>Built for better teams.</p>
          <p>Discord-first teammate formation for Mobile Legends.</p>
        </div>
      </footer>
    </main>
  );
}
