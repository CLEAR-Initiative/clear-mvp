import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "Crisis Management — CLEAR Docs" };

export default function CrisesPage() {
  return (
    <DocsPage
      title="Crisis Management"
      description="Create, track, and respond to crises — from first detection through resolution — with structured decisions, alerts, and a complete operational timeline."
      badge="PLATFORM"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        Crisis management is the core of CLEAR. Every humanitarian operation
        revolves around events — a conflict erupts, a cyclone makes landfall, a
        disease outbreak crosses a border. CLEAR gives your team a structured
        way to register these events, track their evolution over time, record
        the decisions made in response, and manage the alerts that keep everyone
        informed. The goal is simple: no crisis goes untracked, no decision goes
        unrecorded, and no warning goes unheeded.
      </p>

      <DocsH2 id="creating-a-crisis">Creating a crisis</DocsH2>
      <p>
        To create a new crisis, navigate to the crisis list and click{" "}
        <strong>New Crisis</strong>. You will be asked to provide the following
        information:
      </p>

      <DocsH3 id="crisis-type">Crisis type</DocsH3>
      <p>
        Every crisis must be classified into one of five types. This
        classification drives filtering, reporting, and — in later phases — the
        predictive models that power early-warning recommendations.
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
            <td><strong>CONFLICT</strong></td>
            <td>
              Armed conflict, civil unrest, communal violence, or any situation
              where hostilities are driving humanitarian need.
            </td>
          </tr>
          <tr>
            <td><strong>NATURAL_DISASTER</strong></td>
            <td>
              Earthquakes, floods, cyclones, droughts, volcanic eruptions, and
              other geophysical or hydrometeorological events.
            </td>
          </tr>
          <tr>
            <td><strong>EPIDEMIC</strong></td>
            <td>
              Disease outbreaks — cholera, Ebola, measles, COVID-19 — that
              require a coordinated health response.
            </td>
          </tr>
          <tr>
            <td><strong>FAMINE</strong></td>
            <td>
              Food security crises at IPC Phase 3 and above, acute malnutrition
              emergencies, and situations where populations face starvation.
            </td>
          </tr>
          <tr>
            <td><strong>DISPLACEMENT</strong></td>
            <td>
              Large-scale population movements — internal displacement, refugee
              flows, or forced relocations — regardless of the underlying cause.
            </td>
          </tr>
        </tbody>
      </table>
      <InfoBox type="tip">
        A single real-world event can trigger multiple crisis types. For
        example, a conflict may cause both displacement and famine. Create
        separate crisis records for each dimension so that decisions and alerts
        remain clearly scoped.
      </InfoBox>

      <DocsH3 id="severity-levels">Severity</DocsH3>
      <p>
        Severity indicates how urgent and impactful the crisis currently is. It
        can be updated at any time as conditions change on the ground.
      </p>
      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>LOW</strong></td>
            <td>
              Limited humanitarian impact. Situation is under control or
              affecting a small population.
            </td>
          </tr>
          <tr>
            <td><strong>MEDIUM</strong></td>
            <td>
              Moderate impact. Requires active monitoring and may demand
              resource allocation.
            </td>
          </tr>
          <tr>
            <td><strong>HIGH</strong></td>
            <td>
              Significant impact. Multiple sectors affected, operational
              response is underway, and coordination is critical.
            </td>
          </tr>
          <tr>
            <td><strong>CRITICAL</strong></td>
            <td>
              Catastrophic impact. Immediate, large-scale response required.
              Lives are at imminent risk.
            </td>
          </tr>
        </tbody>
      </table>

      <DocsH3 id="status-lifecycle">Status lifecycle</DocsH3>
      <p>
        Every crisis moves through a defined lifecycle. Status transitions are
        recorded in the crisis timeline, giving your team a clear history of how
        the situation evolved.
      </p>
      <ol>
        <li>
          <strong>MONITORING</strong> — The crisis has been registered but is not
          yet actively demanding a response. Your team is watching the
          situation and collecting data. This is the typical starting state for
          early warnings and slow-onset events.
        </li>
        <li>
          <strong>ACTIVE</strong> — The crisis requires an operational response.
          Resources are being mobilized, decisions are being made, and the
          situation is actively evolving.
        </li>
        <li>
          <strong>ESCALATING</strong> — Conditions are worsening. Severity may
          need to be raised, additional resources requested, and coordination
          intensified. This status is a signal to leadership that the
          trajectory is negative.
        </li>
        <li>
          <strong>DECLINING</strong> — The worst has passed. The situation is
          stabilizing, needs are decreasing, and the response is beginning to
          wind down — but the crisis is not yet resolved.
        </li>
        <li>
          <strong>RESOLVED</strong> — The crisis is considered closed. No
          further operational response is required. The crisis record remains
          in the system for reporting, learning, and accountability.
        </li>
      </ol>
      <InfoBox type="info">
        Status transitions do not have to be linear. A declining crisis can
        escalate again, and a monitoring situation can jump straight to active
        if conditions change suddenly. CLEAR does not enforce a strict
        progression — it records whatever happens.
      </InfoBox>

      <DocsH2 id="crisis-list">Crisis list and filtering</DocsH2>
      <p>
        The crisis list page displays all crises in a searchable, filterable
        table. As your organization tracks more events, effective filtering
        becomes essential.
      </p>
      <p>You can filter the crisis list by:</p>
      <ul>
        <li>
          <strong>Type</strong> — Show only conflicts, natural disasters,
          epidemics, famines, or displacement events.
        </li>
        <li>
          <strong>Severity</strong> — Focus on critical or high-severity
          situations when you need to prioritize.
        </li>
        <li>
          <strong>Status</strong> — Isolate active crises, view only those
          being monitored, or review resolved cases for after-action learning.
        </li>
        <li>
          <strong>Search</strong> — A free-text search that matches against
          crisis titles and descriptions, useful when you know the name or
          location of the event you are looking for.
        </li>
      </ul>
      <InfoBox type="tip">
        Filters can be combined. For example, you can search for &quot;Tigray&quot;
        while filtering to <strong>CONFLICT</strong> type and{" "}
        <strong>ACTIVE</strong> status to find exactly the crisis you need.
      </InfoBox>

      <DocsH2 id="crisis-detail">Crisis detail page</DocsH2>
      <p>
        Clicking on any crisis opens its detail page — a comprehensive view of
        everything related to that event. The detail page is organized into
        several sections:
      </p>

      <DocsH3 id="crisis-overview">Overview</DocsH3>
      <p>
        The overview panel shows the crisis title, description, type, severity,
        status, location, and timestamps for when it was created and last
        updated. This is the essential identity of the crisis — the facts that
        anyone opening the record needs to see first.
      </p>

      <DocsH3 id="crisis-timeline">Timeline</DocsH3>
      <p>
        The timeline provides a chronological record of every significant event
        related to the crisis: status changes, decisions recorded, alerts
        raised and resolved, and any notes added by team members. In a fast-moving
        emergency, the timeline is where you go to understand what has happened
        and in what order.
      </p>

      <DocsH3 id="linked-decisions-alerts">Linked decisions and alerts</DocsH3>
      <p>
        Each crisis detail page displays the decisions and alerts associated
        with that crisis. This linkage is bidirectional — you can navigate from
        a crisis to its decisions, or from a decision back to the crisis it
        belongs to. This structure ensures that every operational choice is
        traceable to the event that prompted it.
      </p>

      <DocsH2 id="decisions">Recording decisions</DocsH2>
      <p>
        Decisions are the heart of accountability in CLEAR. When your team faces
        a choice — where to send supplies, whether to evacuate a camp, which
        partner to coordinate with — recording that decision creates a
        permanent, auditable record that can be reviewed later for learning and
        accountability.
      </p>

      <DocsH3 id="decision-structure">Decision structure</DocsH3>
      <p>
        Every decision in CLEAR follows a structured format:
      </p>
      <ul>
        <li>
          <strong>Title and description</strong> — What is the decision about,
          and what is the context?
        </li>
        <li>
          <strong>Options A, B, and C</strong> — Up to three alternatives that
          were considered. Each option should describe a distinct course of
          action so that reviewers can understand the trade-offs.
        </li>
        <li>
          <strong>Selected option</strong> — Which option was chosen.
        </li>
        <li>
          <strong>Confidence score</strong> — A value from 0 to 100 indicating
          how confident the decision-maker is in the choice. A score of 90
          means &quot;we are highly certain this is the right call.&quot; A score of 40
          means &quot;we are making the best choice we can with limited
          information.&quot; This score is invaluable during after-action reviews.
        </li>
        <li>
          <strong>Outcome tracking</strong> — Once the consequences of the
          decision are known, the outcome can be recorded. Did the chosen
          option achieve its goal? What happened? This closes the feedback loop
          and turns each decision into a learning opportunity.
        </li>
      </ul>
      <InfoBox type="info">
        Confidence scores are not about being right — they are about being
        honest. In crisis contexts, teams frequently must act on incomplete
        information. Recording a low confidence score is not a failure; it is a
        signal that additional data or analysis should be sought when possible.
      </InfoBox>

      <DocsH3 id="creating-a-decision">Creating a decision</DocsH3>
      <p>
        To record a decision, open the crisis detail page and click{" "}
        <strong>New Decision</strong>. Fill in the title, description, up to
        three options, your selected option, and your confidence score. The
        decision will be linked to the crisis and appear in both the crisis
        timeline and the dashboard&apos;s recent decisions list.
      </p>

      <DocsH2 id="alerts">Alert management</DocsH2>
      <p>
        Alerts in CLEAR represent conditions, warnings, or events that require
        attention. They can be raised automatically by live data feeds — for
        example, when a new earthquake is detected by the USGS feed — or
        created manually by team members who observe something in the field.
      </p>

      <DocsH3 id="alert-severity">Alert severity</DocsH3>
      <p>
        Like crises, alerts carry a severity level (LOW, MEDIUM, HIGH, or
        CRITICAL) that helps your team triage. A critical alert demands
        immediate attention; a low alert may be informational and can wait for
        the next team meeting.
      </p>

      <DocsH3 id="alert-linking">Linking alerts to crises</DocsH3>
      <p>
        Every alert should be linked to a crisis. This linkage ensures that
        when you open a crisis detail page, you can see all the warnings and
        signals associated with that event. If an alert does not fit an existing
        crisis, it may be a sign that a new crisis should be created.
      </p>

      <DocsH3 id="alert-resolution">Resolving and dismissing alerts</DocsH3>
      <p>
        Alerts can be resolved or dismissed:
      </p>
      <ul>
        <li>
          <strong>Resolve</strong> — The condition that triggered the alert has
          been addressed. The alert is marked as resolved and moves out of the
          active count.
        </li>
        <li>
          <strong>Dismiss</strong> — The alert is no longer relevant or was
          raised in error. Dismissing it removes it from the active count while
          preserving the record for audit purposes.
        </li>
      </ul>
      <InfoBox type="warning">
        Dismissed alerts are not deleted. They remain in the system and are
        visible in the crisis timeline. This ensures that even false alarms are
        part of the operational record — a requirement for many humanitarian
        accountability frameworks.
      </InfoBox>

      <DocsH2 id="best-practices">Best practices</DocsH2>
      <ul>
        <li>
          <strong>Create crises early.</strong> It is better to register a
          crisis at the MONITORING stage and have it resolve without incident
          than to miss an escalating situation because nobody opened a record.
        </li>
        <li>
          <strong>Record decisions in real time.</strong> The longer you wait
          to document a decision, the less accurate the record becomes. Capture
          decisions as they are made, even if the outcome is unknown.
        </li>
        <li>
          <strong>Use confidence scores honestly.</strong> They are a tool for
          learning, not judgment. Teams that record low-confidence decisions
          consistently build better institutional knowledge over time.
        </li>
        <li>
          <strong>Link everything to a crisis.</strong> Unlinked decisions and
          alerts are harder to find later and break the traceability chain that
          makes CLEAR valuable for accountability.
        </li>
        <li>
          <strong>Review resolved crises.</strong> After a crisis is marked
          RESOLVED, take time to review the timeline, decisions, and outcomes.
          This after-action review is one of the most powerful learning tools
          available to humanitarian teams.
        </li>
      </ul>

      <InfoBox type="tip">
        For a visual overview of where your crises are concentrated
        geographically, visit the{" "}
        <Link href="/docs/platform/map" className="font-medium">Interactive Map</Link>. For
        dashboard-level metrics and recent activity, see the{" "}
        <Link href="/docs/platform/dashboard" className="font-medium">Dashboard</Link> documentation.
      </InfoBox>
    </DocsPage>
  );
}
