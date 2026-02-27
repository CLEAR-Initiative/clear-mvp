import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "KoBoToolbox Integration — CLEAR Docs" };

export default function KoBoIntegrationPage() {
  return (
    <DocsPage
      title="KoBoToolbox Integration"
      description="Connect CLEAR to KoBoToolbox — the most widely used mobile data collection tool in humanitarian response — to export survey templates, deploy forms, and sync field submissions back into a single operational picture."
      badge="INTEGRATIONS"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        KoBoToolbox is the backbone of field data collection for humanitarian
        organizations around the world. It is free, open-source, and purpose-built
        for challenging environments where connectivity is unreliable and time is
        short. CLEAR integrates directly with KoBo&apos;s REST API v2 so that your
        team can design surveys inside CLEAR, push them to KoBo for mobile data
        collection, and pull responses back in — all without leaving the platform
        or manually importing spreadsheets.
      </p>
      <p>
        Whether you are running rapid needs assessments in the field or
        coordinating multi-sector surveys across several offices, this integration
        eliminates the gap between data collection and decision-making.
      </p>

      <DocsH2 id="setup">Setup and configuration</DocsH2>
      <p>
        Connecting CLEAR to your KoBoToolbox account requires a single
        environment variable and takes less than a minute.
      </p>

      <DocsH3 id="environment-variables">Environment variables</DocsH3>
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
            <td><code>KOBO_API_TOKEN</code></td>
            <td>Yes</td>
            <td>
              Your personal API token from KoBoToolbox. You can find it in your
              KoBo account under{" "}
              <strong>Account Settings &rarr; Security &rarr; API Key</strong>.
            </td>
          </tr>
          <tr>
            <td><code>KOBO_SERVER_URL</code></td>
            <td>No</td>
            <td>
              The base URL of your KoBo server. Defaults to{" "}
              <code>kf.kobotoolbox.org</code> (the OCHA-hosted global server).
              Set this if your organization uses a self-hosted KoBo instance or
              the EU server.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Add these to your <code>.env</code> file:
      </p>
      <pre><code>{`KOBO_API_TOKEN="your-api-token-from-kobo-account-settings"
# Optional — defaults to kf.kobotoolbox.org
KOBO_SERVER_URL="https://kf.kobotoolbox.org"`}</code></pre>

      <InfoBox type="tip">
        If you are unsure which server your organization uses, check the URL you
        see when you log into KoBoToolbox. The global humanitarian server is{" "}
        <code>kf.kobotoolbox.org</code>, while the EU server is{" "}
        <code>eu.kobotoolbox.org</code>. Self-hosted instances will have a custom
        domain.
      </InfoBox>

      <DocsH3 id="connection-testing">Testing the connection</DocsH3>
      <p>
        Once your environment variables are set, navigate to the{" "}
        <strong>Settings</strong> page in CLEAR and open the{" "}
        <strong>KoBoToolbox</strong> tab. You will see a connection card that
        shows your current credentials status. Click{" "}
        <strong>Test Connection</strong> to validate that CLEAR can reach your
        KoBo server and authenticate successfully. A green confirmation means
        you are ready to go.
      </p>

      <DocsH2 id="exporting-surveys">Exporting surveys to KoBo</DocsH2>
      <p>
        CLEAR lets you design surveys using its built-in survey builder and then
        export them directly to KoBoToolbox. During export, CLEAR converts your
        survey template into KoBo-compatible XLSForm format, mapping each
        question type automatically:
      </p>
      <table>
        <thead>
          <tr>
            <th>CLEAR Question Type</th>
            <th>KoBo XLSForm Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>TEXT</code></td>
            <td><code>text</code></td>
          </tr>
          <tr>
            <td><code>NUMBER</code></td>
            <td><code>integer</code></td>
          </tr>
          <tr>
            <td><code>SINGLE_CHOICE</code></td>
            <td><code>select_one</code></td>
          </tr>
          <tr>
            <td><code>MULTIPLE_CHOICE</code></td>
            <td><code>select_multiple</code></td>
          </tr>
          <tr>
            <td><code>DATE</code></td>
            <td><code>date</code></td>
          </tr>
          <tr>
            <td><code>LOCATION</code></td>
            <td><code>geopoint</code></td>
          </tr>
          <tr>
            <td><code>SCALE</code></td>
            <td><code>range</code></td>
          </tr>
        </tbody>
      </table>
      <p>
        This mapping ensures that field enumerators see the correct input
        controls on their mobile devices — dropdowns for single-choice questions,
        checkboxes for multiple-choice, GPS capture for location fields, and so
        on.
      </p>

      <InfoBox type="info">
        The conversion is one-directional at export time. If you later modify the
        form inside KoBoToolbox directly, those changes will not be reflected back
        in CLEAR. We recommend treating CLEAR as the source of truth for survey
        design and KoBo as the collection endpoint.
      </InfoBox>

      <DocsH2 id="one-click-deploy">One-click deployment</DocsH2>
      <p>
        After exporting a survey, CLEAR handles the full deployment pipeline in a
        single action. When you click <strong>Deploy to KoBo</strong>, the
        following happens behind the scenes:
      </p>
      <ol>
        <li>
          The survey template is converted to XLSForm format with all question
          type mappings applied.
        </li>
        <li>
          CLEAR creates a new asset in your KoBoToolbox account via the API.
        </li>
        <li>
          The asset is deployed, making it immediately available for data
          collection on mobile devices.
        </li>
        <li>
          A record is created in CLEAR&apos;s <code>KoboDeployment</code> table to
          track the deployment status, KoBo asset ID, and sync metadata.
        </li>
      </ol>
      <p>
        Your field team can begin collecting responses within seconds of
        deployment — no manual steps in KoBoToolbox required.
      </p>

      <DocsH2 id="syncing-responses">Syncing responses</DocsH2>
      <p>
        Once data collection is underway, CLEAR can pull submissions back from
        KoBoToolbox into its own survey response system. The sync process handles
        all the necessary conversions — translating KoBo&apos;s geolocation format
        into CLEAR coordinates, converting question types back to CLEAR&apos;s
        internal schema, and associating each submission with the correct survey
        and deployment record.
      </p>
      <p>
        You can trigger a sync manually from the deployment detail view, or rely
        on the deployment tracking interface to monitor when new submissions are
        available.
      </p>

      <DocsH2 id="deployment-tracking">Deployment tracking</DocsH2>
      <p>
        The <strong>Settings</strong> page includes a dedicated{" "}
        <strong>KoBoToolbox</strong> tab with two main cards:
      </p>
      <ul>
        <li>
          <strong>Connection card</strong> — shows your authentication status
          and lets you test or update credentials.
        </li>
        <li>
          <strong>Deployments card</strong> — lists every survey that has been
          deployed to KoBo, along with its current sync status, submission count,
          and the last time responses were synced.
        </li>
      </ul>
      <p>
        Each deployment displays one of four sync statuses:
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
            <td><code>PENDING</code></td>
            <td>
              The survey has been deployed to KoBo but no sync has been
              attempted yet.
            </td>
          </tr>
          <tr>
            <td><code>SYNCING</code></td>
            <td>
              A sync is currently in progress — CLEAR is pulling submissions
              from KoBo.
            </td>
          </tr>
          <tr>
            <td><code>SYNCED</code></td>
            <td>
              All available submissions have been successfully imported into
              CLEAR.
            </td>
          </tr>
          <tr>
            <td><code>FAILED</code></td>
            <td>
              The last sync attempt encountered an error. Check the deployment
              detail for diagnostic information.
            </td>
          </tr>
        </tbody>
      </table>

      <DocsH2 id="reliability">Reliability and retry logic</DocsH2>
      <p>
        Field conditions are unpredictable, and so is network connectivity. CLEAR
        accounts for this with built-in resilience:
      </p>
      <ul>
        <li>
          <strong>Automatic retries</strong> — all API calls to KoBoToolbox are
          attempted up to 3 times before reporting a failure. Each retry uses
          exponential backoff, waiting progressively longer between attempts to
          avoid overwhelming the server.
        </li>
        <li>
          <strong>Rate limit handling</strong> — if KoBo responds with an HTTP
          429 (Too Many Requests) status, CLEAR respects the rate limit and waits
          before retrying, rather than failing immediately.
        </li>
      </ul>
      <p>
        This means that transient network issues or momentary KoBo server load
        spikes will not result in lost deployments or incomplete syncs. If a
        failure does occur after all retries are exhausted, the deployment status
        is set to <code>FAILED</code> and you can retry manually from the
        Settings page.
      </p>

      <InfoBox type="warning">
        If you consistently see <code>FAILED</code> statuses, verify that your
        API token has not expired and that your KoBo server URL is correct. Token
        rotation is a common cause of sudden sync failures, especially on
        self-hosted instances with stricter security policies.
      </InfoBox>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <p>
        With KoBoToolbox connected, your data collection pipeline is complete
        from design to deployment to analysis. Here are some related areas to
        explore:
      </p>
      <ul>
        <li>
          <Link href="/docs/integrations/apis">
            <strong>External APIs</strong>
          </Link>{" "}
          — learn how CLEAR pulls in real-time earthquake, weather, and
          humanitarian report data to enrich your operational picture.
        </li>
        <li>
          <Link href="/docs/field/assessments">
            <strong>Vulnerability Assessments</strong>
          </Link>{" "}
          — combine KoBo survey data with CLEAR&apos;s rapid assessment tools for
          faster, more informed field decisions.
        </li>
        <li>
          <Link href="/docs/configuration">
            <strong>Configuration</strong>
          </Link>{" "}
          — review the full list of environment variables and optional
          integrations available in CLEAR.
        </li>
      </ul>
    </DocsPage>
  );
}
