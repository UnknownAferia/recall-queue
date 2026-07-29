const navigation = [
  { href: "/live", label: "Live" },
  { href: "/status", label: "Status" },
  { href: "/squads", label: "Squads" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/rating", label: "Rating" },
  { href: "/seasons", label: "Seasons" },
  { href: "/updates", label: "Updates" },
  { href: "/faq", label: "FAQ" },
] as const;

interface SiteHeaderProps {
  readonly overlay?: boolean;
}

export function SiteHeader({ overlay = false }: SiteHeaderProps) {
  return (
    <nav
      className={`site-nav${overlay ? "" : " site-nav-static"}`}
      aria-label="Primary navigation"
    >
      <a className="brand" href="/" aria-label="Vora home">
        <img src="/brand/vora-mark.png" alt="" width="42" height="42" />
        <span>VORA</span>
      </a>

      <div className="nav-links">
        {navigation.map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </div>

      <div className="nav-actions">
        <a
          className="button button-small button-outline"
          href="/get-started"
        >
          Get started
        </a>

        <details className="mobile-menu">
          <summary aria-label="Open navigation">Menu</summary>
          <div className="mobile-menu-panel">
            {navigation.map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
            <a href="/get-started">Get started</a>
            <a href="/support">Support</a>
          </div>
        </details>
      </div>
    </nav>
  );
}
