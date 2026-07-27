const footerGroups = [
  {
    title: "Product",
    links: [
      { href: "/how-it-works", label: "How Vora works" },
      { href: "/rating", label: "RSR & divisions" },
      { href: "/seasons", label: "Seasons" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/support", label: "Support" },
      { href: "https://discord.gg/voramlbb", label: "Discord" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-main">
        <div className="footer-brand">
          <a className="brand" href="/" aria-label="Vora home">
            <img src="/brand/vora-mark.png" alt="" width="38" height="38" />
            <span>VORA</span>
          </a>
          <p>
            Discord-first teammate formation for Mobile Legends.
            <br />
            Built for better teams.
          </p>
        </div>

        <div className="footer-links">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <strong>{group.title}</strong>
              {group.links.map((link) => (
                <a href={link.href} key={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="page-shell footer-meta">
        <span>© 2026 Vora</span>
        <span>
          Independent community project. Not affiliated with Moonton.
        </span>
      </div>
    </footer>
  );
}
