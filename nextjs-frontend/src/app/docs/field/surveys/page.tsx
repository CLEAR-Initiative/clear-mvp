import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "Survey System — CLEAR Docs" };

export default function SurveysPage() {
  return (
    <DocsPage
      title="Survey System"
      description="Design structured surveys, deploy them to field teams, and turn raw responses into actionable insight — all without leaving the platform."
      badge="FIELD OPERATIONS"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        In a crisis, information is oxygen. But collecting it under pressure —
        across languages, in low-connectivity environments, with rotating staff —
        demands more than a blank spreadsheet. The CLEAR survey system gives your
        team a structured, repeatable way to gather data from the field, so that
        every question asked serves a purpose and every answer feeds back into
        better decisions.
      </p>
      <p>
        You build surveys once using the template builder, deploy them when
        they are needed, and review the results through built-in analytics. No
        external tools required — though CLEAR also integrates with{" "}
        <Link href="/docs/integrations/kobo">KoBoToolbox</Link> if your
        organization already relies on it.
      </p>

      <DocsH2 id="template-builder">Building a survey template</DocsH2>
      <p>
        Every survey starts as a <strong>template</strong>. A template defines the
        structure — the title, description, and ordered list of questions — without
        being tied to a specific deployment or time window. Think of it as a
        reusable blueprint: design it carefully once, then deploy it as many times
        as circumstances require.
      </p>
      <p>
        The template builder provides a drag-and-drop interface for adding,
        reordering, and configuring questions. Each question has a label, an
        optional help text field (useful for providing enumerators with guidance
        in their own language), and a <strong>required</strong> toggle that
        controls whether the question must be answered before a response can be
        submitted.
      </p>
      <InfoBox type="tip">
        Write question labels in plain language. Field staff may be working under
        time pressure and in noisy environments — clarity beats cleverness every
        time.
      </InfoBox>

      <DocsH2 id="question-types">Question types</DocsH2>
      <p>
        CLEAR supports eight question types, each suited to a different kind of
        data. Choosing the right type matters because it determines how responses
        are validated, stored, and analyzed downstream.
      </p>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Input</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Text</strong></td>
            <td>Free-form text field</td>
            <td>Names, open-ended observations, qualitative notes</td>
          </tr>
          <tr>
            <td><strong>Number</strong></td>
            <td>Numeric input with optional min/max</td>
            <td>Household size, age, quantity of supplies</td>
          </tr>
          <tr>
            <td><strong>Single Choice</strong></td>
            <td>Radio buttons — one selection only</td>
            <td>Primary need, shelter type, displacement status</td>
          </tr>
          <tr>
            <td><strong>Multiple Choice</strong></td>
            <td>Checkboxes — any combination</td>
            <td>Services accessed, languages spoken, reported risks</td>
          </tr>
          <tr>
            <td><strong>Boolean</strong></td>
            <td>Yes / No toggle</td>
            <td>Consent flags, presence of a condition, eligibility checks</td>
          </tr>
          <tr>
            <td><strong>Date</strong></td>
            <td>Date picker</td>
            <td>Date of arrival, last distribution, incident date</td>
          </tr>
          <tr>
            <td><strong>Location</strong></td>
            <td>Latitude / longitude (manual or GPS)</td>
            <td>Site coordinates, distribution points, incident locations</td>
          </tr>
          <tr>
            <td><strong>Scale</strong></td>
            <td>Numeric slider with defined range</td>
            <td>Satisfaction ratings, severity perception, confidence levels</td>
          </tr>
        </tbody>
      </table>

      <DocsH2 id="lifecycle">Survey lifecycle</DocsH2>
      <p>
        A survey moves through five distinct stages. Understanding this lifecycle
        helps your team coordinate around data collection without stepping on each
        other&apos;s toes.
      </p>
      <ol>
        <li>
          <strong>Create template</strong> — Define the survey structure and add
          your questions using the template builder.
        </li>
        <li>
          <strong>Add questions</strong> — Configure each question&apos;s type,
          label, help text, options (for choice questions), and validation rules.
        </li>
        <li>
          <strong>Deploy</strong> — Publish the survey so that field teams can
          begin collecting responses. A deployed survey is live and accepting
          submissions.
        </li>
        <li>
          <strong>Collect responses</strong> — Enumerators fill out the survey in
          the field. Each submission is timestamped and linked to the
          authenticated user who recorded it.
        </li>
        <li>
          <strong>Analyze</strong> — Review aggregated response data through the
          built-in analytics dashboard, with per-question breakdowns and
          visualizations.
        </li>
      </ol>
      <InfoBox type="info">
        You can close a survey to stop accepting new responses while preserving
        all previously collected data and analytics. Closed surveys can be
        reopened if circumstances change.
      </InfoBox>

      <DocsH2 id="preview-mode">Preview mode</DocsH2>
      <p>
        Before deploying a survey to the field, use <strong>preview mode</strong>{" "}
        to walk through it exactly as an enumerator would see it. Preview mode
        renders every question with its validation rules, help text, and input
        controls, so you can catch confusing wording, missing options, or
        incorrect question ordering before real data collection begins.
      </p>
      <p>
        Responses submitted in preview mode are not saved — it is purely a testing
        tool. This means you can experiment freely without polluting your dataset.
      </p>
      <InfoBox type="tip">
        Have at least one field staff member test the survey in preview mode
        before deployment. They will catch issues that someone at a desk might
        miss — such as labels that are too long for a mobile screen or options
        that do not map to conditions on the ground.
      </InfoBox>

      <DocsH2 id="response-analytics">Response analytics</DocsH2>
      <p>
        Once responses begin arriving, CLEAR generates per-question analytics
        automatically. The type of visualization depends on the question type,
        because different data demands different presentation:
      </p>
      <table>
        <thead>
          <tr>
            <th>Question type</th>
            <th>Analytics display</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Single Choice / Multiple Choice</strong></td>
            <td>
              Bar chart showing the count and percentage for each option.
              This lets you see at a glance which responses dominate and which
              are outliers.
            </td>
          </tr>
          <tr>
            <td><strong>Number / Scale</strong></td>
            <td>
              Average value across all responses, along with min and max.
              Useful for spotting trends in household size, severity ratings,
              or supply quantities.
            </td>
          </tr>
          <tr>
            <td><strong>Text</strong></td>
            <td>
              Total response count. Free-text answers are too varied for
              automatic aggregation, but the count tells you how many
              respondents engaged with the question.
            </td>
          </tr>
          <tr>
            <td><strong>Boolean</strong></td>
            <td>
              Distribution showing the proportion of Yes vs. No responses.
              Particularly valuable for consent tracking and eligibility
              screening.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Analytics update as new responses come in, so you can monitor data
        collection progress in real time — even while enumerators are still in the
        field.
      </p>

      <DocsH2 id="versioning-reuse">Versioning and reuse</DocsH2>
      <p>
        Templates are designed to be reused. When a new crisis emerges or a
        recurring assessment cycle begins, you do not need to rebuild your surveys
        from scratch. Instead, deploy an existing template again — or clone it and
        make adjustments for the new context.
      </p>
      <p>
        Templates can also be <strong>versioned</strong>. If you need to update a
        question after deployment (for example, adding an option that field teams
        requested), you can create a new version of the template while preserving
        the original. This ensures that responses collected under the previous
        version remain consistent and comparable.
      </p>
      <InfoBox type="warning">
        Changing a template that is already deployed will not retroactively alter
        existing responses. Each response is tied to the template version that was
        active at the time of submission.
      </InfoBox>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <ul>
        <li>
          <Link href="/docs/field/assessments">
            <strong>Vulnerability Assessment</strong>
          </Link>{" "}
          — Learn how CLEAR scores household vulnerability using the Sudan RNA
          methodology.
        </li>
        <li>
          <Link href="/docs/field/referrals">
            <strong>Secure Referrals</strong>
          </Link>{" "}
          — Understand how to transfer sensitive beneficiary data between
          organizations with end-to-end encryption.
        </li>
        <li>
          <Link href="/docs/integrations/kobo">
            <strong>KoBoToolbox Integration</strong>
          </Link>{" "}
          — Connect CLEAR to your existing KoBoToolbox instance for
          bidirectional survey syncing.
        </li>
      </ul>
    </DocsPage>
  );
}
