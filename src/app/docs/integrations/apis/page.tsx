import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "External APIs — CLEAR Docs" };

export default function ExternalApisPage() {
  return (
    <DocsPage
      title="External APIs"
      description="CLEAR connects to several external data sources for real-time crisis monitoring — bringing earthquake alerts, humanitarian reports, and weather conditions into a single operational feed so your team never has to switch between tabs to understand what is happening."
      badge="INTEGRATIONS"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        Humanitarian crises do not announce themselves through a single channel.
        An earthquake strikes and you need seismological data. Flooding follows
        and you need weather forecasts. Displacement begins and you need
        situation reports from agencies already on the ground. CLEAR aggregates
        these data sources into one unified feed, accessible from the{" "}
        <strong>/data</strong> page under the <strong>Live Feeds</strong> tab, so
        your team can monitor evolving conditions without leaving the platform.
      </p>
      <p>
        All external data is fetched server-side via tRPC procedures. This means
        your users never make direct requests to third-party APIs from their
        browsers — CLEAR handles authentication, caching, and error handling on
        the server, then delivers clean, structured data to the frontend.
      </p>

      <DocsH2 id="usgs-earthquake">USGS Earthquake API</DocsH2>
      <p>
        The United States Geological Survey provides one of the most reliable
        real-time earthquake data feeds in the world. CLEAR connects to the USGS
        Earthquake API to surface significant seismic events as they happen,
        giving your team immediate awareness of earthquakes that could trigger or
        compound a humanitarian crisis.
      </p>
      <p>
        Each earthquake record includes:
      </p>
      <ul>
        <li>
          <strong>Location</strong> — the geographic coordinates and a
          human-readable place description (e.g., &ldquo;72 km NW of
          Kathmandu, Nepal&rdquo;).
        </li>
        <li>
          <strong>Magnitude</strong> — the seismic magnitude on the Richter
          scale, filterable by minimum threshold.
        </li>
        <li>
          <strong>Depth</strong> — how deep below the surface the earthquake
          originated, which affects the severity of surface-level damage.
        </li>
        <li>
          <strong>Tsunami warning</strong> — a boolean flag indicating whether
          a tsunami advisory has been issued for the event.
        </li>
        <li>
          <strong>Time period</strong> — results can be filtered by time range
          to focus on the most recent activity or review historical patterns.
        </li>
        <li>
          <strong>USGS detail link</strong> — a direct link to the full event
          page on the USGS website for in-depth technical analysis.
        </li>
      </ul>

      <InfoBox type="info">
        The USGS API is free and does not require an API key. CLEAR uses the
        GeoJSON summary feeds, which are updated every few minutes and cover
        significant earthquakes worldwide.
      </InfoBox>

      <DocsH2 id="reliefweb">ReliefWeb API</DocsH2>
      <p>
        ReliefWeb, managed by the United Nations Office for the Coordination of
        Humanitarian Affairs (OCHA), is the leading source for humanitarian
        situation reports, assessments, and updates. CLEAR pulls from the
        ReliefWeb API to surface the latest reports relevant to active crises,
        filtered by relevance so your team sees the most pertinent information
        first.
      </p>
      <p>
        Each report includes:
      </p>
      <ul>
        <li>
          <strong>Title</strong> — the headline of the situation report or
          assessment.
        </li>
        <li>
          <strong>Source organization</strong> — the agency or body that
          published the report (e.g., UNHCR, WFP, OCHA).
        </li>
        <li>
          <strong>Country</strong> — the affected country or region.
        </li>
        <li>
          <strong>Publication date</strong> — when the report was released.
        </li>
        <li>
          <strong>Direct link</strong> — a URL to the full report on ReliefWeb
          for detailed reading and download.
        </li>
      </ul>
      <p>
        This feed is particularly valuable during the early hours of a crisis,
        when multiple agencies are publishing rapid assessments and your team
        needs to stay current without manually checking a dozen websites.
      </p>

      <InfoBox type="tip">
        ReliefWeb reports are sorted by relevance by default. If you are tracking
        a specific country or disaster type, use the crisis detail page in CLEAR
        to see reports that have been contextually linked to that event.
      </InfoBox>

      <DocsH2 id="open-meteo">Open-Meteo Weather API</DocsH2>
      <p>
        Weather conditions play a critical role in humanitarian operations —
        they affect logistics, displacement patterns, shelter needs, and health
        risks. CLEAR uses the Open-Meteo API to fetch current weather data for
        crisis locations, providing your team with the environmental context they
        need to make informed decisions.
      </p>
      <p>
        Weather data includes:
      </p>
      <ul>
        <li>
          <strong>Temperature</strong> — current temperature at the crisis
          location, essential for assessing shelter and health needs.
        </li>
        <li>
          <strong>Wind speed</strong> — wind conditions that may affect
          logistics, aviation, and temporary structures.
        </li>
        <li>
          <strong>Precipitation</strong> — rainfall or snowfall data that can
          indicate flooding risk or road accessibility issues.
        </li>
      </ul>

      <InfoBox type="tip">
        Open-Meteo is completely free and requires no API key. It provides
        reliable global coverage, making it ideal for humanitarian operations
        that span multiple countries and regions.
      </InfoBox>

      <DocsH2 id="caching">Caching and performance</DocsH2>
      <p>
        External APIs can be slow, rate-limited, or temporarily unavailable —
        none of which should slow down your team during a crisis. CLEAR employs
        in-memory caching with a configurable time-to-live (TTL) for each data
        source. When a feed is requested, CLEAR first checks the cache. If a
        fresh result is available, it is returned instantly without making an
        external network call.
      </p>
      <p>
        This caching strategy delivers two important benefits:
      </p>
      <ul>
        <li>
          <strong>Faster response times</strong> — repeated requests within the
          TTL window are served from memory, which is especially important for
          teams working on slow or satellite-based connections.
        </li>
        <li>
          <strong>Rate limit protection</strong> — by consolidating requests
          through the cache, CLEAR avoids hitting external API rate limits even
          when many users are viewing the same feed simultaneously.
        </li>
      </ul>

      <DocsH2 id="error-handling">Error handling and graceful degradation</DocsH2>
      <p>
        In humanitarian operations, you cannot afford to have your entire
        situational awareness platform go down because a single external API is
        experiencing issues. CLEAR is designed with graceful degradation at its
        core: if an external API is unreachable or returns an error, the
        affected feed displays an <strong>&ldquo;offline&rdquo;</strong> status
        badge rather than breaking the page or showing a confusing error message.
      </p>
      <p>
        The rest of the platform continues to function normally. Other data
        feeds remain active, your crisis management tools stay available, and
        the offline feed will automatically recover once the external service
        comes back online.
      </p>

      <InfoBox type="info">
        Graceful degradation means your team always has access to the data that
        is available, even when some sources are temporarily down. In a fast-moving
        crisis, partial information is far better than no information at all.
      </InfoBox>

      <DocsH2 id="feed-status">Feed status monitoring</DocsH2>
      <p>
        The <strong>Live Feeds</strong> tab on the <strong>/data</strong> page
        provides transparent status monitoring for every connected external
        source. Each feed card displays:
      </p>
      <ul>
        <li>
          <strong>Online / Offline status</strong> — a clear indicator of
          whether the source is currently reachable and returning data.
        </li>
        <li>
          <strong>Last check time</strong> — when CLEAR last attempted to fetch
          data from the source, so you know how current the information is.
        </li>
        <li>
          <strong>Available record count</strong> — how many records were
          returned in the most recent fetch, giving you a quick sense of data
          volume.
        </li>
      </ul>
      <p>
        This transparency ensures that your team always knows exactly which data
        sources are informing their decisions and which ones may need attention.
      </p>

      <DocsH2 id="architecture">Technical architecture</DocsH2>
      <p>
        For technical integrators, here is how the data flow works:
      </p>
      <ol>
        <li>
          A user navigates to the <strong>/data</strong> page and opens the{" "}
          <strong>Live Feeds</strong> tab.
        </li>
        <li>
          The frontend calls a tRPC procedure for each data source.
        </li>
        <li>
          On the server, the tRPC procedure checks the in-memory cache. If a
          fresh result exists within the TTL window, it is returned immediately.
        </li>
        <li>
          If the cache is stale or empty, the server makes an HTTP request to
          the external API, processes the response into CLEAR&apos;s normalized
          data format, stores it in the cache, and returns it to the client.
        </li>
        <li>
          If the external request fails, the server returns a structured error
          response that the frontend renders as an &ldquo;offline&rdquo; status
          badge.
        </li>
      </ol>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <p>
        The external data feeds are one piece of CLEAR&apos;s broader data
        ecosystem. To get the most out of the platform, explore these related
        capabilities:
      </p>
      <ul>
        <li>
          <Link href="/docs/integrations/kobo" className="font-medium">
            KoBoToolbox Integration
          </Link>{" "}
          — connect your mobile data collection pipeline to push surveys and
          pull responses directly through CLEAR.
        </li>
        <li>
          <Link href="/docs/platform/crises" className="font-medium">
            Crisis Management
          </Link>{" "}
          — see how live feed data contextualizes active crises and informs
          decision-making.
        </li>
        <li>
          <Link href="/docs/platform/dashboard" className="font-medium">
            Dashboard
          </Link>{" "}
          — return to the operational overview where alerts from these feeds
          surface alongside crisis activity and pending decisions.
        </li>
      </ul>
    </DocsPage>
  );
}
