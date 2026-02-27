import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "Feedback System — CLEAR Docs" };

export default function FeedbackSystemPage() {
  return (
    <DocsPage
      title="Feedback System"
      description="Accountability runs in both directions. CLEAR's built-in feedback system gives every user a direct channel to report issues, suggest improvements, and share observations — without leaving the page they are working on."
      badge="ACCOUNTABILITY"
    >
      <DocsH2 id="why-feedback-matters">Why feedback matters</DocsH2>
      <p>
        Humanitarian platforms are only as good as the people who use them, and
        the people who use them are working under extraordinary pressure. A
        field coordinator entering data from a displacement site does not have
        time to file a support ticket through a separate system. A programme
        manager who notices a confusing workflow should be able to flag it
        immediately, while the frustration — and the context — are still fresh.
      </p>
      <p>
        CLEAR&apos;s feedback system is designed around this reality. It meets
        users where they are: a small floating button in the bottom-right
        corner of every authenticated page. One click opens a feedback panel.
        No navigation, no context-switching, no separate login. The goal is
        to make it so easy to share feedback that people actually do it — and
        in doing so, help the platform evolve alongside the needs of the
        response.
      </p>

      <DocsH2 id="the-feedback-widget">The feedback widget</DocsH2>
      <p>
        The feedback widget appears as a floating button anchored to the
        bottom-right corner of the screen on every authenticated page. It is
        always available but never intrusive — it stays out of the way until
        you need it.
      </p>

      <DocsH3 id="opening-the-widget">Opening the widget</DocsH3>
      <p>
        Clicking the button opens a <strong>Sheet panel</strong> that slides
        in from the side of the screen. The panel contains a compact form
        with the following fields:
      </p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Feedback Type</strong></td>
            <td>
              Select one: <code>General</code>, <code>Bug Report</code>,{" "}
              <code>Feature Request</code>, <code>Page Comment</code>, or{" "}
              <code>Flow Rating</code>. This categorization helps your
              platform team triage and route submissions efficiently.
            </td>
          </tr>
          <tr>
            <td><strong>Feedback Text</strong></td>
            <td>
              A free-text field where the user describes their observation,
              issue, or suggestion. There is no character limit — write as
              much or as little as the situation requires.
            </td>
          </tr>
          <tr>
            <td><strong>Rating</strong> (optional)</td>
            <td>
              A 1-to-5 scale for quick sentiment capture. This is especially
              useful with the <code>Flow Rating</code> type, where a user can
              rate how smooth or painful a particular workflow felt.
            </td>
          </tr>
        </tbody>
      </table>

      <DocsH3 id="automatic-context-capture">Automatic context capture</DocsH3>
      <p>
        When a user submits feedback, CLEAR automatically captures two
        additional pieces of context behind the scenes — no manual input
        required:
      </p>
      <ul>
        <li>
          <strong>Current page URL</strong> — the exact page the user was on
          when they opened the widget. This eliminates the need for users to
          describe where they encountered an issue; the system already knows.
        </li>
        <li>
          <strong>Browser user agent</strong> — device and browser information
          that helps the development team reproduce bugs. If a problem only
          occurs on a particular mobile browser used at a field site, this
          data makes that pattern visible.
        </li>
      </ul>

      <InfoBox type="info">
        Automatic context capture is one of the most important design choices
        in the feedback system. When a field officer reports that
        &quot;the map is not loading,&quot; the platform team immediately
        knows which page, which browser, and which device — without a
        back-and-forth conversation that costs time neither party has.
      </InfoBox>

      <DocsH3 id="submission-and-confirmation">Submission and confirmation</DocsH3>
      <p>
        After submitting, the widget displays a brief thank-you message
        confirming that the feedback was received. The panel then auto-closes
        after a short delay, returning the user to exactly where they were
        with no disruption to their workflow. The entire interaction — from
        clicking the button to returning to work — takes less than thirty
        seconds.
      </p>

      <DocsH2 id="feedback-types-in-depth">Feedback types in depth</DocsH2>
      <p>
        Choosing the right feedback type helps ensure that submissions reach
        the right people and receive the appropriate response. Here is how
        each type is intended to be used:
      </p>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>When to use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>General</strong></td>
            <td>
              For observations, impressions, or comments that do not fit
              neatly into another category. &quot;The new layout feels much
              easier to navigate&quot; or &quot;I wish there were a way to
              export this view.&quot;
            </td>
          </tr>
          <tr>
            <td><strong>Bug Report</strong></td>
            <td>
              Something is broken or not working as expected. The automatic
              context capture is especially valuable here — the page URL and
              user agent give the development team a head start on
              reproducing the problem.
            </td>
          </tr>
          <tr>
            <td><strong>Feature Request</strong></td>
            <td>
              A suggestion for new functionality or an enhancement to an
              existing feature. These submissions help the product team
              prioritize development based on real user needs rather than
              assumptions.
            </td>
          </tr>
          <tr>
            <td><strong>Page Comment</strong></td>
            <td>
              Feedback specific to the content or layout of the current page.
              This might be a confusing label, a missing field, or a
              suggestion for reorganizing information. Because the page URL
              is captured automatically, reviewers know exactly which page
              the comment refers to.
            </td>
          </tr>
          <tr>
            <td><strong>Flow Rating</strong></td>
            <td>
              A structured assessment of a workflow or multi-step process.
              Pair this with the 1-to-5 rating to quantify how well a
              particular flow is serving its users. Over time, these ratings
              reveal which workflows need redesign.
            </td>
          </tr>
        </tbody>
      </table>

      <InfoBox type="tip">
        Encourage your team to use <strong>Flow Rating</strong> after
        completing key workflows like creating a crisis, submitting a
        decision, or processing a referral. Aggregated ratings over time
        provide a clear, data-driven signal about where the platform
        experience needs improvement.
      </InfoBox>

      <DocsH2 id="feedback-management">Feedback management</DocsH2>
      <p>
        Submitted feedback flows into a management interface where platform
        administrators and support staff can review, triage, and act on each
        submission. The management view presents feedback as a filterable
        list with the following dimensions:
      </p>
      <ul>
        <li>
          <strong>Type</strong> — filter by General, Bug Report, Feature
          Request, Page Comment, or Flow Rating to focus on a specific
          category
        </li>
        <li>
          <strong>Status</strong> — track each submission through a status
          workflow as it moves from received to reviewed to resolved. This
          ensures that feedback is not just collected but actively processed
        </li>
        <li>
          <strong>Priority</strong> — assign a priority level to each
          submission so that critical issues surface above routine
          suggestions
        </li>
      </ul>
      <p>
        Each feedback entry in the list shows the submission text, the type
        badge, the page it was submitted from, the rating (if provided), and
        the current status. Clicking an entry opens the full detail view,
        including the captured user agent and any internal notes added by the
        review team.
      </p>

      <DocsH2 id="analytics-dashboard">Analytics dashboard</DocsH2>
      <p>
        Beyond individual submissions, CLEAR provides an analytics view that
        aggregates feedback data into actionable summaries. This dashboard
        helps platform teams identify patterns, track trends, and measure
        the overall health of the user experience.
      </p>
      <p>
        The analytics dashboard includes:
      </p>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>What it tells you</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Total by type</strong></td>
            <td>
              How many submissions exist in each category. A spike in Bug
              Reports after a deployment, for instance, signals a regression
              that needs attention.
            </td>
          </tr>
          <tr>
            <td><strong>Total by priority</strong></td>
            <td>
              The distribution of feedback across priority levels. If
              high-priority items are accumulating without resolution, it is
              time to allocate more support resources.
            </td>
          </tr>
          <tr>
            <td><strong>Total by status</strong></td>
            <td>
              How feedback is moving through the processing workflow. A
              growing backlog of unreviewed submissions may indicate that
              the feedback process itself needs streamlining.
            </td>
          </tr>
          <tr>
            <td><strong>Average rating</strong></td>
            <td>
              The mean rating across all submissions that included a score.
              This single number provides a quick pulse check on user
              satisfaction — track it over time to see whether platform
              changes are making things better or worse.
            </td>
          </tr>
        </tbody>
      </table>

      <InfoBox type="info">
        The analytics dashboard is most valuable when reviewed regularly —
        not just when something goes wrong. Consider building a weekly review
        of feedback metrics into your platform team&apos;s routine. Patterns
        that emerge gradually are easy to miss in day-to-day work but obvious
        in the aggregate.
      </InfoBox>

      <DocsH2 id="closing-the-loop">Closing the loop</DocsH2>
      <p>
        Collecting feedback without acting on it can be worse than not
        collecting it at all — it erodes trust. The feedback system is
        designed to support a complete cycle: capture, review, act, and
        communicate. When users see that their reports lead to real changes,
        they are more likely to continue contributing, creating a virtuous
        cycle that steadily improves the platform for everyone.
      </p>
      <p>
        In a humanitarian context, this cycle carries particular weight.
        The people using CLEAR are working to serve affected populations,
        and the platform should serve them in return. Every bug report
        that gets fixed, every workflow that gets simplified, and every
        feature request that gets implemented removes a small obstacle
        between your team and the communities who depend on them.
      </p>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <p>
        The feedback system works hand-in-hand with the rest of
        CLEAR&apos;s accountability framework. To explore related
        capabilities, see:
      </p>
      <ul>
        <li>
          <Link href="/docs/accountability/audit">
            <strong>Audit Trail</strong>
          </Link>{" "}
          — learn how CLEAR records and preserves every decision made
          during a response, with full context and tamper detection
        </li>
        <li>
          <Link href="/docs/platform/dashboard">
            <strong>Dashboard</strong>
          </Link>{" "}
          — see how operational data, decisions, and alerts come together
          in one view
        </li>
        <li>
          <Link href="/docs/quickstart">
            <strong>Quickstart</strong>
          </Link>{" "}
          — if you are just getting started with CLEAR, begin here
        </li>
      </ul>
    </DocsPage>
  );
}
