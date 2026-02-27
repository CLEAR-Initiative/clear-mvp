import Link from "next/link";
import { DocsPage, DocsH2, DocsH3, InfoBox } from "../../_components/docs-page";

export const metadata = { title: "Data Sources — CLEAR Docs" };

export default function DataSourcesPage() {
  return (
    <DocsPage
      title="Data Sources"
      description="Register, monitor, and assess the quality of every data source your organization and partners rely on for humanitarian response."
      badge="DATA & INTELLIGENCE"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        Humanitarian responses depend on data from many places — your own field
        teams, partner organizations, satellite imagery providers, government
        databases, and community-submitted surveys. Keeping track of what data
        exists, how reliable it is, and when it was last updated is a challenge
        in itself.
      </p>
      <p>
        The <strong>Data Sources</strong> feature gives you a single registry
        for all of these inputs. You can record where each source comes from,
        what sector it covers, how often it is refreshed, and how trustworthy
        the data is. CLEAR then uses this registry to power its{" "}
        <Link href="/docs/data/gap-analysis" className="font-medium">
          Gap Analysis
        </Link>{" "}
        — automatically comparing what you have against what you need.
      </p>
      <p>
        Everything described on this page is accessible from the{" "}
        <Link href="/data" className="font-medium">
          /data
        </Link>{" "}
        page under the <strong>Data Sources</strong> tab.
      </p>

      <DocsH2 id="registering-a-source">Registering a Data Source</DocsH2>
      <p>
        Each data source in CLEAR captures a rich set of metadata so that
        your team — and the platform&apos;s analytical engine — can understand
        exactly what the source provides and how much confidence to place in it.
      </p>

      <DocsH3 id="source-types">Source Types</DocsH3>
      <p>
        When registering a source, you choose from the following types to
        describe how the data is collected or delivered:
      </p>
      <ul>
        <li>
          <strong>API</strong> — An automated interface that delivers data
          programmatically (e.g. a REST endpoint from a partner agency).
        </li>
        <li>
          <strong>Database</strong> — A structured data store, either hosted
          internally or accessed via a shared connection.
        </li>
        <li>
          <strong>Survey</strong> — Data gathered through field surveys,
          whether digital (KoBoToolbox, ODK) or paper-based.
        </li>
        <li>
          <strong>Manual</strong> — Information entered by hand, such as
          situation reports typed into the system by programme staff.
        </li>
        <li>
          <strong>Satellite</strong> — Remotely sensed data, including imagery
          and derived indicators like flood extent or building damage.
        </li>
        <li>
          <strong>IoT</strong> — Readings from connected sensors, such as water
          quality monitors, weather stations, or displacement tracking devices.
        </li>
        <li>
          <strong>Social Media</strong> — Open-source intelligence gathered
          from social platforms, useful for early warning and sentiment analysis.
        </li>
      </ul>

      <DocsH3 id="source-metadata">Source Metadata</DocsH3>
      <p>
        Beyond the type, each source records the following fields so that your
        team has a complete picture at a glance:
      </p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Sector</strong></td>
            <td>
              The humanitarian sector the source covers (Protection, Health,
              Nutrition, WASH, Shelter, Education, or Livelihoods).
            </td>
          </tr>
          <tr>
            <td><strong>Update frequency</strong></td>
            <td>
              How often the source is refreshed — daily, weekly, monthly, or on
              demand. This helps the system flag stale data.
            </td>
          </tr>
          <tr>
            <td><strong>Coverage areas</strong></td>
            <td>
              The geographic regions the source covers, from global to
              sub-national.
            </td>
          </tr>
          <tr>
            <td><strong>Populations</strong></td>
            <td>
              Which population groups the data pertains to (e.g. refugees,
              internally displaced persons, host communities).
            </td>
          </tr>
          <tr>
            <td><strong>Indicators</strong></td>
            <td>
              The specific data points the source provides, expressed as
              indicator codes (e.g.{" "}
              <code>mortality_rates</code>,{" "}
              <code>water_quantity</code>). These map directly to the{" "}
              <Link href="/docs/data/gap-analysis" className="font-medium">
                Gap Analysis
              </Link>{" "}
              sector requirements.
            </td>
          </tr>
          <tr>
            <td><strong>Quality level</strong></td>
            <td>
              An overall rating — high, medium, or low — that reflects your
              confidence in the source.
            </td>
          </tr>
          <tr>
            <td><strong>Access level</strong></td>
            <td>
              Whether the data is public, available only to partners, or
              restricted (e.g. requiring a data-sharing agreement).
            </td>
          </tr>
          <tr>
            <td><strong>Reliability score</strong></td>
            <td>
              A numeric score that captures the source&apos;s track record of
              delivering accurate, timely data over time.
            </td>
          </tr>
        </tbody>
      </table>

      <DocsH2 id="availability-logging">Availability Logging</DocsH2>
      <p>
        Once a source is registered, CLEAR monitors its availability
        continuously. Every time the system connects to a source — whether to
        pull new data or to run a health check — it records:
      </p>
      <ul>
        <li>
          <strong>Uptime</strong> — Whether the source was reachable at the
          time of the check.
        </li>
        <li>
          <strong>Response time</strong> — How long the source took to respond,
          measured in milliseconds. Slow responses may signal degraded
          infrastructure or network issues in the field.
        </li>
        <li>
          <strong>Error messages</strong> — If a check fails, the error is
          logged so that your technical team can diagnose the cause (e.g.
          authentication expired, endpoint moved, server timeout).
        </li>
      </ul>
      <p>
        The Data Sources tab surfaces this as a summary dashboard with four
        headline cards: <strong>Total Sources</strong>,{" "}
        <strong>Active</strong>, <strong>Recent Outages</strong> (in the last
        24 hours), and <strong>Failing Metrics</strong>. This lets you spot
        problems at a glance and prioritize follow-up.
      </p>

      <InfoBox type="warning">
        A source marked as having recent outages does not necessarily mean the
        data is lost — CLEAR serves cached data when the upstream source is
        unavailable. However, persistent outages should be investigated to
        ensure your response decisions are based on current information.
      </InfoBox>

      <DocsH2 id="quality-metrics">Quality Metrics</DocsH2>
      <p>
        Data quality in a humanitarian context is not a luxury — it directly
        affects the lives of the people you are trying to help. CLEAR measures
        five dimensions of quality for every registered source:
      </p>
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>What it measures</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Completeness</strong></td>
            <td>
              The proportion of expected fields that are actually populated.
            </td>
            <td>
              A nutrition survey where 15% of weight measurements are blank
              would score low on completeness.
            </td>
          </tr>
          <tr>
            <td><strong>Accuracy</strong></td>
            <td>
              How closely the reported values reflect reality, based on
              validation rules and cross-checks.
            </td>
            <td>
              GPS coordinates that fall outside the reported country boundary
              reduce accuracy.
            </td>
          </tr>
          <tr>
            <td><strong>Consistency</strong></td>
            <td>
              Whether data follows the same formats, units, and conventions
              across records and over time.
            </td>
            <td>
              A source that sometimes reports temperatures in Celsius and
              sometimes in Fahrenheit would score low.
            </td>
          </tr>
          <tr>
            <td><strong>Timeliness</strong></td>
            <td>
              How quickly data becomes available after the event or period it
              describes.
            </td>
            <td>
              A weekly report that consistently arrives three weeks late
              undermines decision-making.
            </td>
          </tr>
          <tr>
            <td><strong>Validity</strong></td>
            <td>
              Whether values fall within acceptable ranges and conform to
              expected data types.
            </td>
            <td>
              A malnutrition rate reported as &ldquo;150%&rdquo; would fail
              validity checks.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Each dimension is scored on a <strong>0 to 1</strong> scale, where 1.0
        represents perfect quality. You can configure thresholds for each
        dimension so that the system flags sources that fall below an
        acceptable level. For example, you might set the completeness threshold
        to 0.8 to ensure that sources with more than 20% missing data are
        flagged for review.
      </p>

      <InfoBox type="tip">
        Quality metrics are not about punishing data providers. They are a tool
        to help you understand where to invest in capacity building, which
        sources to prioritize in decision-making, and where cross-validation
        with a second source might be advisable.
      </InfoBox>

      <DocsH2 id="partner-source-catalog">Partner Source Catalog</DocsH2>
      <p>
        CLEAR includes a built-in catalog of seven established humanitarian
        data partners. These entries are pre-configured with sector coverage,
        data types, update frequencies, quality ratings, and access levels so
        that you can quickly see what is available from the broader ecosystem
        without having to research each agency individually.
      </p>
      <table>
        <thead>
          <tr>
            <th>Partner</th>
            <th>Type</th>
            <th>Sectors</th>
            <th>Key Data Types</th>
            <th>Access</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>UNHCR</strong></td>
            <td>UN Agency</td>
            <td>Protection, Shelter</td>
            <td>Registration, displacement, protection monitoring</td>
            <td>Public</td>
          </tr>
          <tr>
            <td><strong>WFP</strong></td>
            <td>UN Agency</td>
            <td>Nutrition, Livelihoods</td>
            <td>Food security, market prices, nutrition surveys</td>
            <td>Partner</td>
          </tr>
          <tr>
            <td><strong>WHO</strong></td>
            <td>UN Agency</td>
            <td>Health</td>
            <td>Disease surveillance, health facilities, vaccination</td>
            <td>Public</td>
          </tr>
          <tr>
            <td><strong>UNICEF</strong></td>
            <td>UN Agency</td>
            <td>Education, WASH, Nutrition, Protection</td>
            <td>Child protection, education access, WASH monitoring</td>
            <td>Public</td>
          </tr>
          <tr>
            <td><strong>OCHA</strong></td>
            <td>UN Agency</td>
            <td>All seven sectors</td>
            <td>Needs assessments, situation reports, 3W data</td>
            <td>Public</td>
          </tr>
          <tr>
            <td><strong>ACAPS</strong></td>
            <td>Data Platform</td>
            <td>Protection, Health, Nutrition, WASH, Shelter</td>
            <td>Severity assessments, crisis profiles, risk analysis</td>
            <td>Public</td>
          </tr>
          <tr>
            <td><strong>HDX</strong></td>
            <td>Data Platform</td>
            <td>All seven sectors</td>
            <td>Datasets, indicators, geospatial data</td>
            <td>Public</td>
          </tr>
        </tbody>
      </table>
      <p>
        The catalog is visible in the lower section of the Data Sources tab.
        When the{" "}
        <Link href="/docs/data/gap-analysis" className="font-medium">
          Gap Analysis
        </Link>{" "}
        identifies missing indicators, it references this catalog to recommend
        which partner sources could fill the gap — saving your team valuable
        time during the early hours of a response.
      </p>

      <DocsH2 id="how-to-use">How to Use Data Sources</DocsH2>
      <ol>
        <li>
          Navigate to{" "}
          <Link href="/data" className="font-medium">
            /data
          </Link>{" "}
          and select the <strong>Data Sources</strong> tab.
        </li>
        <li>
          Review the four summary cards at the top — total sources, active
          count, recent outages, and failing metrics — to understand the health
          of your data ecosystem.
        </li>
        <li>
          Scroll to the <strong>Registered Data Sources</strong> table to see
          every source your organization has configured. Each row shows the
          name, type, sector, quality level, update frequency, active status,
          and last sync time.
        </li>
        <li>
          Continue to the <strong>Partner Source Catalog</strong> below to
          browse the pre-loaded humanitarian partner sources. Use this as a
          reference when you need to identify potential data providers for
          sectors where your own coverage is thin.
        </li>
        <li>
          New sources can be registered through the API. Once added, CLEAR
          begins tracking their availability and quality automatically.
        </li>
      </ol>

      <InfoBox type="info">
        The indicators you assign to each registered source directly determine
        the results of the Gap Analysis. Accurate indicator tagging is the
        single most important thing you can do to get meaningful gap reports.
      </InfoBox>

      <DocsH2 id="next-steps">Next Steps</DocsH2>
      <ul>
        <li>
          <Link href="/docs/data/feeds" className="font-medium">
            Live Data Feeds
          </Link>{" "}
          — See how CLEAR pulls real-time data from USGS, ReliefWeb, and
          Open-Meteo alongside your registered sources.
        </li>
        <li>
          <Link href="/docs/data/gap-analysis" className="font-medium">
            Gap Analysis
          </Link>{" "}
          — Learn how CLEAR compares your registered sources against sector
          requirements to identify what you are missing.
        </li>
        <li>
          <Link href="/docs/integrations/apis" className="font-medium">
            External APIs
          </Link>{" "}
          — Explore the technical details for integrating additional data
          providers.
        </li>
      </ul>
    </DocsPage>
  );
}
