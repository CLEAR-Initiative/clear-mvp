export type GradeKey = "A" | "B" | "C" | "D";
export type ModCode = "A" | "B" | "C" | "D" | "H";

export interface MCTModality {
  code: ModCode;
  name: string;
  options: [string, string, string, string];
}

export interface MCTCriterion {
  id: number;
  label: string;
  section: string;
  question: string;
  sub: string;
  modalities: MCTModality[];
}

export const CRITERIA: MCTCriterion[] = [
  {
    id: 1,
    label: "Market conditions",
    section: "Market",
    question: "How well do market conditions support each modality?",
    sub: "Consider: market access and functionality, financial infrastructure, delivery mechanisms (mobile money, hawala, bank transfer), price stability, and security of distribution.",
    modalities: [
      { code: "A", name: "In-Kind", options: ["In-Kind is the best choice. Market access is poor, financial services are absent or unreliable, and security risks prevent cash-based delivery. Direct distribution is the only viable mechanism.", "In-Kind is viable. Markets are partially functional but logistical constraints exist. Financial infrastructure is limited, making direct distribution preferable to cash or digital transfers.", "In-Kind is possible but not ideal. Markets are improving and some financial services exist, though coverage gaps persist. Cash-based options may offer more flexibility.", "In-Kind is not suitable. Markets are fully functional with reliable financial services and delivery infrastructure. Direct distribution would duplicate or undermine existing supply."] },
      { code: "B", name: "Cash", options: ["Cash is the best choice. Markets are functional, financial services are accessible (mobile money, banks, or hawala), prices are stable, and security conditions allow safe transfers.", "Cash is suitable. Some market disruptions or liquidity constraints exist, but financial infrastructure supports transfers with adequate risk management.", "Cash is possible but not ideal. Liquidity issues, limited agent networks, or security concerns create barriers. Additional safeguards and monitoring would be required.", "Cash is not suitable. Market access is poor, financial systems are absent or compromised, or security risks make cash distribution dangerous or ineffective."] },
      { code: "C", name: "Vouchers", options: ["Vouchers are the best choice. Markets function and vendors are willing to participate, but direct cash poses inflation or security risks. Vouchers provide controlled, traceable value transfer.", "Vouchers are suitable. Vendor networks can be established and managed, and electronic or paper systems are administratively feasible.", "Vouchers are possible but not ideal. Vendor coverage is uneven or administrative costs are high. Market conditions partially support voucher use but with limitations.", "Vouchers are not suitable. Vendor participation is absent, financial regulations prevent implementation, or administrative burden outweighs benefit."] },
      { code: "D", name: "Services", options: ["Services are the best choice. Essential services are unavailable through markets and must be delivered directly. No viable market mechanism exists for households to access what they need.", "Services are suitable. Market-based service access exists but is unreliable, costly, or geographically limited. Direct provision fills critical gaps.", "Services are possible but not ideal. Some market-based service access exists, but quality or affordability gaps require complementary direct provision.", "Services are not suitable. Existing market and service providers adequately meet household needs. Direct provision would duplicate or displace functioning services."] },
      { code: "H", name: "Facilitation", options: ["Facilitation is the best choice. Market actors are present but face structural barriers — trader finance gaps, regulatory constraints, or supply chain failures — that NRC can directly address.", "Facilitation is suitable. Markets function partially but require coordination, financial access improvements, or infrastructure investment to reach affected populations reliably.", "Facilitation is possible but not ideal. Market actors are active but capacity gaps require significant external support before facilitation yields results.", "Facilitation is not suitable. Market actors are too weak or absent for facilitation to be effective. Direct interventions are required."] },
    ],
  },
  {
    id: 2,
    label: "Household needs",
    section: "Needs",
    question: "Which modality best meets the needs of affected households?",
    sub: "Can needs be monetised? Are the right goods or services available in the market? Is standardised quality critical?",
    modalities: [
      { code: "A", name: "In-Kind", options: ["In-Kind is the best choice. Essential goods are unavailable or unaffordable in the market. Households require specific, standardised items that cannot be reliably sourced locally.", "In-Kind is suitable. Markets provide some items but quality, availability, or affordability gaps mean direct distribution fills important gaps.", "In-Kind is possible but not ideal. Markets are broadly functional. Households can access most of what they need, though some specific items may be unavailable.", "In-Kind is not suitable. Markets are fully functional and well-stocked. Providing goods directly would risk displacing local trade or creating dependency."] },
      { code: "B", name: "Cash", options: ["Cash is the best choice. Household needs are diverse and can be met through the market. Cash gives households the flexibility to prioritise their own most urgent needs.", "Cash is suitable. Markets function but with minor disruptions such as price fluctuations or supply delays. Cash transfers remain effective with adequate monitoring.", "Cash is possible but not ideal. Inflation, liquidity shortages, or security risks limit effectiveness. Cash can still facilitate access but with constraints.", "Cash is not suitable. Severe economic instability, hyperinflation, or market failure means households cannot reliably convert cash into what they need."] },
      { code: "C", name: "Vouchers", options: ["Vouchers are the best choice. Market supply is stable but direct cash poses risks. Households can access essential goods through a controlled, vendor-based system.", "Vouchers are suitable. Cash access is limited or poses protection risks, but market vendors accept voucher systems. Households retain some choice within a structured framework.", "Vouchers are possible but not ideal. Limited vendor participation or administrative complexity reduces effectiveness. Households face some restrictions on what they can access.", "Vouchers are not suitable. Vendors do not accept vouchers, the system is too costly to implement, or households overwhelmingly prefer unrestricted cash."] },
      { code: "D", name: "Services", options: ["Services are the best choice. Household needs are for specialised support — healthcare, legal aid, WASH, protection — that markets cannot supply at the required quality or scale.", "Services are suitable. Public or private services exist but are unreliable, costly, or inaccessible. Direct provision fills critical gaps that cash or in-kind cannot address.", "Services are possible but not ideal. Households can access some services but quality, affordability, or geographic barriers persist. Complementary provision may help.", "Services are not suitable. The private sector or government adequately meets household service needs. Direct provision would be redundant or inefficient."] },
      { code: "H", name: "Facilitation", options: ["Facilitation is the best choice. Strengthening market actors is the most effective way to sustainably improve household access to goods and services at scale.", "Facilitation is suitable. Market actors function but require improved linkages, financial support, or policy changes to reliably serve affected households.", "Facilitation is possible but not ideal. Market actors operate but inefficiencies exist. Some direct assistance may still be needed alongside facilitation.", "Facilitation is not suitable. Households require immediate direct assistance. Facilitation operates on a timeframe that cannot meet acute needs."] },
    ],
  },
  {
    id: 3,
    label: "Age, gender & diversity",
    section: "Inclusion",
    question: "Which modality best reaches the most vulnerable groups?",
    sub: "Consider: women, elderly, people with disabilities, minority groups. Who can physically access what? Are there protection risks associated with specific modalities?",
    modalities: [
      { code: "A", name: "In-Kind", options: ["In-Kind is the best choice. Vulnerable groups face barriers to market access due to disability, age, discrimination, or insecurity. Direct distribution reaches people who cannot reach markets.", "In-Kind is suitable. Markets provide goods but with barriers for certain groups. Supplementary in-kind distribution ensures equitable coverage.", "In-Kind is possible but not ideal. Some vulnerable groups can access markets, but affordability or discrimination issues remain. Targeted top-up may be needed.", "In-Kind is not suitable. Markets fully meet diverse population needs. Direct distribution creates dependency and offers no inclusion advantage."] },
      { code: "B", name: "Cash", options: ["Cash is the best choice. Financial inclusion measures ensure equitable access for all groups. Mobile money or agent-based transfers reach vulnerable households without requiring physical travel.", "Cash is suitable. Targeted mechanisms such as financial literacy support or adapted registration processes ensure most vulnerable groups can access transfers.", "Cash is possible but not ideal. Accessibility barriers, financial exclusion, or intra-household control risks affect certain groups. Additional protection measures are required.", "Cash is not suitable. Social, financial, or protection risks prevent equitable cash access. Male control of transfers, exclusion from banking, or safety concerns make cash inappropriate."] },
      { code: "C", name: "Vouchers", options: ["Vouchers are the best choice. Structured spending protects vulnerable groups — particularly women — by ensuring value is used for intended goods while designated vendors improve physical access.", "Vouchers are suitable. Adapted delivery and vendor selection measures ensure most vulnerable groups can participate, while controlling for household diversion risks.", "Vouchers are possible but not ideal. Some vendors may not accommodate diverse needs. Physical access to vendor locations remains a challenge for certain groups.", "Vouchers are not suitable. Vendor access barriers, discrimination, or complex redemption processes exclude the most vulnerable. An alternative modality is more equitable."] },
      { code: "D", name: "Services", options: ["Services are the best choice. Tailored direct provision — health, legal, psychosocial, protection — specifically designed for vulnerable groups reaches people that no market mechanism can.", "Services are suitable. Market and public services exist but affordability or discrimination limits access for certain groups. Targeted provision fills the gap.", "Services are possible but not ideal. Accessibility remains a challenge, requiring additional outreach or adapted service delivery modalities.", "Services are not suitable. Existing market and public systems adequately and equitably meet the needs of all groups, including the most vulnerable."] },
      { code: "H", name: "Facilitation", options: ["Facilitation is the best choice. Improving market linkages and addressing systemic exclusion — discriminatory practices, inaccessible infrastructure — delivers lasting inclusion gains.", "Facilitation is suitable. Market actors function but require advocacy, policy support, or training to ensure equitable access for vulnerable groups.", "Facilitation is possible but not ideal. Gaps in affordability, outreach, or accessibility persist. Additional direct interventions are needed alongside facilitation.", "Facilitation is not suitable. Market actors already serve all groups equitably, or the urgency of needs means structural change cannot be the primary response."] },
    ],
  },
  {
    id: 4,
    label: "Risk analysis",
    section: "Risk",
    question: "Which modality presents the most manageable risks for households and NRC?",
    sub: "Score on manageability, not just presence of risk. Consider: diversion, fraud, protection risks, dignity, and operational exposure.",
    modalities: [
      { code: "A", name: "In-Kind", options: ["In-Kind presents the most manageable risks. Market instability, insecurity, or financial system weaknesses make other modalities more exposed. Direct distribution is the safest option.", "In-Kind risks are manageable. Minor risks around logistics, storage, or targeting exist but can be mitigated with standard controls.", "In-Kind risks are possible to manage but significant. Logistical constraints, procurement fraud, or poor targeting create exposure requiring strong oversight.", "In-Kind risks are too high. Operational costs, market disruption, or dignity concerns make in-kind the highest-risk option in this context."] },
      { code: "B", name: "Cash", options: ["Cash risks are the most manageable. Financial systems are stable, fraud prevention mechanisms are in place, and security risks at transfer points are low.", "Cash risks are manageable. Some risks around theft, mismanagement, or elite capture exist but can be addressed through standard monitoring and FSP controls.", "Cash risks are possible to manage but significant. Price volatility, liquidity gaps, or intra-household control risks require additional safeguards.", "Cash risks are too high. Insecurity, financial system weaknesses, targeting failures, or protection concerns make cash the highest-risk modality in this context."] },
      { code: "C", name: "Vouchers", options: ["Voucher risks are the most manageable. Vendor-controlled transactions reduce cash diversion risk while security conditions prevent open cash distribution.", "Voucher risks are manageable. Vendor partnerships require close monitoring to prevent price gouging or collusion, but risks are containable.", "Voucher risks are possible to manage but significant. Administrative burdens, vendor fraud, or restricted beneficiary choice create challenges requiring active oversight.", "Voucher risks are too high. Weak vendor participation, security risks at redemption points, or excessive administrative complexity make vouchers unviable."] },
      { code: "D", name: "Services", options: ["Service delivery presents the most manageable risks. Direct provision avoids financial mismanagement and security risks associated with cash-based modalities.", "Service risks are manageable. Some risks around quality, accessibility, or provider accountability exist but can be addressed through partnership agreements and monitoring.", "Service risks are possible to manage but significant. Gaps in regulation, provider accountability, or physical access create concerns requiring additional oversight.", "Service delivery risks are too high. Capacity gaps, infrastructure weaknesses, or governance failures make direct service provision the highest-risk option."] },
      { code: "H", name: "Facilitation", options: ["Facilitation presents the most manageable risks. Improving market coordination minimises direct operational exposure while delivering systemic long-term impact.", "Facilitation risks are manageable. Governance improvements, vendor agreements, and oversight mechanisms can contain risks associated with market actor engagement.", "Facilitation risks are possible to manage but significant. Existing market structures are vulnerable to monopolisation, elite capture, or dependency creation.", "Facilitation risks are too high. Markets are too unstable or actors too weak to engage without creating dependency or wasting resources. Direct intervention is safer."] },
    ],
  },
  {
    id: 5,
    label: "NRC capacity",
    section: "Capacity",
    question: "Which modality is NRC currently best prepared to implement?",
    sub: "Be honest about gaps. Consider: trained staff, FSP agreements, logistics infrastructure, partner relationships, and setup time vs programme timeline.",
    modalities: [
      { code: "A", name: "In-Kind", options: ["In-Kind is the best fit for NRC capacity. Logistics, warehousing, and distribution systems are in place. Staff have experience and supply chains are established.", "In-Kind is a suitable fit. Existing systems are functional but require improvements in supply chain management, distribution logistics, or quality control.", "In-Kind is possible but capacity gaps exist. Limited logistics infrastructure requires external support or partnership arrangements to implement effectively.", "In-Kind is not a suitable fit. NRC lacks the logistics capacity, warehousing, or procurement expertise required. The risk of poor implementation is too high."] },
      { code: "B", name: "Cash", options: ["Cash is the best fit for NRC capacity. Financial management systems are robust, staff are trained in cash programming, and FSP agreements are in place.", "Cash is a suitable fit. Some capacity exists but additional technical support, FSP onboarding, or staff training is required before full implementation.", "Cash is possible but capacity gaps exist. Gaps in financial accountability, monitoring systems, or digital payment infrastructure require significant investment.", "Cash is not a suitable fit. NRC lacks cash programming experience, compliance mechanisms, or the financial partnerships required. Implementation risk is too high."] },
      { code: "C", name: "Vouchers", options: ["Vouchers are the best fit for NRC capacity. NRC has experience managing voucher systems, vendor agreements are in place, and redemption monitoring is established.", "Vouchers are a suitable fit. A voucher system can be implemented but requires enhancements in vendor agreements, electronic systems, or distribution monitoring.", "Vouchers are possible but capacity gaps exist. Limited experience in electronic voucher management requires investment in training and vendor network development.", "Vouchers are not a suitable fit. NRC lacks the experience, vendor relationships, or tracking systems to manage a voucher programme effectively."] },
      { code: "D", name: "Services", options: ["Services are the best fit for NRC capacity. NRC has the technical expertise and partner relationships to deliver the required services at scale.", "Services are a suitable fit. Service delivery capacity exists but requires improvements in staffing levels, quality standards, or geographic coverage.", "Services are possible but capacity gaps exist. NRC has limited expertise in direct service provision, requiring collaboration with specialist partners.", "Services are not a suitable fit. NRC lacks the technical capacity, specialist staff, or operational infrastructure required for direct service delivery."] },
      { code: "H", name: "Facilitation", options: ["Facilitation is the best fit for NRC capacity. NRC and its partners have market analysis expertise, established private sector relationships, and facilitation experience.", "Facilitation is a suitable fit. Capacity exists but requires improvements in market assessment methodology, private sector engagement, or coordination structures.", "Facilitation is possible but capacity gaps exist. Facilitation expertise is limited, requiring investment in specialist skills, advocacy capacity, or partner development.", "Facilitation is not a suitable fit. Neither NRC nor its partners have the market systems expertise or relationships required to implement facilitation effectively."] },
    ],
  },
  {
    id: 6,
    label: "Recipients' views",
    section: "Views",
    question: "Which modality do affected households prefer?",
    sub: "Draw on PDM data, community consultations, and protection assessments. If no preference data exists, score conservatively and flag the gap.",
    modalities: [
      { code: "A", name: "In-Kind", options: ["In-Kind is strongly preferred. Beneficiaries favour direct distribution due to cultural preferences, distrust of financial systems, or past experience of market failures.", "In-Kind is accepted. Most beneficiaries accept in-kind assistance, though some would prefer greater flexibility. Dignity and relevance of goods are adequate.", "In-Kind is tolerated but not preferred. Many beneficiaries find in-kind restrictive and would prefer cash or vouchers for greater autonomy.", "In-Kind is rejected. Recipients overwhelmingly prefer market-based options. In-kind assistance is seen as undignified, irrelevant, or paternalistic."] },
      { code: "B", name: "Cash", options: ["Cash is strongly preferred. Beneficiaries value the autonomy, flexibility, and dignity of cash transfers. Community consultations confirm strong support.", "Cash is preferred by most. Some concerns exist around security, intra-household use, or access to financial services, but overall acceptance is high.", "Cash has mixed reception. Some households prefer cash but others have concerns — security, intra-household dynamics, or lack of financial literacy affect acceptance.", "Cash is not preferred or raises significant concerns. Beneficiaries and community leaders have expressed clear objections to cash-based assistance."] },
      { code: "C", name: "Vouchers", options: ["Vouchers are strongly preferred. Recipients value the structure and predictability of vouchers while appreciating the ability to choose among approved goods.", "Vouchers are accepted. Most beneficiaries support the voucher system, though some have concerns about vendor availability or restricted choice.", "Vouchers have mixed reception. Some beneficiaries prefer unrestricted cash; others accept vouchers. Vendor proximity and product range affect satisfaction.", "Vouchers are not preferred. Recipients largely reject voucher programmes due to restricted choice, inconvenient vendor locations, or poor past experience."] },
      { code: "D", name: "Services", options: ["Services are strongly preferred. Beneficiaries express clear demand for direct service provision — particularly for health, legal, or protection needs — that markets cannot meet.", "Services are accepted. Most recipients support service-based assistance, though some concerns around access, quality, or timeliness exist.", "Services have mixed reception. Some beneficiaries prefer direct transfers; others value specific services. Acceptability varies by service type and location.", "Services are not preferred. Beneficiaries overwhelmingly prefer direct transfers or goods over service-based assistance."] },
      { code: "H", name: "Facilitation", options: ["Facilitation is strongly supported. Community members and local actors express preference for strengthening markets and local capacity over direct assistance.", "Facilitation is accepted. Market actors and community leaders support facilitation approaches but also see a role for some direct assistance.", "Facilitation has mixed reception. Views differ on whether market strengthening is the right priority. Some community members prefer more immediate direct support.", "Facilitation is not supported. Beneficiaries and community actors prefer direct interventions. Market strengthening is not seen as responsive to immediate needs."] },
    ],
  },
  {
    id: 7,
    label: "External alignment",
    section: "Alignment",
    question: "Which modality best aligns with donor priorities and government policy?",
    sub: "Consider: donor strategy and earmarks, government cash transfer policy, cluster recommendations, and what other actors are implementing in the same area.",
    modalities: [
      { code: "A", name: "In-Kind", options: ["In-Kind is strongly aligned. Donor funding is earmarked for commodity distribution and government policy prioritises or mandates in-kind assistance.", "In-Kind is broadly aligned. Donors and government accept in-kind assistance, though some preference for market-based approaches is emerging.", "In-Kind is partially aligned. Donors and government show mixed views; additional justification would be required to secure and maintain support.", "In-Kind is not aligned. Major donors and government policy actively favour market-based interventions. In-kind would require significant advocacy to fund or approve."] },
      { code: "B", name: "Cash", options: ["Cash is strongly aligned. Donors (e.g. ECHO, BHA, FCDO) actively prioritise cash and government policy supports or runs its own cash transfer programme.", "Cash is broadly aligned. Funding is available and government is supportive, though compliance requirements or reporting obligations require additional management.", "Cash is partially aligned. Some donors are hesitant about unrestricted cash; government has mixed views. Additional advocacy and documentation would be needed.", "Cash is not aligned. Donor funding streams do not support cash programming and government policy restricts or prohibits cash transfers to affected populations."] },
      { code: "C", name: "Vouchers", options: ["Vouchers are strongly aligned. Donors prefer controlled spending mechanisms and government policy supports market-based voucher systems.", "Vouchers are broadly aligned. Funding exists and government accepts vouchers, though specific requirements around vendor registration or reporting apply.", "Vouchers are partially aligned. Donor and government interest is inconsistent; some prefer cash while others view vouchers as overly complex.", "Vouchers are not aligned. Donors do not fund voucher schemes and government policy does not support implementation."] },
      { code: "D", name: "Services", options: ["Services are strongly aligned. Donors prioritise sector-specific service investments and government policy mandates or actively supports direct service provision.", "Services are broadly aligned. Funding is available for service delivery, though additional co-ordination with government line ministries is required.", "Services are partially aligned. Donors favour more direct forms of assistance and government capacity to co-implement services is limited.", "Services are not aligned. Current donor strategies and government priorities do not support direct service provision. Alternative modalities are favoured."] },
      { code: "H", name: "Facilitation", options: ["Facilitation is strongly aligned. Donors prioritise market systems strengthening and government actively supports private sector development as part of the response.", "Facilitation is broadly aligned. Funding is available but requires feasibility evidence, cost-benefit analysis, or phased implementation planning.", "Facilitation is partially aligned. Donor interest fluctuates and government support for NRC operating in the commercial space requires active relationship management.", "Facilitation is not aligned. Current donor funding and government policy do not support market facilitation. Direct interventions are the expected response."] },
    ],
  },
];

export const MODS: Array<{ c: ModCode; n: string }> = [
  { c: "A", n: "In-Kind" },
  { c: "B", n: "Cash" },
  { c: "C", n: "Vouchers" },
  { c: "D", n: "Services" },
  { c: "H", n: "Facilitation" },
];

export const GRADES: Array<{ k: GradeKey; lb: string; sc: number }> = [
  { k: "A", lb: "Most suitable", sc: 3 },
  { k: "B", lb: "Suitable",      sc: 2 },
  { k: "C", lb: "Possible",      sc: 1 },
  { k: "D", lb: "Not possible",  sc: 0 },
];

export const GRADE_COLORS: Record<GradeKey, { bg: string; border: string; color: string }> = {
  A: { bg: "#dcfce7", border: "#16a34a", color: "#16a34a" },
  B: { bg: "#ccfbf1", border: "#0d9488", color: "#0d9488" },
  C: { bg: "#fef3c7", border: "#d97706", color: "#d97706" },
  D: { bg: "#fee2e2", border: "#dc2626", color: "#dc2626" },
};

export const GRADE_LABELS: Record<GradeKey, string> = {
  A: "Most suitable",
  B: "Suitable",
  C: "Possible",
  D: "Not possible",
};

export const RATIONALE: Record<string, string> = {
  "In-Kind":      "In-kind delivery ensures standardised goods reach households directly, regardless of market conditions. Most appropriate when markets are absent or inaccessible and specific goods must be quality-controlled.",
  "Cash":         "Cash assistance gives households the agency and dignity to meet their own priorities. Best suited to functional markets with accessible financial services — typically the most flexible and cost-efficient option.",
  "Vouchers":     "Vouchers balance household choice with programmatic oversight. Appropriate where markets function but price, quality, or protection risks require a degree of control over what is purchased.",
  "Services":     "Direct service delivery addresses needs that markets cannot supply — legal aid, medical care, WASH, protection. Usually complementary to transfers rather than a standalone modality.",
  "Facilitation": "Market facilitation addresses systemic barriers preventing markets from serving affected populations. A longer-term structural approach best suited to recovery phases rather than acute emergencies.",
};

export const DELIVERY_TYPE: Record<string, string> = {
  "In-Kind": "Direct", "Cash": "Direct", "Vouchers": "Direct",
  "Services": "Direct", "Facilitation": "Facilitative",
};

export const MARKET_APPROACH: Record<string, string> = {
  "In-Kind": "Use Markets", "Cash": "Use Markets", "Vouchers": "Use Markets",
  "Services": "Support Markets", "Facilitation": "Change Markets",
};
