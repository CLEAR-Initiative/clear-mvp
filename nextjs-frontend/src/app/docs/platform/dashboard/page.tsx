import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "Dashboard — CLEAR Docs" };

export default function DashboardPage() {
  return (
    <DocsPage
      title="Dashboard"
      description="Your command center for humanitarian operations — monitor active crises, track pending decisions, and stay ahead of emerging alerts from a single screen."
      badge="PLATFORM"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        The CLEAR dashboard is the first screen you see after signing in, and it
        is designed to answer the most urgent question in any crisis:{" "}
        <em>what needs my attention right now?</em> Rather than forcing you to
        navigate through multiple menus to piece together the operational
        picture, the dashboard consolidates the most critical information into
        one view so your team can orient quickly and act decisively.
      </p>
      <p>
        Everything on the dashboard updates in real time. When a colleague
        records a new decision, when an alert fires from a live data feed, or
        when a crisis status changes, you will see it reflected here without
        refreshing the page.
      </p>

      <DocsH2 id="summary-cards">Summary cards</DocsH2>
      <p>
        At the top of the dashboard, a row of summary cards provides at-a-glance
        metrics for the numbers that matter most:
      </p>
      <table>
        <thead>
          <tr>
            <th>Card</th>
            <th>What it shows</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Active Crises</strong></td>
            <td>
              The total number of crises with a status of ACTIVE or ESCALATING.
              This tells you how many situations are currently demanding
              operational resources.
            </td>
          </tr>
          <tr>
            <td><strong>Pending Decisions</strong></td>
            <td>
              Decisions that have been recorded but do not yet have a confirmed
              outcome. These represent open questions your team still needs to
              resolve or verify.
            </td>
          </tr>
          <tr>
            <td><strong>Active Alerts</strong></td>
            <td>
              Unresolved alerts across all crises. Alerts may originate from
              live data feeds, field reports, or manual entries — each one
              signals a condition that warrants review.
            </td>
          </tr>
        </tbody>
      </table>
      <InfoBox type="tip">
        Click any summary card to jump directly to the relevant filtered list.
        For example, clicking <strong>Active Crises</strong> takes you to the
        crisis list filtered to show only active and escalating events.
      </InfoBox>

      <DocsH2 id="recent-decisions">Recent decisions</DocsH2>
      <p>
        Below the summary cards, the <strong>Recent Decisions</strong> list
        displays the latest decisions recorded across all crises. Each entry
        shows the decision title, the crisis it belongs to, the confidence score
        assigned by the decision-maker, and a timestamp. This gives leadership
        and coordination staff a running log of what choices are being made in
        the field and at headquarters — essential for situational awareness and
        accountability.
      </p>
      <p>
        Click any decision to open its full detail view, where you can review
        the options that were considered (A, B, and C), the rationale, and — if
        the decision has been closed — the recorded outcome.
      </p>

      <DocsH2 id="recent-alerts">Recent alerts</DocsH2>
      <p>
        The <strong>Recent Alerts</strong> list surfaces the newest alerts across
        the platform, ordered by time. Each alert displays its severity level,
        the linked crisis, and its current state (active, resolved, or
        dismissed). This section is designed to ensure that no early warning goes
        unnoticed, even if it was raised while you were away from the platform.
      </p>
      <InfoBox type="info">
        Alerts are distinct from decisions. An alert signals a condition or
        event that may require action; a decision records the action your team
        chose to take. Together, they form a traceable chain from warning to
        response.
      </InfoBox>

      <DocsH2 id="navigation">Navigating from the dashboard</DocsH2>
      <p>
        The dashboard is intentionally a starting point, not a destination. From
        here, you can reach every major feature in CLEAR:
      </p>
      <ul>
        <li>
          <Link href="/docs/platform/crises">
            <strong>Crisis Management</strong>
          </Link>{" "}
          — Click a crisis name or the Active Crises card to drill into the
          full crisis list, where you can filter, search, and open individual
          crisis detail pages.
        </li>
        <li>
          <Link href="/docs/platform/map">
            <strong>Interactive Map</strong>
          </Link>{" "}
          — Open the map view from the sidebar to see all crises plotted
          geographically with severity-based coloring.
        </li>
        <li>
          <strong>Decisions &amp; Alerts</strong> — Click any recent decision or
          alert to jump directly to its detail page and linked crisis.
        </li>
      </ul>

      <DocsH3 id="keyboard-shortcuts">Quick access</DocsH3>
      <p>
        The sidebar navigation is always available on the left side of the
        screen. Use it to move between the dashboard, crisis list, map, data
        feeds, assessments, referrals, and administration pages. On smaller
        screens, the sidebar collapses into a hamburger menu to preserve space
        for the content that matters.
      </p>

      <InfoBox type="tip">
        If your organization tracks a large number of crises, pay special
        attention to the <strong>Pending Decisions</strong> count. A rising
        number of unresolved decisions can indicate that your team is
        overwhelmed and may need additional support or clearer delegation.
      </InfoBox>
    </DocsPage>
  );
}
