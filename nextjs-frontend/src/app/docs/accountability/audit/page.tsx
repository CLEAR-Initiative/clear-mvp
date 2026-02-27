import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "Audit Trail — CLEAR Docs" };

export default function AuditTrailPage() {
  return (
    <DocsPage
      title="Audit Trail"
      description="Every decision in a humanitarian response should be traceable. CLEAR's audit system ensures that every choice — from emergency field calls to strategic resource shifts — is recorded, contextualized, and preserved for review."
      badge="ACCOUNTABILITY"
    >
      <DocsH2 id="why-audit-trails-matter">Why audit trails matter</DocsH2>
      <p>
        In the midst of a crisis, teams make dozens of consequential decisions
        each day. Who receives aid first? Which route is safe for convoys? Should
        a field hospital relocate? These choices carry real weight — they shape
        outcomes for the people your organization is trying to protect. Without
        a structured record, those decisions live only in the memories of the
        individuals who made them, vulnerable to loss, misinterpretation, and
        the fog of hindsight.
      </p>
      <p>
        CLEAR&apos;s audit trail exists so that every decision is documented at
        the moment it is made, with the reasoning and evidence that informed it.
        This is not about surveillance or blame. It is about building an
        institutional memory that enables learning, supports after-action
        reviews, and demonstrates to donors, affected communities, and
        oversight bodies that your response was conducted with care and
        intention.
      </p>

      <DocsH2 id="recording-decisions">Recording a decision</DocsH2>
      <p>
        When you create a new decision in CLEAR, you are asked to provide
        several pieces of structured information. Each field is designed to
        capture not just <em>what</em> was decided, but <em>why</em> — and
        what alternatives were weighed before the final call was made.
      </p>

      <DocsH3 id="core-fields">Core fields</DocsH3>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Title</strong></td>
            <td>
              A short, descriptive name for the decision — clear enough that
              a colleague reading it weeks later will immediately understand
              the subject.
            </td>
          </tr>
          <tr>
            <td><strong>Decision Type</strong></td>
            <td>
              Categorizes the decision so it can be filtered and analyzed.
              Choose from: <code>OPERATIONAL</code>, <code>STRATEGIC</code>,{" "}
              <code>EMERGENCY</code>, <code>RESOURCE_ALLOCATION</code>, or{" "}
              <code>POLICY</code>.
            </td>
          </tr>
          <tr>
            <td><strong>Decision Text</strong></td>
            <td>
              The full statement of what was decided. Write this as a clear,
              unambiguous record — imagine reading it aloud in a coordination
              meeting.
            </td>
          </tr>
          <tr>
            <td><strong>Rationale</strong></td>
            <td>
              The reasoning behind the decision. This is often the most
              valuable field during after-action reviews, because it explains
              not just the outcome but the logic that led there.
            </td>
          </tr>
          <tr>
            <td><strong>Alternatives Considered</strong></td>
            <td>
              A record of the other options that were evaluated and why they
              were not chosen. This demonstrates that the decision was
              deliberate, not reflexive.
            </td>
          </tr>
        </tbody>
      </table>

      <InfoBox type="tip">
        Writing a thoughtful rationale takes a minute or two, but it pays
        dividends during lessons-learned exercises. When your team revisits a
        decision six months later, the rationale is often more illuminating
        than the decision itself.
      </InfoBox>

      <DocsH2 id="risk-levels">Risk levels</DocsH2>
      <p>
        Every decision is assigned a risk level that reflects the potential
        consequences of the choice being made. CLEAR uses four levels, each
        color-coded throughout the interface so your team can spot high-stakes
        decisions at a glance:
      </p>
      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Color</th>
            <th>When to use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>LOW</strong></td>
            <td>Green</td>
            <td>
              Routine operational choices with limited downstream impact. If
              the decision proves wrong, correcting course is straightforward.
            </td>
          </tr>
          <tr>
            <td><strong>MEDIUM</strong></td>
            <td>Amber</td>
            <td>
              Decisions with moderate consequences that may affect timelines,
              budgets, or the scope of a response component.
            </td>
          </tr>
          <tr>
            <td><strong>HIGH</strong></td>
            <td>Orange</td>
            <td>
              Significant decisions that could affect the safety, wellbeing,
              or access of affected populations or staff. These warrant
              additional review.
            </td>
          </tr>
          <tr>
            <td><strong>CRITICAL</strong></td>
            <td>Red</td>
            <td>
              Decisions involving immediate risk to life, large-scale resource
              commitments, or irreversible actions. These should involve senior
              leadership sign-off.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        The audit list and detail views use these colors consistently, making
        it possible to scan a long list of decisions and immediately identify
        the ones that carry the greatest weight.
      </p>

      <DocsH2 id="status-lifecycle">Status lifecycle</DocsH2>
      <p>
        A decision in CLEAR moves through a defined set of statuses as it
        progresses from initial capture to long-term storage. This lifecycle
        ensures that decisions are not simply created and forgotten — they are
        actively tracked and eventually closed out.
      </p>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>DRAFT</strong></td>
            <td>
              The decision has been started but is not yet finalized. It may
              be incomplete or awaiting additional input. Drafts are visible
              only to the creator and their team.
            </td>
          </tr>
          <tr>
            <td><strong>SUBMITTED</strong></td>
            <td>
              The decision has been completed and formally submitted for the
              record. It is now part of the official audit trail and visible
              to all authorized users.
            </td>
          </tr>
          <tr>
            <td><strong>SYNCED</strong></td>
            <td>
              The decision has been synchronized to any connected external
              systems or offline-capable devices. This status confirms that
              the record has been distributed and is no longer dependent on a
              single copy.
            </td>
          </tr>
          <tr>
            <td><strong>ARCHIVED</strong></td>
            <td>
              The decision has been closed out and moved to the historical
              archive. Archived decisions remain fully searchable and readable
              but are excluded from active views by default.
            </td>
          </tr>
        </tbody>
      </table>

      <InfoBox type="info">
        The progression from DRAFT to ARCHIVED is one-directional by design.
        Once a decision is submitted, its core content becomes immutable to
        protect the integrity of the record. If circumstances change, the
        correct approach is to create a new, linked decision — not to alter
        the original.
      </InfoBox>

      <DocsH2 id="evidence-attachments">Evidence attachments</DocsH2>
      <p>
        Decisions are stronger when they are supported by evidence. CLEAR
        allows you to attach files to any decision — documents, photographs,
        maps, spreadsheets, or any other file type that provides context for
        the choice that was made.
      </p>
      <p>
        Each attachment records the following metadata:
      </p>
      <ul>
        <li>
          <strong>Filename</strong> — the original name of the uploaded file
        </li>
        <li>
          <strong>File type</strong> — the MIME type or format category (e.g.,
          PDF, JPEG, DOCX)
        </li>
        <li>
          <strong>File size</strong> — stored for bandwidth-conscious
          environments where download size matters
        </li>
        <li>
          <strong>Integrity hash</strong> — a cryptographic hash computed at
          the time of upload, used to verify that the file has not been
          altered since it was attached (see{" "}
          <a href="#integrity-hashing">Integrity Hashing</a> below)
        </li>
      </ul>
      <p>
        In the decision detail view, evidence files are displayed in a table
        with columns for each metadata field. This makes it straightforward
        for reviewers to assess what supporting material exists and to verify
        its authenticity.
      </p>

      <DocsH2 id="contextual-metadata">Contextual metadata</DocsH2>
      <p>
        Beyond the core decision content and evidence, CLEAR captures several
        additional layers of context that enrich the audit record and make it
        more useful during reviews.
      </p>

      <DocsH3 id="information-sources">Information sources</DocsH3>
      <p>
        Record where the information that informed the decision came from.
        Sources are stored as a tagged list — you might tag entries
        like &quot;OCHA Situation Report #14&quot;, &quot;Field team radio
        update&quot;, or &quot;Community leader interview&quot;. During
        after-action reviews, these tags make it possible to trace the
        information chain that shaped the decision.
      </p>

      <DocsH3 id="stakeholders">Stakeholders</DocsH3>
      <p>
        Identify the people and organizations involved in or affected by the
        decision. Like information sources, stakeholders are captured as a
        tagged list. This creates a searchable network of who was consulted,
        who approved, and who bore the consequences — a valuable record for
        coordination and accountability.
      </p>

      <DocsH3 id="location-tracking">Location tracking</DocsH3>
      <p>
        Decisions can be associated with geographic coordinates, linking each
        choice to the place it concerns. This is especially valuable in
        multi-site responses where the same type of decision may play out
        differently depending on local conditions. Location data also enables
        map-based filtering in the audit list, so a regional coordinator can
        quickly see all decisions made within their area of responsibility.
      </p>

      <DocsH3 id="priority-levels">Priority levels</DocsH3>
      <p>
        In addition to risk level, decisions carry a priority designation that
        supports triage. When multiple decisions require attention, priority
        helps staff determine which ones to address first. This is
        particularly useful during the early, chaotic hours of a rapid-onset
        emergency when the volume of decisions can be overwhelming.
      </p>

      <DocsH2 id="integrity-hashing">Integrity hashing</DocsH2>
      <p>
        Accountability requires trust in the record itself. CLEAR uses
        cryptographic hashing to protect the integrity of both decisions and
        their attached evidence. When a decision is submitted or a file is
        uploaded, the system computes a hash — a unique digital fingerprint —
        that is stored alongside the record.
      </p>
      <p>
        If anyone later questions whether a record has been tampered with, the
        hash can be recomputed and compared to the stored value. A mismatch
        would indicate that the content has changed since it was originally
        captured. This mechanism provides a lightweight but powerful layer of
        tamper detection without requiring a full blockchain or external
        notarization service.
      </p>

      <InfoBox type="warning">
        Integrity hashing detects changes — it does not prevent them. For
        environments that require stronger guarantees, consider pairing
        CLEAR&apos;s built-in hashing with an external audit log or
        write-once storage backend.
      </InfoBox>

      <DocsH2 id="audit-list-view">The audit list view</DocsH2>
      <p>
        The main audit trail interface presents all recorded decisions in a
        filterable list. At the top of the view, a row of stat cards
        summarizes the current state of the trail:
      </p>
      <ul>
        <li>
          <strong>Total decisions</strong> recorded across all crises
        </li>
        <li>
          <strong>Decisions by risk level</strong> — separate counts for LOW,
          MEDIUM, HIGH, and CRITICAL, each displayed with the corresponding
          color badge
        </li>
      </ul>
      <p>
        Below the stat cards, the list itself can be filtered by risk level,
        decision type, status, date range, and crisis. This allows you to
        narrow the view to exactly the set of decisions you are interested
        in — for example, all CRITICAL decisions made during the first week
        of a response, or all RESOURCE_ALLOCATION decisions that are still in
        DRAFT status.
      </p>

      <DocsH2 id="detail-view">The decision detail view</DocsH2>
      <p>
        Clicking any decision in the audit list opens its full detail view.
        This page presents the complete record in a structured layout:
      </p>
      <ul>
        <li>
          The <strong>decision header</strong> shows the title, type badge,
          risk level indicator, status, and timestamp
        </li>
        <li>
          The <strong>decision body</strong> contains the full decision text,
          rationale, and alternatives considered
        </li>
        <li>
          The <strong>evidence table</strong> lists all attached files with
          their metadata — filename, type, size, and integrity hash
        </li>
        <li>
          The <strong>context panel</strong> displays information sources,
          stakeholders, location coordinates, and priority
        </li>
      </ul>
      <p>
        Together, these sections provide a reviewer with everything they need
        to understand not just what was decided, but the full context in which
        the decision was made.
      </p>

      <InfoBox type="tip">
        When preparing for a donor review or an after-action report, use the
        audit list filters to isolate the relevant decisions, then walk
        through the detail views one by one. The structured format makes it
        straightforward to answer questions like &quot;what did we know at the
        time?&quot; and &quot;what options did we consider?&quot;
      </InfoBox>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <p>
        The audit trail is one part of CLEAR&apos;s broader accountability
        framework. To learn about the other tools that support transparent,
        responsive humanitarian operations, explore:
      </p>
      <ul>
        <li>
          <Link href="/docs/accountability/feedback">
            <strong>Feedback System</strong>
          </Link>{" "}
          — understand how CLEAR captures user and beneficiary feedback to
          continuously improve the response
        </li>
        <li>
          <Link href="/docs/platform/dashboard">
            <strong>Dashboard</strong>
          </Link>{" "}
          — see how audit trail data surfaces in the daily operational view
        </li>
        <li>
          <Link href="/docs/platform/crises">
            <strong>Crisis Management</strong>
          </Link>{" "}
          — learn how decisions are linked to the crises they address
        </li>
      </ul>
    </DocsPage>
  );
}
