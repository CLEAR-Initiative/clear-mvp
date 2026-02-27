import Link from "next/link";
import { DocsPage, DocsH2, DocsH3, InfoBox } from "../_components/docs-page";

export const metadata = { title: "Configuration — CLEAR Docs" };

export default function ConfigurationPage() {
  return (
    <DocsPage
      title="Configuration"
      description="A complete reference for every environment variable, database option, and optional integration in the CLEAR platform."
      badge="GET STARTED"
    >
      <DocsH2 id="environment-variables">Environment variables</DocsH2>
      <p>
        CLEAR is configured through a <code>.env</code> file in the project
        root. All variables are validated at startup using Zod schemas (defined
        in <code>src/env.js</code>), so the application will tell you
        immediately if something is missing or malformed.
      </p>
      <p>
        The table below lists every variable the platform recognizes. Only one
        is strictly required for local development — the rest unlock additional
        features when you are ready for them.
      </p>

      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>DATABASE_URL</code></td>
            <td>Yes</td>
            <td>
              PostgreSQL connection string. Must be a valid URL (e.g.{" "}
              <code>postgresql://user:pass@host:5432/dbname</code>).
            </td>
          </tr>
          <tr>
            <td><code>BETTER_AUTH_SECRET</code></td>
            <td>Production only</td>
            <td>
              A random secret used to sign authentication tokens. Optional in
              development; <strong>required</strong> when{" "}
              <code>NODE_ENV=production</code>.
            </td>
          </tr>
          <tr>
            <td><code>BETTER_AUTH_GITHUB_CLIENT_ID</code></td>
            <td>No</td>
            <td>
              GitHub OAuth application client ID. Enables the &quot;Sign in with
              GitHub&quot; button.
            </td>
          </tr>
          <tr>
            <td><code>BETTER_AUTH_GITHUB_CLIENT_SECRET</code></td>
            <td>No</td>
            <td>
              GitHub OAuth application client secret. Must be paired with the
              client ID above.
            </td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_MAPBOX_TOKEN</code></td>
            <td>No</td>
            <td>
              Mapbox GL access token. Enables the interactive crisis map. This
              is a <em>client-side</em> variable (prefixed with{" "}
              <code>NEXT_PUBLIC_</code>).
            </td>
          </tr>
          <tr>
            <td><code>REFERRAL_ENCRYPTION_KEY</code></td>
            <td>No</td>
            <td>
              Encryption key for securing sensitive beneficiary referral data at
              rest. When set, referral records are encrypted before being stored
              in the database.
            </td>
          </tr>
          <tr>
            <td><code>KOBO_API_TOKEN</code></td>
            <td>No</td>
            <td>
              API token for your KoBoToolbox account. Required for syncing
              surveys and submissions.
            </td>
          </tr>
          <tr>
            <td><code>KOBO_SERVER_URL</code></td>
            <td>No</td>
            <td>
              The base URL of your KoBoToolbox server (e.g.{" "}
              <code>https://kf.kobotoolbox.org</code>). Must be a valid URL if
              provided.
            </td>
          </tr>
        </tbody>
      </table>

      <InfoBox type="tip">
        Start with just <code>DATABASE_URL</code>. You can always add the
        optional variables later as your team&apos;s needs grow. CLEAR is
        designed to degrade gracefully — features that depend on missing
        variables will simply not appear in the interface.
      </InfoBox>

      <DocsH3 id="example-env-file">Example .env file</DocsH3>
      <p>
        Here is a complete example with every variable. Copy this into your{" "}
        <code>.env</code> file and fill in only the values you need:
      </p>
      <pre><code>{`# Required
DATABASE_URL="postgresql://postgres:password@localhost:5432/clear-mvp"

# Required in production
BETTER_AUTH_SECRET="your-secret-here"

# Optional — GitHub OAuth
BETTER_AUTH_GITHUB_CLIENT_ID=""
BETTER_AUTH_GITHUB_CLIENT_SECRET=""

# Optional — Interactive map
NEXT_PUBLIC_MAPBOX_TOKEN=""

# Optional — Referral encryption
REFERRAL_ENCRYPTION_KEY=""

# Optional — KoBoToolbox integration
KOBO_API_TOKEN=""
KOBO_SERVER_URL="https://kf.kobotoolbox.org"`}</code></pre>

      <InfoBox type="warning">
        Never commit your <code>.env</code> file to version control. It is
        already included in <code>.gitignore</code>, but take care when
        copying configuration between machines — especially if your{" "}
        <code>DATABASE_URL</code> contains production credentials.
      </InfoBox>

      <DocsH2 id="database">Database</DocsH2>
      <p>
        CLEAR uses PostgreSQL as its sole data store, accessed through Prisma
        ORM. Whether you run Postgres locally, in a Docker container, or on a
        managed cloud service, the setup is the same: provide a connection
        string and let Prisma handle the rest.
      </p>

      <DocsH3 id="hosted-database">Using a hosted database (Railway)</DocsH3>
      <p>
        If you do not want to install PostgreSQL locally — a common choice for
        field workers on shared laptops — you can create a free hosted database
        in under a minute:
      </p>
      <ol>
        <li>
          Go to{" "}
          <a
            href="https://railway.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            railway.app
          </a>{" "}
          and sign in (GitHub login works)
        </li>
        <li>
          Click <strong>New Project</strong> and select{" "}
          <strong>Provision PostgreSQL</strong>
        </li>
        <li>
          Once the database is ready, click on it, go to the{" "}
          <strong>Variables</strong> tab, and copy the{" "}
          <code>DATABASE_URL</code> value
        </li>
        <li>
          Paste that value into your <code>.env</code> file
        </li>
      </ol>

      <InfoBox type="info">
        <a href="https://neon.tech" target="_blank" rel="noopener noreferrer">
          Neon
        </a>{" "}
        is another excellent free option that provides serverless PostgreSQL
        with generous free-tier limits. The process is similar: create a
        project, copy the connection string, paste it into your{" "}
        <code>.env</code>.
      </InfoBox>

      <DocsH3 id="db-commands">Database commands</DocsH3>
      <p>
        CLEAR provides several npm scripts for managing your database. Here is
        what each one does:
      </p>
      <table>
        <thead>
          <tr>
            <th>Command</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>npm run db:push</code></td>
            <td>
              Reads the Prisma schema and creates or updates all database
              tables. Does not generate migration files — ideal for rapid local
              development.
            </td>
          </tr>
          <tr>
            <td><code>npm run db:seed</code></td>
            <td>
              Populates the database with realistic sample data (crises,
              decisions, data sources, users). Safe to run multiple times.
            </td>
          </tr>
          <tr>
            <td><code>npm run db:studio</code></td>
            <td>
              Opens Prisma Studio — a visual database browser at{" "}
              <code>http://localhost:5555</code>. Extremely useful for
              inspecting records, debugging queries, and understanding the data
              model.
            </td>
          </tr>
          <tr>
            <td><code>npm run db:generate</code></td>
            <td>
              Runs <code>prisma migrate dev</code> to create a new migration
              file. Use this when you change the Prisma schema and want to
              preserve migration history.
            </td>
          </tr>
          <tr>
            <td><code>npm run db:migrate</code></td>
            <td>
              Runs <code>prisma migrate deploy</code> to apply pending
              migrations. Typically used in CI/CD or production deployments.
            </td>
          </tr>
        </tbody>
      </table>

      <InfoBox type="tip">
        During active development, the workflow is usually:{" "}
        <code>db:push</code> to sync your schema, <code>db:seed</code> to load
        sample data, and <code>db:studio</code> when you need to inspect
        what&apos;s in the database. You rarely need the migration commands
        until you are preparing for a production deployment.
      </InfoBox>

      <DocsH2 id="authentication">Authentication</DocsH2>
      <p>
        CLEAR uses{" "}
        <a
          href="https://www.better-auth.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Better Auth
        </a>{" "}
        for authentication — a modern, flexible auth library for Next.js
        applications. Out of the box, email-and-password login works with zero
        configuration. GitHub OAuth is available as an optional addition.
      </p>

      <DocsH3 id="email-password-auth">Email and password (built-in)</DocsH3>
      <p>
        This is the default authentication method and requires no additional
        setup. Users can sign up with any email address and a password. In
        development mode, no email verification is required — accounts are
        active immediately.
      </p>
      <p>
        For production deployments, make sure <code>BETTER_AUTH_SECRET</code>{" "}
        is set to a strong random value. This secret is used to sign session
        tokens and must not be shared or committed to version control.
      </p>
      <pre><code>{`# Generate a secure secret
openssl rand -base64 32`}</code></pre>

      <DocsH3 id="github-oauth">GitHub OAuth (optional)</DocsH3>
      <p>
        If your team uses GitHub, you can enable social login so that staff do
        not need to manage a separate password for CLEAR. Here is how to set
        it up:
      </p>
      <ol>
        <li>
          Go to{" "}
          <a
            href="https://github.com/settings/developers"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Developer Settings
          </a>{" "}
          and click <strong>New OAuth App</strong>
        </li>
        <li>
          Set the <strong>Homepage URL</strong> to{" "}
          <code>http://localhost:3000</code> (or your production domain)
        </li>
        <li>
          Set the <strong>Authorization callback URL</strong> to{" "}
          <code>http://localhost:3000/api/auth/callback/github</code>
        </li>
        <li>Click <strong>Register application</strong></li>
        <li>
          Copy the <strong>Client ID</strong> and generate a{" "}
          <strong>Client Secret</strong>
        </li>
        <li>
          Add both values to your <code>.env</code> file:
        </li>
      </ol>
      <pre><code>{`BETTER_AUTH_GITHUB_CLIENT_ID="your-client-id"
BETTER_AUTH_GITHUB_CLIENT_SECRET="your-client-secret"`}</code></pre>
      <p>
        Restart the dev server, and a <strong>Sign in with GitHub</strong>{" "}
        button will appear on the login page automatically.
      </p>

      <InfoBox type="info">
        Both authentication methods can coexist. A user who signs in with
        GitHub and later tries email/password (or vice versa) will be
        recognized as the same account if the email addresses match.
      </InfoBox>

      <DocsH2 id="optional-integrations">Optional integrations</DocsH2>
      <p>
        CLEAR is designed to be useful out of the box, but it becomes even more
        powerful when connected to external services. Each integration below is
        entirely optional — enable only the ones your team needs.
      </p>

      <DocsH3 id="mapbox">Mapbox (interactive maps)</DocsH3>
      <p>
        The interactive crisis map uses{" "}
        <a
          href="https://www.mapbox.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Mapbox GL JS
        </a>{" "}
        to render geographic data with severity coloring, clustering, and
        click-through detail. To enable it:
      </p>
      <ol>
        <li>
          Create a free account at{" "}
          <a
            href="https://account.mapbox.com/auth/signup/"
            target="_blank"
            rel="noopener noreferrer"
          >
            mapbox.com
          </a>
        </li>
        <li>
          Go to your{" "}
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Access Tokens
          </a>{" "}
          page and copy your default public token
        </li>
        <li>
          Add it to your <code>.env</code> file:
        </li>
      </ol>
      <pre><code>{`NEXT_PUBLIC_MAPBOX_TOKEN="pk.your-token-here"`}</code></pre>
      <p>
        The map will appear automatically on the dashboard and crisis detail
        pages once the token is set. Without it, those sections will gracefully
        fall back to a list view.
      </p>

      <InfoBox type="tip">
        Mapbox&apos;s free tier includes 50,000 map loads per month — more than
        enough for most humanitarian teams. If your deployment serves a larger
        organization, review their{" "}
        <a
          href="https://www.mapbox.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
        >
          pricing page
        </a>{" "}
        for volume options.
      </InfoBox>

      <DocsH3 id="kobotoolbox">KoBoToolbox (survey integration)</DocsH3>
      <p>
        <a
          href="https://www.kobotoolbox.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          KoBoToolbox
        </a>{" "}
        is the most widely used data collection platform in humanitarian
        response. CLEAR can sync directly with your KoBoToolbox account to
        import survey forms and submissions.
      </p>
      <ol>
        <li>
          Log in to your KoBoToolbox account and navigate to{" "}
          <strong>Account Settings</strong>
        </li>
        <li>
          Under <strong>Security</strong>, find or generate your{" "}
          <strong>API Token</strong>
        </li>
        <li>
          Add the token and your server URL to <code>.env</code>:
        </li>
      </ol>
      <pre><code>{`KOBO_API_TOKEN="your-api-token"
KOBO_SERVER_URL="https://kf.kobotoolbox.org"`}</code></pre>

      <InfoBox type="info">
        The server URL depends on which KoBoToolbox instance you use. The
        global humanitarian server is{" "}
        <code>https://kf.kobotoolbox.org</code>. If your organization runs a
        private instance, use that URL instead.
      </InfoBox>

      <DocsH3 id="referral-encryption">Referral encryption</DocsH3>
      <p>
        When handling sensitive beneficiary data — names, locations, protection
        concerns — CLEAR can encrypt referral records at rest in the database.
        This adds a critical layer of protection in case the database is ever
        compromised.
      </p>
      <p>
        To enable encryption, generate a key and add it to your{" "}
        <code>.env</code> file:
      </p>
      <pre><code>{`# Generate a 256-bit encryption key
openssl rand -base64 32`}</code></pre>
      <pre><code>{`REFERRAL_ENCRYPTION_KEY="your-generated-key-here"`}</code></pre>

      <InfoBox type="warning">
        Store this key securely. If you lose the encryption key, any referral
        data encrypted with it becomes permanently unrecoverable. We strongly
        recommend keeping a backup of this key in a password manager or secure
        vault used by your organization.
      </InfoBox>

      <DocsH2 id="skip-env-validation">Skipping environment validation</DocsH2>
      <p>
        In some situations — such as Docker builds or CI pipelines where
        environment variables are injected at runtime — you may need to build
        the application without all variables present. You can bypass
        validation by setting:
      </p>
      <pre><code>{`SKIP_ENV_VALIDATION=1 npm run build`}</code></pre>
      <p>
        Use this sparingly. The validation exists to catch configuration
        mistakes early, and skipping it means errors will surface at runtime
        instead.
      </p>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <p>
        With your environment configured, you are ready to dive into the
        platform:
      </p>
      <ul>
        <li>
          <Link href="/docs/platform/dashboard">
            <strong>Dashboard</strong>
          </Link>{" "}
          — learn how to read and navigate the main overview screen
        </li>
        <li>
          <Link href="/docs/platform/crises">
            <strong>Crisis Management</strong>
          </Link>{" "}
          — create, track, and resolve crises with decision audit trails
        </li>
        <li>
          <Link href="/docs/data/feeds">
            <strong>Live Data Feeds</strong>
          </Link>{" "}
          — connect to real-time earthquake, weather, and humanitarian data
        </li>
        <li>
          <Link href="/docs/field/surveys">
            <strong>Survey System</strong>
          </Link>{" "}
          — build and deploy field surveys with optional KoBoToolbox sync
        </li>
        <li>
          <Link href="/docs/architecture/stack">
            <strong>Tech Stack</strong>
          </Link>{" "}
          — understand the full architecture for contributors and developers
        </li>
      </ul>
    </DocsPage>
  );
}
