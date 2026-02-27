import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "API Reference — CLEAR Docs" };

export default function ApiReferencePage() {
  return (
    <DocsPage
      title="API Reference"
      description="A complete catalogue of every tRPC router and procedure in the CLEAR platform. No REST endpoints to memorise — every call is fully type-safe and validated at the boundary."
      badge="ARCHITECTURE"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        CLEAR does not expose traditional REST endpoints. Instead, every API
        operation is defined as a <strong>tRPC procedure</strong> — a typed
        function with Zod-validated inputs, an authenticated (or public)
        execution context, and a return type that flows directly into your
        components without manual parsing or transformation. This means you
        never need to remember URL patterns, HTTP methods, or response shapes.
        Your editor knows them all.
      </p>
      <p>
        The sections below list every router and its procedures. Unless
        otherwise noted, all procedures require authentication (they use{" "}
        <code>protectedProcedure</code>, which verifies the user session before
        executing any logic).
      </p>

      <InfoBox type="info">
        To understand how these procedures are called from server components
        versus client components, see the{" "}
        <Link href="/docs/architecture/stack#data-flow">
          data flow pattern
        </Link>{" "}
        in the Tech Stack guide.
      </InfoBox>

      <DocsH2 id="authentication">Authentication and access control</DocsH2>
      <p>
        tRPC procedures in CLEAR fall into two categories:
      </p>
      <ul>
        <li>
          <strong><code>protectedProcedure</code></strong> — requires a valid
          user session. The vast majority of procedures use this. If a request
          arrives without a session, tRPC returns an <code>UNAUTHORIZED</code>{" "}
          error before any business logic runs.
        </li>
        <li>
          <strong><code>publicProcedure</code></strong> — accessible without
          authentication. Only a small number of read-only endpoints use this,
          primarily the <code>feeds.status</code> health check.
        </li>
      </ul>

      <DocsH2 id="validation">Input validation with Zod</DocsH2>
      <p>
        Every procedure that accepts input attaches a <strong>Zod schema</strong>{" "}
        to validate the request payload. If the input does not conform to the
        schema — a missing required field, an unexpected type, a string that
        exceeds the maximum length — the request is rejected with a structured
        validation error before any database query executes. This protects data
        integrity at the boundary and gives callers clear, actionable error
        messages.
      </p>

      <DocsH2 id="pagination">Pagination pattern</DocsH2>
      <p>
        List procedures throughout the platform use a consistent{" "}
        <strong>cursor-based pagination</strong> pattern. Each list call accepts
        two optional parameters:
      </p>
      <ul>
        <li>
          <code>limit</code> — the maximum number of items to return (defaults
          vary by router, typically 10 or 20).
        </li>
        <li>
          <code>cursor</code> — an opaque identifier pointing to the last item
          from the previous page. Omit this for the first page.
        </li>
      </ul>
      <p>
        The response includes a <code>nextCursor</code> value. If it is{" "}
        <code>null</code>, you have reached the end of the result set. Pass it
        as the <code>cursor</code> in your next request to fetch the following
        page. This approach avoids the performance pitfalls of offset-based
        pagination on large datasets and works naturally with infinite scroll
        interfaces.
      </p>

      <DocsH2 id="routers">Router reference</DocsH2>
      <p>
        Below is every tRPC router in the system, grouped by domain. Each
        procedure is listed with a brief description of what it does.
      </p>

      {/* ── Crisis ─────────────────────────────────── */}
      <DocsH3 id="router-crisis">crisis</DocsH3>
      <p>
        The crisis router manages the core entities around which the entire
        platform revolves — tracked humanitarian crises with severity levels,
        geographic data, and lifecycle states.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>crisis.list</code></td>
            <td>
              Returns a paginated list of crises, optionally filtered by status
              or severity.
            </td>
          </tr>
          <tr>
            <td><code>crisis.getById</code></td>
            <td>
              Fetches a single crisis by its ID, including related decisions and
              alerts.
            </td>
          </tr>
          <tr>
            <td><code>crisis.create</code></td>
            <td>
              Creates a new crisis record with title, description, severity,
              location, and initial status.
            </td>
          </tr>
          <tr>
            <td><code>crisis.update</code></td>
            <td>
              Updates an existing crisis — change status, escalate severity, or
              edit descriptive fields.
            </td>
          </tr>
          <tr>
            <td><code>crisis.delete</code></td>
            <td>
              Permanently removes a crisis and its associated records. Use with
              care.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Decision ───────────────────────────────── */}
      <DocsH3 id="router-decision">decision</DocsH3>
      <p>
        Decisions represent the choices made by coordination teams in response
        to a crisis. Each decision records the options considered, the rationale,
        and a confidence score.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>decision.list</code></td>
            <td>
              Returns paginated decisions, optionally scoped to a specific
              crisis.
            </td>
          </tr>
          <tr>
            <td><code>decision.getById</code></td>
            <td>
              Fetches a single decision with its full detail — options,
              rationale, outcome, and linked crisis.
            </td>
          </tr>
          <tr>
            <td><code>decision.create</code></td>
            <td>
              Records a new decision against a crisis, including the options
              evaluated and the chosen course of action.
            </td>
          </tr>
          <tr>
            <td><code>decision.update</code></td>
            <td>
              Updates an existing decision — record an outcome, adjust the
              confidence score, or amend the rationale.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Alert ──────────────────────────────────── */}
      <DocsH3 id="router-alert">alert</DocsH3>
      <p>
        Alerts surface conditions that may require action — early warnings from
        data feeds, field-reported observations, or system-generated
        notifications linked to specific crises.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>alert.list</code></td>
            <td>
              Returns paginated alerts, filterable by crisis, severity, or
              resolution status.
            </td>
          </tr>
          <tr>
            <td><code>alert.getById</code></td>
            <td>
              Fetches a single alert with its full context and linked crisis.
            </td>
          </tr>
          <tr>
            <td><code>alert.create</code></td>
            <td>
              Creates a new alert tied to a crisis, specifying severity and a
              descriptive message.
            </td>
          </tr>
          <tr>
            <td><code>alert.update</code></td>
            <td>
              Modifies an existing alert — change its severity or update its
              description.
            </td>
          </tr>
          <tr>
            <td><code>alert.resolve</code></td>
            <td>
              Marks an alert as resolved, recording who resolved it and an
              optional resolution note.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Dashboard ──────────────────────────────── */}
      <DocsH3 id="router-dashboard">dashboard</DocsH3>
      <p>
        The dashboard router provides pre-aggregated metrics for the platform
        overview screen, eliminating the need for clients to make multiple
        queries and compute totals themselves.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>dashboard.stats</code></td>
            <td>
              Returns aggregated metrics — active crisis count, pending decision
              count, unresolved alert count, and other summary figures used by
              the dashboard cards.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Feeds ──────────────────────────────────── */}
      <DocsH3 id="router-feeds">feeds</DocsH3>
      <p>
        The feeds router integrates with external humanitarian and
        environmental data sources, surfacing real-time information from
        seismological services, weather APIs, and humanitarian report
        aggregators.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>feeds.status</code></td>
            <td>
              A public health-check endpoint that returns the connectivity
              status of each configured feed. <strong>This is the only
              procedure that does not require authentication.</strong>
            </td>
          </tr>
          <tr>
            <td><code>feeds.earthquakes</code></td>
            <td>
              Fetches recent seismic events from the USGS earthquake feed,
              formatted for display in the data feeds view.
            </td>
          </tr>
          <tr>
            <td><code>feeds.reliefweb</code></td>
            <td>
              Retrieves the latest humanitarian situation reports and updates
              from the ReliefWeb API.
            </td>
          </tr>
          <tr>
            <td><code>feeds.weather</code></td>
            <td>
              Returns current weather conditions and forecasts for a specified
              location, useful for anticipating weather-related crisis
              escalation.
            </td>
          </tr>
        </tbody>
      </table>
      <InfoBox type="tip">
        The <code>feeds.status</code> endpoint is intentionally public so that
        external monitoring tools can check feed health without needing
        platform credentials.
      </InfoBox>

      {/* ── Survey ─────────────────────────────────── */}
      <DocsH3 id="router-survey">survey</DocsH3>
      <p>
        The survey router powers CLEAR&apos;s field data collection system.
        Templates define reusable survey structures; deployments push them to
        the field; and responses flow back in for analysis.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>survey.listTemplates</code></td>
            <td>
              Returns all available survey templates with their question counts
              and deployment history.
            </td>
          </tr>
          <tr>
            <td><code>survey.getById</code></td>
            <td>
              Fetches a single survey template with its full question set and
              configuration.
            </td>
          </tr>
          <tr>
            <td><code>survey.createTemplate</code></td>
            <td>
              Creates a new survey template with a title, description, and
              initial configuration.
            </td>
          </tr>
          <tr>
            <td><code>survey.addQuestions</code></td>
            <td>
              Adds one or more questions to an existing survey template,
              specifying question type, label, and validation rules.
            </td>
          </tr>
          <tr>
            <td><code>survey.deploy</code></td>
            <td>
              Deploys a survey template for field use, making it available for
              response collection.
            </td>
          </tr>
          <tr>
            <td><code>survey.listResponses</code></td>
            <td>
              Returns paginated survey responses for a given deployment,
              including individual answer data.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Audit ──────────────────────────────────── */}
      <DocsH3 id="router-audit">audit</DocsH3>
      <p>
        The audit router provides a structured accountability trail. Every
        significant action in the platform can be captured as an audit entry,
        with supporting evidence and status tracking for review processes.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>audit.list</code></td>
            <td>
              Returns paginated audit entries, filterable by type, status, or
              date range.
            </td>
          </tr>
          <tr>
            <td><code>audit.getById</code></td>
            <td>
              Fetches a single audit entry with all its attached evidence and
              status history.
            </td>
          </tr>
          <tr>
            <td><code>audit.create</code></td>
            <td>
              Records a new audit entry with a description, category, and
              initial status.
            </td>
          </tr>
          <tr>
            <td><code>audit.updateStatus</code></td>
            <td>
              Advances an audit entry through its review lifecycle — from open
              to under review to resolved.
            </td>
          </tr>
          <tr>
            <td><code>audit.addEvidence</code></td>
            <td>
              Attaches supporting evidence (documents, notes, references) to an
              existing audit entry.
            </td>
          </tr>
          <tr>
            <td><code>audit.stats</code></td>
            <td>
              Returns aggregate audit metrics — counts by status, category
              breakdowns, and resolution timelines.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Feedback ───────────────────────────────── */}
      <DocsH3 id="router-feedback">feedback</DocsH3>
      <p>
        The feedback router supports community accountability by allowing
        beneficiaries and stakeholders to submit feedback on humanitarian
        operations and enabling staff to track and respond to that feedback
        systematically.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>feedback.submit</code></td>
            <td>
              Records a new piece of feedback with a message, category, and
              optional contact details.
            </td>
          </tr>
          <tr>
            <td><code>feedback.list</code></td>
            <td>
              Returns paginated feedback entries, filterable by status and
              category.
            </td>
          </tr>
          <tr>
            <td><code>feedback.updateStatus</code></td>
            <td>
              Changes the status of a feedback entry — acknowledge receipt,
              mark as in progress, or close as resolved.
            </td>
          </tr>
          <tr>
            <td><code>feedback.analytics</code></td>
            <td>
              Returns aggregated feedback metrics — submission trends, category
              distributions, and average response times.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Referral ───────────────────────────────── */}
      <DocsH3 id="router-referral">referral</DocsH3>
      <p>
        The referral router manages encrypted beneficiary referrals between
        partner organisations. Personal data is encrypted at rest and only
        decrypted by authorised users, ensuring compliance with data protection
        standards in humanitarian contexts.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>referral.list</code></td>
            <td>
              Returns paginated referrals with encrypted personal data
              redacted in the list view.
            </td>
          </tr>
          <tr>
            <td><code>referral.getById</code></td>
            <td>
              Fetches a single referral with its status history and partner
              information (personal data remains encrypted).
            </td>
          </tr>
          <tr>
            <td><code>referral.create</code></td>
            <td>
              Creates a new referral, encrypting beneficiary personal data
              before it reaches the database.
            </td>
          </tr>
          <tr>
            <td><code>referral.decryptData</code></td>
            <td>
              Decrypts the personal data for a specific referral. Access is
              logged for accountability purposes.
            </td>
          </tr>
          <tr>
            <td><code>referral.updateStatus</code></td>
            <td>
              Advances a referral through its lifecycle — pending, accepted,
              in progress, completed, or rejected.
            </td>
          </tr>
          <tr>
            <td><code>referral.listPartners</code></td>
            <td>
              Returns the list of partner organisations available as referral
              destinations.
            </td>
          </tr>
          <tr>
            <td><code>referral.createPartner</code></td>
            <td>
              Registers a new partner organisation in the referral network.
            </td>
          </tr>
          <tr>
            <td><code>referral.stats</code></td>
            <td>
              Returns referral metrics — counts by status, partner activity,
              and average processing times.
            </td>
          </tr>
        </tbody>
      </table>

      <InfoBox type="warning">
        The <code>referral.decryptData</code> procedure should be called only
        when a staff member genuinely needs to view beneficiary personal data.
        Every decryption event is recorded in the audit trail. Treat this
        access with the same seriousness as accessing a physical case file.
      </InfoBox>

      {/* ── Kobo ───────────────────────────────────── */}
      <DocsH3 id="router-kobo">kobo</DocsH3>
      <p>
        The KoBoToolbox router bridges CLEAR with{" "}
        <a href="https://www.kobotoolbox.org/" target="_blank" rel="noopener noreferrer">
          KoBoToolbox
        </a>
        , the widely used open-source field data collection platform. It allows
        teams to validate their connection, browse remote assets, export
        surveys, and synchronise response data back into CLEAR.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>kobo.validateConnection</code></td>
            <td>
              Tests the KoBoToolbox API credentials and returns the connection
              status.
            </td>
          </tr>
          <tr>
            <td><code>kobo.listAssets</code></td>
            <td>
              Retrieves the list of forms and surveys available in the
              connected KoBoToolbox account.
            </td>
          </tr>
          <tr>
            <td><code>kobo.exportSurvey</code></td>
            <td>
              Exports a CLEAR survey template to KoBoToolbox as a deployable
              form.
            </td>
          </tr>
          <tr>
            <td><code>kobo.syncResponses</code></td>
            <td>
              Pulls new survey responses from KoBoToolbox and imports them into
              the CLEAR database.
            </td>
          </tr>
          <tr>
            <td><code>kobo.listDeployments</code></td>
            <td>
              Returns the deployment history for KoBoToolbox-linked surveys,
              including response counts and status.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Assessment ─────────────────────────────── */}
      <DocsH3 id="router-assessment">assessment</DocsH3>
      <p>
        The assessment router supports rapid vulnerability scoring in the field.
        Assessments are lightweight, structured evaluations designed to be
        completed quickly and produce consistent, comparable results across
        different contexts.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>assessment.list</code></td>
            <td>
              Returns paginated assessments with summary scores and metadata.
            </td>
          </tr>
          <tr>
            <td><code>assessment.getById</code></td>
            <td>
              Fetches a single assessment with its full scoring breakdown and
              associated data.
            </td>
          </tr>
          <tr>
            <td><code>assessment.create</code></td>
            <td>
              Records a new vulnerability assessment with location, sector
              scores, and contextual notes.
            </td>
          </tr>
          <tr>
            <td><code>assessment.preview</code></td>
            <td>
              Generates a preview of assessment results without persisting
              them — useful for reviewing before final submission.
            </td>
          </tr>
          <tr>
            <td><code>assessment.stats</code></td>
            <td>
              Returns aggregate assessment metrics — average scores by sector,
              geographic distribution, and trend data.
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Data Source ─────────────────────────────── */}
      <DocsH3 id="router-data-source">dataSource</DocsH3>
      <p>
        The data source router manages the registry of data sources that inform
        crisis analysis. It tracks availability, quality, and coverage — and
        powers the gap analysis feature that identifies where critical
        information is missing.
      </p>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>dataSource.list</code></td>
            <td>
              Returns paginated data sources with their latest availability and
              quality scores.
            </td>
          </tr>
          <tr>
            <td><code>dataSource.getById</code></td>
            <td>
              Fetches a single data source with its full configuration,
              history, and quality metrics.
            </td>
          </tr>
          <tr>
            <td><code>dataSource.create</code></td>
            <td>
              Registers a new data source with its name, type, URL, and
              expected update frequency.
            </td>
          </tr>
          <tr>
            <td><code>dataSource.update</code></td>
            <td>
              Modifies an existing data source&apos;s configuration or
              descriptive metadata.
            </td>
          </tr>
          <tr>
            <td><code>dataSource.delete</code></td>
            <td>
              Removes a data source from the registry.
            </td>
          </tr>
          <tr>
            <td><code>dataSource.logAvailability</code></td>
            <td>
              Records an availability check result — whether the source was
              reachable and responding at a given time.
            </td>
          </tr>
          <tr>
            <td><code>dataSource.logQuality</code></td>
            <td>
              Records a quality assessment — completeness, timeliness, and
              accuracy scores for the data provided.
            </td>
          </tr>
          <tr>
            <td><code>dataSource.checkAvailability</code></td>
            <td>
              Performs a live availability check against a data source and
              returns the result immediately.
            </td>
          </tr>
          <tr>
            <td><code>dataSource.gapAnalysis</code></td>
            <td>
              Analyses data source coverage across sectors and geographies,
              identifying gaps where critical information is unavailable or
              unreliable.
            </td>
          </tr>
          <tr>
            <td><code>dataSource.partnerSources</code></td>
            <td>
              Returns data sources grouped by partner organisation, showing
              each partner&apos;s contribution to the information landscape.
            </td>
          </tr>
          <tr>
            <td><code>dataSource.sectorIndicators</code></td>
            <td>
              Returns data source coverage mapped to humanitarian sector
              indicators (health, shelter, WASH, food security, and so on).
            </td>
          </tr>
          <tr>
            <td><code>dataSource.stats</code></td>
            <td>
              Returns aggregate metrics — total sources, average quality
              scores, availability rates, and gap counts.
            </td>
          </tr>
        </tbody>
      </table>

      <DocsH2 id="calling-procedures">Calling procedures in practice</DocsH2>
      <p>
        To call any procedure listed above, use the appropriate pattern for
        your component type:
      </p>
      <DocsH3 id="server-component-calls">From a server component</DocsH3>
      <pre><code>{`import { api } from "~/trpc/server";

export default async function CrisesPage() {
  const crises = await api.crisis.list({ limit: 20 });
  return <ul>{crises.items.map(c => <li key={c.id}>{c.title}</li>)}</ul>;
}`}</code></pre>

      <DocsH3 id="client-component-calls">From a client component</DocsH3>
      <pre><code>{`"use client";
import { api } from "~/trpc/react";

export function CrisisList() {
  const { data, isLoading } = api.crisis.list.useQuery({ limit: 20 });
  if (isLoading) return <p>Loading...</p>;
  return <ul>{data?.items.map(c => <li key={c.id}>{c.title}</li>)}</ul>;
}`}</code></pre>

      <InfoBox type="tip">
        Server component calls are always the simpler option — no loading
        states to manage, no client-side JavaScript to ship. Default to server
        components and only reach for client-side hooks when you need
        interactivity after the initial render.
      </InfoBox>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <ul>
        <li>
          <Link href="/docs/architecture/stack">
            <strong>Tech Stack</strong>
          </Link>{" "}
          — understand the frameworks and conventions underpinning these APIs
        </li>
        <li>
          <Link href="/docs/data/feeds">
            <strong>Live Data Feeds</strong>
          </Link>{" "}
          — learn how the feeds router integrates with external humanitarian
          data sources
        </li>
        <li>
          <Link href="/docs/field/referrals">
            <strong>Secure Referrals</strong>
          </Link>{" "}
          — understand the encryption model behind the referral procedures
        </li>
        <li>
          <Link href="/docs/integrations/kobo">
            <strong>KoBoToolbox Integration</strong>
          </Link>{" "}
          — set up and use the KoBoToolbox sync workflows
        </li>
      </ul>
    </DocsPage>
  );
}
