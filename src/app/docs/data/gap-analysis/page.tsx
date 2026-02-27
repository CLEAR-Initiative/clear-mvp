import Link from "next/link";
import { DocsPage, DocsH2, DocsH3, InfoBox } from "../../_components/docs-page";

export const metadata = { title: "Gap Analysis — CLEAR Docs" };

export default function GapAnalysisPage() {
  return (
    <DocsPage
      title="Gap Analysis"
      description="Identify what data you are missing across humanitarian sectors, understand where the risks are greatest, and get actionable recommendations for closing the gaps."
      badge="DATA &amp; INTELLIGENCE"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        It is difficult to make good decisions with incomplete information —
        and in a humanitarian crisis, the consequences of those decisions are
        measured in human lives. The Gap Analysis feature exists to answer a
        deceptively simple question: <em>what data are we missing?</em>
      </p>
      <p>
        CLEAR maps seven humanitarian sectors to a total of 25 required
        indicators. When you run a gap analysis, the system checks your{" "}
        <Link href="/docs/data/sources" className="font-medium">
          registered data sources
        </Link>{" "}
        against these requirements and produces a detailed report: what is
        covered, what is not, how severe each gap is, and what you can do about
        it.
      </p>
      <p>
        The analysis is available on the{" "}
        <Link href="/data" className="font-medium">
          /data
        </Link>{" "}
        page under the <strong>Gap Analysis</strong> tab.
      </p>

      <DocsH2 id="sector-indicators">Sectors and Indicators</DocsH2>
      <p>
        CLEAR defines a set of required indicators for each of the seven
        standard humanitarian sectors. These indicators represent the minimum
        data points needed to make informed decisions in each area:
      </p>
      <table>
        <thead>
          <tr>
            <th>Sector</th>
            <th>Indicators</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Protection</strong></td>
            <td>
              Protection incidents, GBV incidents, child protection cases,
              documentation status
            </td>
            <td>4</td>
          </tr>
          <tr>
            <td><strong>Health</strong></td>
            <td>
              Mortality rates, vaccination coverage, disease outbreaks, mental
              health cases
            </td>
            <td>4</td>
          </tr>
          <tr>
            <td><strong>Nutrition</strong></td>
            <td>
              Malnutrition rates, food consumption score, dietary diversity
            </td>
            <td>3</td>
          </tr>
          <tr>
            <td><strong>WASH</strong></td>
            <td>
              Water quantity, water quality, sanitation coverage, waterborne
              diseases
            </td>
            <td>4</td>
          </tr>
          <tr>
            <td><strong>Shelter</strong></td>
            <td>
              Shelter adequacy, overcrowding, structural safety, tenure
              security
            </td>
            <td>4</td>
          </tr>
          <tr>
            <td><strong>Education</strong></td>
            <td>
              Enrollment rates, learning outcomes, teacher-student ratio
            </td>
            <td>3</td>
          </tr>
          <tr>
            <td><strong>Livelihoods</strong></td>
            <td>
              Income sources, employment rates, market functionality
            </td>
            <td>3</td>
          </tr>
        </tbody>
      </table>
      <p>
        Together these 25 indicators form the baseline that CLEAR uses to
        assess your data readiness. You do not need to have all of them
        covered — but understanding which ones you lack is essential for
        planning a response.
      </p>

      <DocsH2 id="running-an-analysis">Running an Analysis</DocsH2>
      <p>
        The gap analysis workflow is straightforward:
      </p>
      <ol>
        <li>
          <strong>Select sectors</strong> — Use the sector selector buttons at
          the top of the Gap Analysis tab. Each button shows the sector name
          and the number of indicators it requires. You can select as many or
          as few sectors as you like; by default all seven are selected.
        </li>
        <li>
          <strong>Review the availability summary</strong> — CLEAR immediately
          checks your registered data sources to see which indicators are
          covered. The result appears as both a set of headline numbers and a
          detailed per-sector table.
        </li>
        <li>
          <strong>Explore gap details</strong> — For any indicator that is not
          covered, the system provides a severity rating, a suggested data
          collection method, an estimated cost, and a projected timeframe.
        </li>
        <li>
          <strong>Act on recommendations</strong> — CLEAR generates prioritized
          actions grouped by sector, helping you decide where to invest your
          limited resources first.
        </li>
      </ol>

      <DocsH2 id="availability-summary">Availability Summary</DocsH2>
      <p>
        The availability summary provides a high-level view of your data
        readiness. At the top you will see four counters:
      </p>
      <ul>
        <li>
          <strong>Required Indicators</strong> — The total number of indicators
          needed across your selected sectors.
        </li>
        <li>
          <strong>Fully Available</strong> — Sectors where 90% or more of
          indicators are covered by your registered sources.
        </li>
        <li>
          <strong>Partially Available</strong> — Sectors with 50&ndash;89%
          indicator coverage.
        </li>
        <li>
          <strong>Not Available</strong> — Sectors where fewer than 50% of
          indicators are covered. These require the most urgent attention.
        </li>
      </ul>
      <p>
        Below the counters, a per-sector table shows each sector&apos;s
        coverage as a progress bar and percentage, its status (fully available,
        partially available, or not available), the count of available vs.
        required indicators, a list of missing indicators as badges, and
        whether primary data collection is needed. Sectors with coverage below
        50% are flagged as requiring primary collection — meaning you will
        likely need to gather the data yourself rather than relying on
        existing partner sources.
      </p>
      <p>
        The system also recommends specific partner sources from the{" "}
        <Link href="/docs/data/sources#partner-source-catalog" className="font-medium">
          Partner Source Catalog
        </Link>{" "}
        for each sector, ranked by relevance. This saves your team from having
        to manually search for providers during a time-pressured response.
      </p>

      <DocsH2 id="gap-details">Gap Details</DocsH2>
      <p>
        For every missing indicator, CLEAR produces a detailed gap record with
        the following information:
      </p>

      <DocsH3 id="severity-ratings">Severity Ratings</DocsH3>
      <p>
        Not all data gaps carry the same risk. CLEAR assigns a severity to each
        missing indicator based on its potential impact:
      </p>
      <ul>
        <li>
          <strong>Critical</strong> — Indicators that are directly tied to
          life-threatening conditions. Six indicators are classified as
          inherently critical:{" "}
          <code>mortality_rates</code>,{" "}
          <code>malnutrition_rates</code>,{" "}
          <code>protection_incidents</code>,{" "}
          <code>water_quantity</code>,{" "}
          <code>shelter_adequacy</code>, and{" "}
          <code>disease_outbreaks</code>. Missing any of these means you are
          operating without visibility into a fundamental threat to the
          affected population.
        </li>
        <li>
          <strong>High</strong> — Indicators that are significant but not
          immediately life-threatening, such as GBV incidents and child
          protection cases. These affect vulnerable sub-populations and demand
          prompt attention.
        </li>
        <li>
          <strong>Medium</strong> — All other indicators. These are important
          for comprehensive programming but their absence does not represent an
          immediate threat to survival.
        </li>
      </ul>

      <InfoBox type="warning">
        The crisis type affects severity classification. In a{" "}
        <strong>conflict</strong> crisis, any protection-related indicator that
        would otherwise be rated &ldquo;medium&rdquo; is escalated to
        &ldquo;critical&rdquo;. In an <strong>epidemic</strong>, disease-related
        indicators are similarly escalated. This context-sensitivity ensures
        that the analysis reflects the specific nature of the emergency you
        are responding to.
      </InfoBox>

      <DocsH3 id="collection-guidance">Collection Guidance</DocsH3>
      <p>
        Each gap entry includes a suggested collection method tailored to the
        indicator type:
      </p>
      <ul>
        <li>
          <strong>Health facility reporting</strong> — for disease and mortality
          indicators, drawing on existing clinic or hospital data systems.
        </li>
        <li>
          <strong>WASH cluster assessment</strong> — for water and sanitation
          indicators, typically conducted in coordination with the WASH cluster.
        </li>
        <li>
          <strong>Remote sensing</strong> — for shelter adequacy and
          satellite-derived indicators, using imagery analysis.
        </li>
        <li>
          <strong>Market monitoring</strong> — for livelihoods and market
          functionality indicators.
        </li>
        <li>
          <strong>Household survey</strong> — the default method for indicators
          that require direct contact with affected populations.
        </li>
      </ul>
      <p>
        Alongside the method, each gap shows an <strong>estimated cost</strong>{" "}
        and <strong>timeframe</strong>. Costs are higher for critical indicators
        (reflecting the urgency premium) and in conflict settings (reflecting
        access challenges). Timeframes range from 1&ndash;2 weeks for health
        facility-based indicators to 3&ndash;4 weeks for household surveys.
      </p>

      <DocsH2 id="recommendations">Recommendations</DocsH2>
      <p>
        At the bottom of the analysis, CLEAR generates a prioritized list of
        recommended actions. Recommendations are grouped by sector and assigned
        an urgency level:
      </p>
      <ul>
        <li>
          <strong>Urgent</strong> — The sector contains at least one critical
          gap. These should be addressed first.
        </li>
        <li>
          <strong>High</strong> — The sector has three or more gaps, even if
          none are individually critical. The cumulative blind spot is
          significant.
        </li>
        <li>
          <strong>Medium</strong> — The sector has fewer gaps and none are
          critical, but coverage could still be improved.
        </li>
      </ul>
      <p>
        Each recommendation identifies the number of indicator gaps in the
        sector and lists the suggested collection methods. This gives programme
        managers and information management officers a concrete starting point
        for their data collection plans.
      </p>

      <InfoBox type="tip">
        Share the recommendations output with your cluster coordination leads.
        It provides a clear, evidence-based argument for which data collection
        activities should be prioritized — and can help secure the resources
        needed to fill the most dangerous gaps.
      </InfoBox>

      <DocsH2 id="how-to-use">How to Use Gap Analysis</DocsH2>
      <ol>
        <li>
          Navigate to{" "}
          <Link href="/data" className="font-medium">
            /data
          </Link>{" "}
          and select the <strong>Gap Analysis</strong> tab.
        </li>
        <li>
          Use the sector selector to choose which sectors to analyze. Click a
          sector button to toggle it on or off. The badge next to each sector
          name shows the number of indicators it requires.
        </li>
        <li>
          Review the <strong>Data Availability</strong> card for the high-level
          picture — how many indicators are required, how many are covered, and
          the overall confidence score.
        </li>
        <li>
          Examine the per-sector table to identify which sectors are most at
          risk. Look for red &ldquo;not available&rdquo; statuses and
          &ldquo;Needed&rdquo; badges in the primary collection column.
        </li>
        <li>
          Scroll to <strong>Gap Details</strong> to see every missing indicator,
          its severity, and the suggested path to filling it.
        </li>
        <li>
          Review the <strong>Recommendations</strong> section for a prioritized
          action plan. Start with sectors marked as &ldquo;urgent&rdquo; and
          work downward.
        </li>
        <li>
          To improve your coverage score, register new data sources with the
          appropriate indicators via the{" "}
          <Link href="/docs/data/sources" className="font-medium">
            Data Sources
          </Link>{" "}
          feature, then re-run the analysis.
        </li>
      </ol>

      <DocsH2 id="next-steps">Next Steps</DocsH2>
      <ul>
        <li>
          <Link href="/docs/data/sources" className="font-medium">
            Data Sources
          </Link>{" "}
          — Register additional sources to improve your coverage and reduce the
          number of gaps.
        </li>
        <li>
          <Link href="/docs/data/feeds" className="font-medium">
            Live Data Feeds
          </Link>{" "}
          — See how CLEAR&apos;s built-in feeds complement your registered
          sources with real-time external data.
        </li>
        <li>
          <Link href="/docs/field/surveys" className="font-medium">
            Survey System
          </Link>{" "}
          — When the gap analysis recommends household surveys, use
          CLEAR&apos;s built-in survey builder to design and deploy them.
        </li>
        <li>
          <Link href="/docs/field/assessments" className="font-medium">
            Vulnerability Assessment
          </Link>{" "}
          — Combine gap analysis findings with rapid vulnerability scoring to
          prioritize which populations to reach first.
        </li>
      </ul>
    </DocsPage>
  );
}
