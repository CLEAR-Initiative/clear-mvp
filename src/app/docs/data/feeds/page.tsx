import Link from "next/link";
import { DocsPage, DocsH2, DocsH3, InfoBox } from "../../_components/docs-page";

export const metadata = { title: "Live Data Feeds — CLEAR Docs" };

export default function LiveDataFeedsPage() {
  return (
    <DocsPage
      title="Live Data Feeds"
      description="Monitor real-time humanitarian data from global sources — earthquakes, weather, and situational reports — without leaving the platform."
      badge="DATA & INTELLIGENCE"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        In a crisis, timely information is often the difference between an
        effective response and a missed one. CLEAR connects to external
        humanitarian data sources in real time so that your team can see what is
        happening on the ground — seismic events, weather patterns, and
        published situation reports — without switching between separate
        dashboards or waiting for colleagues to forward updates.
      </p>
      <p>
        All live feed data is displayed on the{" "}
        <Link href="/data" className="font-medium">
          /data
        </Link>{" "}
        page under the <strong>Live Feeds</strong> tab. You will find feed
        status cards at the top, followed by searchable tables for each data
        source.
      </p>

      <DocsH2 id="available-feeds">Available Feeds</DocsH2>
      <p>
        CLEAR ships with three built-in feeds. Each one pulls data from a
        well-established public API, so there is nothing to configure before you
        start seeing results.
      </p>

      <DocsH3 id="usgs-earthquakes">USGS Earthquakes</DocsH3>
      <p>
        The United States Geological Survey publishes a continuously updated
        catalogue of seismic events worldwide. CLEAR fetches this data and
        presents it as a sortable table showing <strong>location</strong>,{" "}
        <strong>magnitude</strong>, <strong>depth</strong>,{" "}
        <strong>timestamp</strong>, and whether a <strong>tsunami alert</strong>{" "}
        was issued.
      </p>
      <p>
        You can filter the feed by <strong>minimum magnitude</strong> (for
        example, M4.5+ to see only significant quakes) and by{" "}
        <strong>time period</strong> — the last hour, day, week, or month. This
        lets you zoom in on recent high-severity events or zoom out to review
        broader seismic trends. Magnitude values are colour-coded: M7.0 and
        above appear in red, M5.5&ndash;6.9 in the default accent, and anything
        below M5.5 in a subdued tone.
      </p>

      <DocsH3 id="reliefweb-reports">ReliefWeb Humanitarian Reports</DocsH3>
      <p>
        ReliefWeb, managed by the UN Office for the Coordination of
        Humanitarian Affairs (OCHA), is the primary global source for
        humanitarian situation reports, assessments, and policy documents. CLEAR
        pulls the latest reports and displays four key fields for each entry:
      </p>
      <ul>
        <li>
          <strong>Title</strong> — a clickable link that opens the full report
          on ReliefWeb
        </li>
        <li>
          <strong>Source</strong> — the publishing organization
        </li>
        <li>
          <strong>Country</strong> — the affected country
        </li>
        <li>
          <strong>Date</strong> — when the report was published
        </li>
      </ul>
      <p>
        By default, the ten most recent reports are shown. This gives your team
        a running snapshot of global humanitarian developments alongside the
        other feeds.
      </p>

      <DocsH3 id="open-meteo-weather">Open-Meteo Weather Data</DocsH3>
      <p>
        Open-Meteo provides free, high-resolution weather forecasts and
        historical data without requiring an API key. CLEAR uses it to retrieve
        current weather conditions — temperature, precipitation, wind speed,
        humidity, and general conditions — for any coordinate pair. This is
        particularly useful when you are tracking a crisis in a specific
        location and need to understand weather-related risks such as flooding,
        extreme heat, or storms that could affect displacement patterns or
        supply routes.
      </p>

      <DocsH2 id="feed-status-cards">Feed Status Cards</DocsH2>
      <p>
        At the top of the Live Feeds tab you will see a row of status cards —
        one for each connected feed. Each card displays:
      </p>
      <ul>
        <li>
          <strong>Feed name</strong> — e.g. &ldquo;USGS Earthquakes&rdquo;,
          &ldquo;ReliefWeb&rdquo;, or &ldquo;Open-Meteo Weather&rdquo;
        </li>
        <li>
          <strong>Status badge</strong> — a green &ldquo;online&rdquo; or red
          &ldquo;offline&rdquo; indicator so you can see at a glance whether the
          upstream service is reachable
        </li>
        <li>
          <strong>Last checked</strong> — the timestamp of the most recent
          connectivity check
        </li>
        <li>
          <strong>Record count</strong> — the number of records currently
          available from that feed
        </li>
      </ul>
      <p>
        These cards give your team instant situational awareness about whether
        the data pipelines are healthy. If a feed shows as offline, CLEAR will
        display whatever cached data is still available while it retries.
      </p>

      <InfoBox type="info">
        Feed status checks are cached for one minute to avoid unnecessary load
        on the upstream APIs. The full data feeds themselves are cached for five
        minutes. This means you will always see near-real-time data without
        risk of hitting external rate limits.
      </InfoBox>

      <DocsH2 id="caching-and-performance">Caching and Performance</DocsH2>
      <p>
        All feed data is fetched <strong>server-side</strong> and stored in an
        in-memory cache with a configurable time-to-live (TTL). The default TTL
        for data feeds is five minutes; the status check endpoint uses a
        shorter one-minute window. This architecture means:
      </p>
      <ul>
        <li>
          <strong>Fast page loads</strong> — feed data is ready before the page
          reaches the browser; there is no client-side loading spinner for the
          initial view.
        </li>
        <li>
          <strong>Rate-limit safety</strong> — repeated visits within the TTL
          window are served from cache, so CLEAR never floods an upstream API
          with requests.
        </li>
        <li>
          <strong>Graceful degradation</strong> — if an upstream service is
          temporarily unreachable, the most recent cached data is served along
          with the &ldquo;offline&rdquo; status badge so your team still has
          context.
        </li>
      </ul>

      <DocsH2 id="how-to-use">How to Use the Live Feeds</DocsH2>
      <ol>
        <li>
          Navigate to{" "}
          <Link href="/data" className="font-medium">
            /data
          </Link>{" "}
          and select the <strong>Live Feeds</strong> tab.
        </li>
        <li>
          Review the status cards at the top to confirm all feeds are online.
        </li>
        <li>
          Scroll down to the <strong>Recent Earthquakes</strong> table to see
          significant seismic events. Click any location link to open the full
          USGS event page.
        </li>
        <li>
          Continue to the <strong>ReliefWeb Reports</strong> table for the
          latest humanitarian reports. Click a title to read the full document.
        </li>
        <li>
          Weather data appears contextually throughout the platform — for
          example, when viewing a specific crisis with known coordinates.
        </li>
      </ol>

      <InfoBox type="tip">
        Use the earthquake magnitude filter to focus on events most relevant to
        your response threshold. For rapid-onset disaster monitoring, M5.0+ in
        the last 24 hours is a common starting point.
      </InfoBox>

      <DocsH2 id="next-steps">Next Steps</DocsH2>
      <ul>
        <li>
          <Link href="/docs/data/sources" className="font-medium">
            Data Sources
          </Link>{" "}
          — Learn how to register and manage your own organizational data
          sources alongside the live feeds.
        </li>
        <li>
          <Link href="/docs/data/gap-analysis" className="font-medium">
            Gap Analysis
          </Link>{" "}
          — Discover which data you are missing and get recommendations for
          filling those gaps.
        </li>
        <li>
          <Link href="/docs/integrations/apis" className="font-medium">
            External APIs
          </Link>{" "}
          — Explore the technical details of how CLEAR integrates with USGS,
          ReliefWeb, and Open-Meteo.
        </li>
      </ul>
    </DocsPage>
  );
}
