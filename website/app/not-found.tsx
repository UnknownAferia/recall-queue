import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";

export default function NotFound() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <section className="not-found page-shell">
        <p className="eyebrow">ERROR 404</p>
        <h1>This route never found its five.</h1>
        <p>
          The page may have moved, or the address may be incomplete. Return to
          Vora and continue from the main path.
        </p>
        <a className="button button-primary" href="/">
          Return home
          <span aria-hidden="true">→</span>
        </a>
      </section>
      <SiteFooter />
    </main>
  );
}
