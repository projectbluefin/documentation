import React from "react";
import Link from "@docusaurus/Link";
import styles from "./HiveSnapshot.module.css";

/** The hive instance whose read-only snapshot this links to. */
const SNAPSHOT_URL =
  "https://hosted-projectbluefin-common-nmq5.hive.kubestellar.io/snapshot";

/**
 * A link to the hive's own read-only dashboard snapshot.
 *
 * This is a link and not an `<iframe>`, and that is not a preference.
 * The hive serves every route through one security middleware
 * (`v2/pkg/dashboard/server.go:securityHeaders`, and the same in
 * `v2/proxy/server.js`) which sets:
 *
 *     X-Frame-Options: DENY
 *     Content-Security-Policy: … frame-ancestors 'none'
 *
 * unconditionally, with no per-route exemption and no configuration knob.
 * Verified against the live instance on 2026-08-08. A browser will refuse to
 * render it in a frame, so an embed would be a blank box.
 *
 * The alternatives are worse than a link: the JSON APIs under /api/ require a
 * session and answer 302 to an anonymous request, and re-hosting the page
 * server-side would mean stripping the hive's own security headers and serving
 * a stale copy of live data under our origin.
 *
 * Tracked upstream as kubestellar/hive#3014. When framing is allowed for this
 * origin, this component becomes the iframe.
 */
export default function HiveSnapshot(): React.JSX.Element {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>Full hive dashboard</h2>
        <Link className={styles.cta} to={SNAPSHOT_URL}>
          Open the live snapshot →
        </Link>
      </div>
      <p className={styles.body}>
        The hive publishes a read-only snapshot of its own dashboard — the
        complete operator view, with every agent, task and advisory the
        orchestrator is tracking. What you see above is the summary this site
        derives from the same hive; the snapshot is the source.
      </p>
      <p className={styles.note}>
        It opens in the hive rather than inside this page: the hive sends{" "}
        <code>frame-ancestors &apos;none&apos;</code> on every route, so a
        browser will not render it in a frame. Allowing this origin is tracked
        as{" "}
        <Link to="https://github.com/kubestellar/hive/issues/3014">
          kubestellar/hive#3014
        </Link>
        .
      </p>
    </section>
  );
}
