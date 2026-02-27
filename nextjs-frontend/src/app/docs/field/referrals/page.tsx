import Link from "next/link";
import {
  DocsPage,
  DocsH2,
  DocsH3,
  InfoBox,
} from "../../_components/docs-page";

export const metadata = { title: "Secure Referrals — CLEAR Docs" };

export default function ReferralsPage() {
  return (
    <DocsPage
      title="Secure Referrals"
      description="Transfer sensitive beneficiary data between organizations with end-to-end encryption — because protecting people means protecting their information."
      badge="FIELD OPERATIONS"
    >
      <DocsH2 id="overview">Overview</DocsH2>
      <p>
        Humanitarian response rarely happens in isolation. A family identified by
        one organization often needs services from another — medical care from a
        health partner, legal assistance from a protection agency, food
        distribution from a logistics cluster. Each handoff involves sharing
        personal data about people in deeply vulnerable situations: names,
        locations, medical conditions, protection concerns.
      </p>
      <p>
        The CLEAR referral system exists to make these transfers both{" "}
        <strong>possible and safe</strong>. Every referral is encrypted
        end-to-end before it leaves the sending organization, and the receiving
        partner must take an explicit action to decrypt it. There is no moment
        where beneficiary data sits unprotected on a server, in transit, or in a
        database row. In contexts where data breaches can endanger lives, this is
        not a technical luxury — it is an operational necessity.
      </p>

      <DocsH2 id="encryption">Encryption architecture</DocsH2>
      <p>
        CLEAR uses <strong>AES-256-GCM</strong> symmetric encryption to protect
        referral data. The encryption key is derived using{" "}
        <strong>PBKDF2</strong> with 100,000 iterations and SHA-512 as the hash
        function. This key derivation process is deliberately slow — it is
        designed to make brute-force attacks computationally impractical even if
        an attacker gains access to the encrypted data.
      </p>
      <p>
        Every referral generates its own <strong>unique salt</strong> and{" "}
        <strong>initialization vector (IV)</strong>. No two referrals share
        encryption parameters, which means that even if the same beneficiary data
        were referred twice, the encrypted output would be entirely different.
        This prevents pattern analysis and ensures that compromising one
        referral&apos;s encryption reveals nothing about any other.
      </p>
      <InfoBox type="warning">
        The encryption key is derived from the{" "}
        <code>REFERRAL_ENCRYPTION_KEY</code> environment variable, which must be
        set on every instance that sends or receives referrals. Generate it with:{" "}
        <code>openssl rand -hex 32</code>. Store it securely — if this key is
        lost, encrypted referrals cannot be decrypted.
      </InfoBox>

      <DocsH3 id="decryption">Explicit decryption</DocsH3>
      <p>
        Beneficiary data within a referral is stored in its encrypted form at
        rest. When a receiving organization opens a referral, they see the
        referral metadata — type, urgency, status, referring organization — but
        the sensitive beneficiary details remain encrypted until the user
        explicitly clicks to decrypt. This deliberate friction serves a purpose:
        it ensures that access to personal data is an intentional, auditable act
        rather than an accidental exposure.
      </p>
      <InfoBox type="info">
        Every decryption event is logged. This creates a verifiable audit trail
        showing exactly who accessed beneficiary data, when, and from which
        organization — critical for data protection compliance and
        accountability to affected populations.
      </InfoBox>

      <DocsH2 id="referral-types">Referral types</DocsH2>
      <p>
        Not every referral carries the same kind of information or serves the
        same purpose. CLEAR supports five referral types to match the range of
        inter-agency coordination scenarios your team encounters:
      </p>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Use case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Individual Case</strong></td>
            <td>
              A single beneficiary being referred for specific services —
              the most common referral type in case management workflows.
            </td>
          </tr>
          <tr>
            <td><strong>Family Case</strong></td>
            <td>
              An entire household referred together, preserving family
              unity in the referral record and avoiding duplicate entries
              for each member.
            </td>
          </tr>
          <tr>
            <td><strong>Group Referral</strong></td>
            <td>
              Multiple unrelated individuals referred to the same service
              provider — common during mass registration or group
              counseling scenarios.
            </td>
          </tr>
          <tr>
            <td><strong>Emergency Transfer</strong></td>
            <td>
              Time-critical referrals where immediate action is required.
              These are flagged prominently in the receiving
              organization&apos;s queue and may bypass standard review
              workflows.
            </td>
          </tr>
          <tr>
            <td><strong>Information Sharing</strong></td>
            <td>
              Sharing relevant case information with a partner without
              requesting specific services — for coordination purposes,
              situational awareness, or case conferencing.
            </td>
          </tr>
        </tbody>
      </table>

      <DocsH2 id="urgency-levels">Urgency levels</DocsH2>
      <p>
        Each referral is assigned an urgency level that signals how quickly the
        receiving organization should act. Urgency levels affect how referrals
        are sorted and displayed in the partner&apos;s incoming queue:
      </p>
      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Expected response</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Routine</strong></td>
            <td>Standard processing timeline — no immediate time pressure.</td>
          </tr>
          <tr>
            <td><strong>Priority</strong></td>
            <td>Should be reviewed within a short timeframe; elevated above routine cases.</td>
          </tr>
          <tr>
            <td><strong>Urgent</strong></td>
            <td>Requires prompt attention. The beneficiary&apos;s situation is deteriorating or time-sensitive.</td>
          </tr>
          <tr>
            <td><strong>Emergency</strong></td>
            <td>Immediate action needed. Life, safety, or protection is at imminent risk.</td>
          </tr>
        </tbody>
      </table>

      <DocsH2 id="status-workflow">Status workflow</DocsH2>
      <p>
        A referral moves through a defined set of statuses that provide both the
        sending and receiving organizations with visibility into where things
        stand. This shared status model replaces the phone calls, follow-up
        emails, and uncertainty that plague paper-based referral systems.
      </p>
      <ol>
        <li>
          <strong>Draft</strong> — The referral is being prepared but has not yet
          been sent. Beneficiary data can still be edited.
        </li>
        <li>
          <strong>Sent</strong> — The referral has been encrypted and transmitted
          to the receiving organization. It appears in their incoming queue.
        </li>
        <li>
          <strong>Received</strong> — The receiving organization has acknowledged
          receipt. The referral is in their review pipeline.
        </li>
        <li>
          <strong>Accepted</strong> — The partner has agreed to take on the case
          and provide the requested services.
        </li>
        <li>
          <strong>In Progress</strong> — Services are actively being delivered to
          the beneficiary.
        </li>
        <li>
          <strong>Completed</strong> — The referral has been fulfilled. The
          requested services were provided and the case can be closed.
        </li>
      </ol>
      <p>
        At any point after being sent, a referral may also move to one of three
        terminal states:
      </p>
      <ul>
        <li>
          <strong>Rejected</strong> — The receiving organization cannot accept the
          referral (for example, if the service is not available in the
          beneficiary&apos;s location).
        </li>
        <li>
          <strong>Cancelled</strong> — The sending organization withdraws the
          referral before it is completed.
        </li>
        <li>
          <strong>Expired</strong> — The referral was not acted upon within the
          expected timeframe and has timed out.
        </li>
      </ul>
      <InfoBox type="tip">
        Both sending and receiving organizations can see the current status at
        all times. If a referral has been sitting in &ldquo;Sent&rdquo; for too
        long, the sending organization knows to follow up — without needing to
        make a phone call to ask.
      </InfoBox>

      <DocsH2 id="consent-tracking">Consent tracking</DocsH2>
      <p>
        Sharing personal data requires informed consent, and different types of
        sharing require different types of consent. CLEAR tracks consent at a
        granular level, recording exactly what the beneficiary has agreed to:
      </p>
      <table>
        <thead>
          <tr>
            <th>Consent type</th>
            <th>What it covers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Data Sharing</strong></td>
            <td>
              Permission to share the beneficiary&apos;s personal data with the
              receiving organization for the purpose described in the referral.
            </td>
          </tr>
          <tr>
            <td><strong>Service Provision</strong></td>
            <td>
              Agreement that the receiving organization may provide services
              based on the shared information.
            </td>
          </tr>
          <tr>
            <td><strong>Cross-Border Transfer</strong></td>
            <td>
              Explicit consent for data to be transferred across national
              borders — required when the receiving organization operates in a
              different country.
            </td>
          </tr>
          <tr>
            <td><strong>Third-Party Disclosure</strong></td>
            <td>
              Permission for the receiving organization to share the data
              onward with additional parties, if further referral is needed.
            </td>
          </tr>
        </tbody>
      </table>
      <InfoBox type="warning">
        A referral cannot be sent without at least <strong>Data Sharing</strong>{" "}
        consent being recorded. This is enforced at the system level, not left
        to individual judgment. In crisis contexts, where pressure to act
        quickly is intense, this safeguard ensures that data protection is never
        treated as optional.
      </InfoBox>

      <DocsH2 id="partner-registry">Partner organization registry</DocsH2>
      <p>
        Before you can send a referral, the receiving organization must exist in
        the CLEAR <strong>partner registry</strong>. The registry maintains a
        directory of organizations your team works with, including their contact
        information, service offerings, and operational areas. Each partner
        entry has a <strong>verification status</strong> that indicates whether
        the organization has been confirmed as a legitimate, active partner.
      </p>
      <p>
        Verification helps prevent referrals from being sent to inactive,
        fraudulent, or incorrectly entered organizations. Only verified partners
        appear in the referral recipient dropdown by default, though
        administrators can override this when operational context demands it.
      </p>

      <DocsH2 id="setup">Setup requirements</DocsH2>
      <p>
        The referral system requires one environment variable to be configured
        before it can encrypt or decrypt referral data:
      </p>
      <pre>
        <code>REFERRAL_ENCRYPTION_KEY=your-64-character-hex-key</code>
      </pre>
      <p>
        Generate this key using:
      </p>
      <pre>
        <code>openssl rand -hex 32</code>
      </pre>
      <p>
        This produces a 256-bit key encoded as 64 hexadecimal characters. Store
        it in your <code>.env</code> file for local development and in your
        deployment platform&apos;s secrets manager for production. Every instance
        of CLEAR that participates in referrals — whether sending or receiving —
        must have this key configured.
      </p>
      <InfoBox type="warning">
        Do not commit the encryption key to version control. Do not share it
        over unencrypted channels. If you suspect the key has been compromised,
        rotate it immediately — but be aware that referrals encrypted with the
        old key will need that old key to be decrypted.
      </InfoBox>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <ul>
        <li>
          <Link href="/docs/field/assessments">
            <strong>Vulnerability Assessment</strong>
          </Link>{" "}
          — Understand how CLEAR scores household vulnerability, which often
          informs referral decisions.
        </li>
        <li>
          <Link href="/docs/field/surveys">
            <strong>Survey System</strong>
          </Link>{" "}
          — Design field data collection instruments that complement your
          assessment and referral workflows.
        </li>
        <li>
          <Link href="/docs/accountability/audit">
            <strong>Audit Trail</strong>
          </Link>{" "}
          — Learn how every referral action is logged for accountability and
          compliance.
        </li>
      </ul>
    </DocsPage>
  );
}
