import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "Vulnerability Assessment — CLEAR Docs" };

export default function AssessmentsPage() {
  return (
    <DocsPage
      title="Vulnerability Assessment"
      description="Score household vulnerability in 60 seconds using the Sudan Rapid Needs Assessment methodology — designed for speed, consistency, and fairness in the field."
      badge="FIELD OPERATIONS"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        When thousands of displaced households need help and resources are
        limited, the hardest question is not <em>whether</em> to help but{" "}
        <em>who needs it most urgently</em>. Subjective judgments under pressure
        lead to inconsistency, bias, and missed cases. The CLEAR vulnerability
        assessment replaces guesswork with a structured, transparent scoring
        system that any trained field worker can apply in about 60 seconds per
        household.
      </p>
      <p>
        The methodology is based on the{" "}
        <strong>Sudan Rapid Needs Assessment (RNA)</strong> framework, adapted for
        digital use. It produces a composite score from 0 to 100, assigns a risk
        category, and automatically determines which programs a household
        qualifies for — so that targeting decisions are consistent, auditable, and
        defensible.
      </p>

      <DocsH2 id="how-scoring-works">How scoring works</DocsH2>
      <p>
        The vulnerability score is built from six components. Each component
        captures a distinct dimension of need, and the points accumulate to form
        a total between 0 and 100. The system is deliberately additive: the more
        risk factors a household faces, the higher the score.
      </p>

      <DocsH3 id="female-headed">1. Female-headed household</DocsH3>
      <p>
        If the household is headed by a woman or girl, <strong>25 points</strong>{" "}
        are added to the score. Female-headed households face well-documented
        barriers to accessing services, earning income, and ensuring physical
        safety in displacement settings. This single factor is one of the
        strongest predictors of vulnerability in humanitarian contexts.
      </p>

      <DocsH3 id="vulnerable-members">2. Vulnerable members</DocsH3>
      <p>
        This component assesses the presence and number of especially vulnerable
        individuals within the household. Points are assigned as follows:
      </p>
      <table>
        <thead>
          <tr>
            <th>Condition</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Any vulnerable members present</td>
            <td>+20 (base)</td>
          </tr>
          <tr>
            <td>Each person with a disability (PWD)</td>
            <td>+5 per person</td>
          </tr>
          <tr>
            <td>Each elderly member</td>
            <td>+3 per person</td>
          </tr>
          <tr>
            <td>Child-headed household</td>
            <td>+30</td>
          </tr>
        </tbody>
      </table>
      <p>
        The maximum for this component is <strong>65 points</strong>. A
        child-headed household with multiple disabled members will reach the cap
        quickly — as it should, because these are among the most at-risk
        configurations encountered in the field.
      </p>

      <DocsH3 id="household-size">3. Household size</DocsH3>
      <p>
        Larger households face greater resource strain. The scoring reflects this
        with two thresholds:
      </p>
      <ul>
        <li>
          <strong>More than 6 members:</strong> +15 points
        </li>
        <li>
          <strong>More than 4 members (but 6 or fewer):</strong> +8 points
        </li>
      </ul>
      <p>
        Smaller households receive no additional points from this component, which
        keeps the scoring focused on the cases where overcrowding and resource
        competition within the household are most acute.
      </p>

      <DocsH3 id="primary-need">4. Primary need</DocsH3>
      <p>
        The enumerator records the household&apos;s single most pressing need.
        Points are assigned based on the severity and immediacy typically
        associated with each sector:
      </p>
      <table>
        <thead>
          <tr>
            <th>Need</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Food</td>
            <td>20</td>
          </tr>
          <tr>
            <td>Protection</td>
            <td>19</td>
          </tr>
          <tr>
            <td>Health</td>
            <td>18</td>
          </tr>
          <tr>
            <td>WASH (Water, Sanitation, Hygiene)</td>
            <td>17</td>
          </tr>
          <tr>
            <td>Shelter</td>
            <td>15</td>
          </tr>
        </tbody>
      </table>
      <InfoBox type="info">
        The point differences between needs are intentionally narrow. The goal
        is not to rank sectors against each other in absolute terms, but to give
        a slight edge to needs that are most immediately life-threatening in
        acute displacement scenarios.
      </InfoBox>

      <DocsH3 id="distance-from-services">5. Distance from services</DocsH3>
      <p>
        Physical access to humanitarian services is a major determinant of
        whether assistance actually reaches those who need it. Households that
        are far from service delivery points face compounding disadvantages:
        higher transport costs, greater time burden, and increased exposure to
        protection risks during travel.
      </p>
      <ul>
        <li>
          <strong>More than 10 km:</strong> +15 points
        </li>
        <li>
          <strong>More than 5 km (but 10 km or less):</strong> +10 points
        </li>
      </ul>

      <DocsH3 id="gbv-risk">6. GBV risk</DocsH3>
      <p>
        If the household reports or is assessed as facing gender-based violence
        risk, <strong>20 points</strong> are added. This component acknowledges
        that GBV risk dramatically increases vulnerability and often requires
        immediate, specialized response. The presence of this flag also triggers
        automatic eligibility for GBV-specific services in the program matching
        system.
      </p>

      <DocsH2 id="risk-categories">Risk categories</DocsH2>
      <p>
        Once the total score is calculated, the household is placed into one of
        four risk categories. These categories drive prioritization, reporting,
        and program eligibility decisions across the platform.
      </p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Score range</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Critical</strong></td>
            <td>70 &ndash; 100</td>
            <td>
              Immediate intervention required. Multiple compounding
              vulnerabilities place this household at severe risk.
            </td>
          </tr>
          <tr>
            <td><strong>High</strong></td>
            <td>50 &ndash; 69</td>
            <td>
              Significant vulnerability. Should be prioritized for available
              assistance programs.
            </td>
          </tr>
          <tr>
            <td><strong>Medium</strong></td>
            <td>30 &ndash; 49</td>
            <td>
              Moderate vulnerability. Monitor closely and include in broader
              assistance where capacity allows.
            </td>
          </tr>
          <tr>
            <td><strong>Low</strong></td>
            <td>0 &ndash; 29</td>
            <td>
              Lower relative vulnerability. May still need services but is not
              in the most urgent tier.
            </td>
          </tr>
        </tbody>
      </table>

      <DocsH2 id="priority-ranking">Priority ranking</DocsH2>
      <p>
        Within each risk category, households are further ranked from{" "}
        <strong>P1</strong> (highest priority) through <strong>P5</strong>{" "}
        (lowest priority). This finer-grained ranking is especially important
        when resources are scarce and your team must decide the order in which
        households receive assistance within the same risk tier.
      </p>

      <DocsH2 id="program-eligibility">Automatic program eligibility</DocsH2>
      <p>
        One of the most powerful features of the assessment is{" "}
        <strong>automatic program matching</strong>. Based on the score and the
        specific flags recorded during the assessment, CLEAR determines which
        programs a household qualifies for — removing the need for separate
        eligibility screening and reducing delays between assessment and
        enrollment.
      </p>
      <table>
        <thead>
          <tr>
            <th>Program</th>
            <th>Eligibility trigger</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Cash assistance</strong></td>
            <td>Vulnerability score of 50 or above</td>
          </tr>
          <tr>
            <td><strong>Food assistance</strong></td>
            <td>Vulnerability score of 40 or above</td>
          </tr>
          <tr>
            <td><strong>GBV services</strong></td>
            <td>GBV risk flag is present</td>
          </tr>
          <tr>
            <td><strong>PWD support</strong></td>
            <td>One or more persons with disabilities in the household</td>
          </tr>
          <tr>
            <td><strong>Child protection</strong></td>
            <td>Child-headed household flag is present</td>
          </tr>
        </tbody>
      </table>
      <InfoBox type="tip">
        Program eligibility is determined automatically, but enrollment is not.
        A case worker still reviews the recommendation and confirms or adjusts
        it. The automation saves time and catches cases that a busy team might
        otherwise overlook.
      </InfoBox>

      <DocsH2 id="live-score-preview">Live score preview</DocsH2>
      <p>
        As a field worker fills in the assessment form, the vulnerability score
        updates in real time on screen. Every toggle, dropdown selection, and
        number entry immediately recalculates the total and displays the
        corresponding risk category. This matters for two practical reasons:
      </p>
      <ul>
        <li>
          <strong>Immediate feedback</strong> — The enumerator can see the result
          taking shape as they work, which helps catch data entry errors on the
          spot. If a household that clearly appears to be in crisis is scoring
          low, something was probably entered incorrectly.
        </li>
        <li>
          <strong>Transparency with beneficiaries</strong> — In contexts where
          affected populations want to understand how decisions are made, field
          staff can walk through the score in real time, showing how each factor
          contributes. This builds trust and reduces the perception of
          arbitrariness.
        </li>
      </ul>
      <InfoBox type="info">
        The live preview is identical to the final saved score. There is no
        separate &ldquo;draft&rdquo; calculation — what you see is what gets
        recorded.
      </InfoBox>

      <DocsH2 id="duration-tracking">Assessment duration tracking</DocsH2>
      <p>
        CLEAR automatically tracks how long each assessment takes, from the
        moment the form is opened to when it is submitted. This serves two
        purposes: it helps supervisors identify enumerators who may need
        additional training (consistently long assessments) or who may be rushing
        through without proper engagement (unusually short ones), and it provides
        operational data for planning how many assessments a team can realistically
        complete in a day.
      </p>

      <DocsH2 id="batch-scoring">Batch scoring</DocsH2>
      <p>
        When your team has collected assessment data for many households — for
        example during a registration exercise or camp profiling — you can use{" "}
        <strong>batch scoring</strong> to process multiple assessments at once.
        Rather than opening each record individually, batch scoring recalculates
        scores and program eligibility for an entire group, then presents the
        results as a sortable, filterable list.
      </p>
      <p>
        This is particularly useful after data cleaning, when corrected records
        need their scores updated to reflect the revised inputs.
      </p>

      <DocsH2 id="targeting-recommendations">Targeting recommendations</DocsH2>
      <p>
        Beyond individual household scores, CLEAR aggregates assessment data to
        produce <strong>targeting recommendations</strong> at the population
        level. These recommendations show how many households fall into each risk
        category, the distribution of primary needs, and the total number eligible
        for each program. This aggregate view helps program managers make
        evidence-based decisions about resource allocation without needing to
        export data to a separate analysis tool.
      </p>
      <InfoBox type="warning">
        Targeting recommendations are based on the assessments currently in the
        system. If your data collection is still in progress, the aggregate
        statistics will shift as more records come in. Always note the sample
        size when presenting these figures to decision-makers.
      </InfoBox>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <ul>
        <li>
          <Link href="/docs/field/surveys">
            <strong>Survey System</strong>
          </Link>{" "}
          — Design and deploy custom data collection instruments for the field.
        </li>
        <li>
          <Link href="/docs/field/referrals">
            <strong>Secure Referrals</strong>
          </Link>{" "}
          — Transfer sensitive beneficiary data between organizations with
          end-to-end encryption.
        </li>
        <li>
          <Link href="/docs/platform/dashboard">
            <strong>Dashboard</strong>
          </Link>{" "}
          — Return to the operational overview and see how assessments feed into
          the broader situational picture.
        </li>
      </ul>
    </DocsPage>
  );
}
