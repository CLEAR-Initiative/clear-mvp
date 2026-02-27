import Link from "next/link";
import { DocsPage, DocsH2, InfoBox } from "./_components/docs-page";

export const metadata = { title: "Introduction — CLEAR Docs" };

export default function IntroductionPage() {
  return (
    <DocsPage
      title="Introduction"
      description="Welcome to CLEAR — your humanitarian decision-support platform for crisis response."
    >
      <DocsH2 id="what-is-clear">What is CLEAR?</DocsH2>
      <p>
        <strong>CLEAR</strong> stands for <em>Crisis Learning, Early-warning,
        Anticipation, and Response</em>. It is a comprehensive platform designed
        for humanitarian organizations — built in partnership with the Norwegian
        Refugee Council (NRC) — to make faster, better-informed decisions when
        lives are at stake.
      </p>
      <p>
        CLEAR brings together live data feeds, field assessments, vulnerability
        scoring, crisis tracking, and accountability tools into a single,
        cohesive workspace. Rather than switching between spreadsheets,
        dashboards, and email threads, your team can monitor, decide, and act
        from one place.
      </p>

      <DocsH2 id="what-you-can-do">What you can do</DocsH2>

      <table>
        <thead>
          <tr>
            <th>Capability</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Crisis Management</strong></td>
            <td>Track active crises, record decisions with confidence scores, and manage alerts</td>
          </tr>
          <tr>
            <td><strong>Live Data Feeds</strong></td>
            <td>Monitor earthquakes, weather, and humanitarian reports from USGS, ReliefWeb, and Open-Meteo in real time</td>
          </tr>
          <tr>
            <td><strong>Gap Analysis</strong></td>
            <td>Identify missing data across humanitarian sectors and get recommendations for filling those gaps</td>
          </tr>
          <tr>
            <td><strong>Vulnerability Assessment</strong></td>
            <td>Score household vulnerability in 60 seconds using the Sudan RNA methodology</td>
          </tr>
          <tr>
            <td><strong>Secure Referrals</strong></td>
            <td>Encrypt and transfer sensitive beneficiary data between partner organizations</td>
          </tr>
          <tr>
            <td><strong>Survey System</strong></td>
            <td>Build, deploy, and analyze field surveys — with optional KoBoToolbox integration</td>
          </tr>
          <tr>
            <td><strong>Audit Trail</strong></td>
            <td>Record every decision with evidence, digital signatures, and full traceability</td>
          </tr>
          <tr>
            <td><strong>Interactive Map</strong></td>
            <td>Visualize crises geographically with severity coloring, clustering, and click-through detail</td>
          </tr>
        </tbody>
      </table>

      <DocsH2 id="quick-start">Quick start</DocsH2>
      <p>
        New to CLEAR? You can be up and running in under five minutes:
      </p>
      <ol>
        <li>
          <Link href="/docs/quickstart" className="font-medium">
            Set up your environment
          </Link>
          {" "}— clone the repo, install dependencies, and connect your database
        </li>
        <li>
          <strong>Sign in</strong> — create an account or log in with GitHub OAuth
        </li>
        <li>
          <strong>Explore the dashboard</strong> — see active crises, recent
          decisions, and alert summaries at a glance
        </li>
        <li>
          <strong>Run a rapid assessment</strong> — score a household&apos;s
          vulnerability in the field
        </li>
      </ol>

      <InfoBox type="tip">
        If you just want to explore the platform without setting up a local
        environment, check the{" "}
        <Link href="/docs/quickstart">Quickstart guide</Link> for details on
        connecting to a hosted database.
      </InfoBox>

      <DocsH2 id="documentation-sections">Documentation sections</DocsH2>
      <ul>
        <li>
          <Link href="/docs/quickstart"><strong>Get Started</strong></Link>
          {" "}— Installation, configuration, and your first session
        </li>
        <li>
          <Link href="/docs/platform/dashboard"><strong>Platform</strong></Link>
          {" "}— Dashboard, crisis management, and the interactive map
        </li>
        <li>
          <Link href="/docs/data/feeds"><strong>Data & Intelligence</strong></Link>
          {" "}— Live feeds, data source management, and gap analysis
        </li>
        <li>
          <Link href="/docs/field/surveys"><strong>Field Operations</strong></Link>
          {" "}— Surveys, vulnerability assessments, and secure referrals
        </li>
        <li>
          <Link href="/docs/accountability/audit"><strong>Accountability</strong></Link>
          {" "}— Audit trail, evidence management, and the feedback system
        </li>
        <li>
          <Link href="/docs/integrations/kobo"><strong>Integrations</strong></Link>
          {" "}— KoBoToolbox, USGS, ReliefWeb, and other external services
        </li>
        <li>
          <Link href="/docs/architecture/stack"><strong>Architecture</strong></Link>
          {" "}— Technical stack, API reference, and data flow
        </li>
      </ul>

      <DocsH2 id="getting-help">Getting help</DocsH2>
      <p>
        If you run into trouble or have questions, you can:
      </p>
      <ul>
        <li>Open an issue on the project repository</li>
        <li>Use the built-in <strong>feedback widget</strong> (available on every page when signed in)</li>
        <li>Contact your organization&apos;s CLEAR administrator</li>
      </ul>

      <DocsH2 id="ready">Ready?</DocsH2>
      <p>
        Head to the{" "}
        <Link href="/docs/quickstart">Quickstart guide</Link> to get your local
        environment running, or browse the feature documentation to learn what
        CLEAR can do for your team.
      </p>
    </DocsPage>
  );
}
