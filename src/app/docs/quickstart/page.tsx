import Link from "next/link";
import { DocsPage, DocsH2, DocsH3, InfoBox } from "../_components/docs-page";

export const metadata = { title: "Quickstart — CLEAR Docs" };

export default function QuickstartPage() {
  return (
    <DocsPage
      title="Quickstart"
      description="Go from zero to a running CLEAR instance in under five minutes. This guide walks you through every step — no assumptions, no shortcuts."
      badge="GET STARTED"
    >
      <DocsH2 id="prerequisites">Prerequisites</DocsH2>
      <p>
        Before you begin, make sure you have the following tools installed on
        your machine. If you are working from a humanitarian field office with
        limited bandwidth, consider downloading installers ahead of time on a
        stronger connection.
      </p>
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Minimum Version</th>
            <th>How to check</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Node.js</strong></td>
            <td>18.0 or higher</td>
            <td><code>node -v</code></td>
          </tr>
          <tr>
            <td><strong>npm</strong></td>
            <td>9.0 or higher (ships with Node)</td>
            <td><code>npm -v</code></td>
          </tr>
          <tr>
            <td><strong>PostgreSQL</strong></td>
            <td>14.0 or higher</td>
            <td><code>psql --version</code></td>
          </tr>
          <tr>
            <td><strong>Git</strong></td>
            <td>2.0 or higher</td>
            <td><code>git --version</code></td>
          </tr>
        </tbody>
      </table>

      <InfoBox type="tip">
        Don&apos;t have PostgreSQL installed locally? You can spin up a free
        hosted database on{" "}
        <a href="https://railway.app" target="_blank" rel="noopener noreferrer">
          Railway
        </a>{" "}
        or{" "}
        <a href="https://neon.tech" target="_blank" rel="noopener noreferrer">
          Neon
        </a>{" "}
        in under a minute. Both provide a connection string you can paste
        straight into your <code>.env</code> file. See the{" "}
        <Link href="/docs/configuration#database">Configuration guide</Link>{" "}
        for details.
      </InfoBox>

      <DocsH2 id="clone-and-install">Clone and install</DocsH2>
      <p>
        Open your terminal and run the following commands. The first clones the
        CLEAR repository to your machine; the second installs all dependencies
        (including Prisma, which auto-generates on <code>postinstall</code>).
      </p>
      <pre><code>{`git clone https://github.com/your-org/clear-mvp.git
cd clear-mvp
npm install`}</code></pre>
      <p>
        Installation typically takes 30-60 seconds on a broadband connection.
        When it finishes, you should see a confirmation that Prisma Client was
        generated — that means everything is wired up correctly.
      </p>

      <DocsH2 id="environment-variables">Set up environment variables</DocsH2>
      <p>
        CLEAR uses a <code>.env</code> file in the project root to store
        configuration secrets. An example file is included to get you started:
      </p>
      <pre><code>{`cp .env.example .env`}</code></pre>
      <p>
        Now open <code>.env</code> in your editor and fill in the required
        values:
      </p>
      <pre><code>{`# Required — your PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/clear-mvp"

# Required in production, optional in development
BETTER_AUTH_SECRET="any-long-random-string-here"`}</code></pre>

      <DocsH3 id="generating-a-secret">Generating a secret</DocsH3>
      <p>
        For <code>BETTER_AUTH_SECRET</code>, any sufficiently long random string
        will do. Here is one way to generate one from your terminal:
      </p>
      <pre><code>{`openssl rand -base64 32`}</code></pre>
      <p>
        Copy the output and paste it as the value. In development mode this
        variable is optional, but we recommend setting it now so you do not
        forget before deploying.
      </p>

      <InfoBox type="info">
        There are several more environment variables for optional features like
        GitHub OAuth, Mapbox maps, and KoBoToolbox integration. You can add
        those later — they are not needed to get started. See the full{" "}
        <Link href="/docs/configuration">Configuration guide</Link> for the
        complete list.
      </InfoBox>

      <DocsH2 id="database-setup">Push the database schema and seed data</DocsH2>
      <p>
        With your <code>DATABASE_URL</code> in place, you can now create all
        the tables CLEAR needs and populate them with sample data. Run these
        two commands in order:
      </p>
      <pre><code>{`npm run db:push
npm run db:seed`}</code></pre>
      <p>
        <strong><code>db:push</code></strong> reads the Prisma schema and creates
        (or updates) all tables in your database without generating migration
        files — ideal for local development.
      </p>
      <p>
        <strong><code>db:seed</code></strong> populates the database with
        realistic sample data: example crises, decisions, data sources, and
        more. This gives you something meaningful to explore when you first
        log in.
      </p>

      <InfoBox type="warning">
        If <code>db:push</code> fails with a connection error, double-check
        that your PostgreSQL server is running and that the{" "}
        <code>DATABASE_URL</code> in your <code>.env</code> file is correct.
        Common mistakes include a wrong port number or a missing database name.
      </InfoBox>

      <DocsH2 id="start-dev-server">Start the development server</DocsH2>
      <p>
        You are almost there. Start the Next.js development server with Turbopack
        for fast refresh:
      </p>
      <pre><code>{`npm run dev`}</code></pre>
      <p>
        After a few seconds you should see output confirming the server is
        running, typically at{" "}
        <code>http://localhost:3000</code>. Open that URL in your browser.
      </p>

      <DocsH2 id="first-login">Your first login</DocsH2>
      <p>
        When you open CLEAR for the first time, you will be presented with a
        sign-in screen. You have two ways to authenticate:
      </p>

      <DocsH3 id="email-password">Email and password</DocsH3>
      <p>
        The simplest option. Click <strong>Sign Up</strong>, enter an email
        address and a password, and you will be taken straight into the
        platform. No email verification is required in development mode — this
        is designed for speed when you are setting up or testing locally.
      </p>

      <DocsH3 id="github-oauth">GitHub OAuth (optional)</DocsH3>
      <p>
        If you have configured <code>BETTER_AUTH_GITHUB_CLIENT_ID</code> and{" "}
        <code>BETTER_AUTH_GITHUB_CLIENT_SECRET</code> in your{" "}
        <code>.env</code> file, a <strong>Sign in with GitHub</strong> button
        will appear. This is convenient for development teams who already use
        GitHub, but it is entirely optional. See the{" "}
        <Link href="/docs/configuration#github-oauth">
          Configuration guide
        </Link>{" "}
        for setup instructions.
      </p>

      <DocsH2 id="quick-tour">Quick tour: what you will see</DocsH2>
      <p>
        Once you are signed in, take a moment to orient yourself. CLEAR is
        organized around a sidebar navigation on the left and a main content
        area on the right.
      </p>

      <DocsH3 id="sidebar-navigation">Sidebar navigation</DocsH3>
      <p>
        The sidebar is your primary way of moving through the platform. You
        will find links to:
      </p>
      <ul>
        <li>
          <strong>Dashboard</strong> — a high-level overview of active crises,
          recent decisions, and alert summaries
        </li>
        <li>
          <strong>Crises</strong> — the full list of tracked crises with
          severity indicators and status filters
        </li>
        <li>
          <strong>Data Feeds</strong> — live earthquake, weather, and
          humanitarian report streams
        </li>
        <li>
          <strong>Assessments</strong> — rapid vulnerability scoring tools for
          field use
        </li>
        <li>
          <strong>Referrals</strong> — encrypted beneficiary referral
          management
        </li>
        <li>
          <strong>Surveys</strong> — field data collection with optional
          KoBoToolbox sync
        </li>
      </ul>

      <DocsH3 id="dashboard-overview">Dashboard</DocsH3>
      <p>
        The dashboard is your landing page after login. If you ran{" "}
        <code>db:seed</code>, you will see it populated with sample crises,
        recent activity, and summary statistics. This is where most users
        begin their day — a single screen that answers the question:{" "}
        <em>what needs my attention right now?</em>
      </p>

      <InfoBox type="tip">
        Explore freely — the seed data is designed to be realistic but
        disposable. You cannot break anything by clicking around. If you ever
        want to start fresh, just run <code>npm run db:push -- --force-reset</code>{" "}
        followed by <code>npm run db:seed</code> to rebuild the database from
        scratch.
      </InfoBox>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <p>
        Congratulations — you have a fully running CLEAR instance. From here, we
        recommend:
      </p>
      <ul>
        <li>
          <Link href="/docs/configuration">
            <strong>Configuration</strong>
          </Link>{" "}
          — set up optional integrations like Mapbox maps, GitHub OAuth, and
          KoBoToolbox
        </li>
        <li>
          <Link href="/docs/platform/dashboard">
            <strong>Dashboard guide</strong>
          </Link>{" "}
          — learn how to read and interact with the dashboard
        </li>
        <li>
          <Link href="/docs/platform/crises">
            <strong>Crisis Management</strong>
          </Link>{" "}
          — understand how to create, track, and resolve crises
        </li>
        <li>
          <Link href="/docs/field/assessments">
            <strong>Vulnerability Assessment</strong>
          </Link>{" "}
          — try running a rapid needs assessment in under 60 seconds
        </li>
      </ul>
      <p>
        If anything went wrong during setup, check the{" "}
        <Link href="/docs/configuration">Configuration guide</Link> for
        troubleshooting details, or open an issue on the project repository.
        We want this to work for you.
      </p>
    </DocsPage>
  );
}
