// Landing copy, verbatim from docs/design/board-a.html. Bracketed placeholders stay visible
// until the owner supplies the facts.

export const CONTACT_EMAIL = 'rolanjerorarelapinton@gmail.com'

export const SECTION_LINKS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#roles', label: "Who it's for" },
  { href: '/#integrations', label: 'Integrations' },
  { href: '/#faq', label: 'FAQ' },
]

export const HERO = {
  en: {
    title: 'From alert to aid, household by household.',
    lead: 'HANDA turns PAGASA, NDRRMC and PHIVOLCS alerts into barangay assessments, resident check-ins and a response queue. Built on eGovPH for barangays and LGUs.',
  },
  fil: {
    title: 'Mula babala hanggang tulong, bawat sambahayan.',
    lead: 'Ginagawang barangay assessment, check-in ng residente at response queue ng HANDA ang mga babala ng PAGASA, NDRRMC at PHIVOLCS. Nakabatay sa eGovPH, para sa mga barangay at LGU.',
  },
}

export const TRUST = ['eGov SSO', 'eGovPH eSMS', 'eGov AI', 'eReport']

export const STEPS = [
  {
    tag: 'Alert',
    title: 'Alerts come in',
    body: 'CAP and SMS alerts from PAGASA, NDRRMC and PHIVOLCS are parsed, matched to PSGC locations and scored for severity.',
  },
  {
    tag: 'Assess',
    title: 'An assessment is drafted',
    body: 'HANDA drafts RDANA questions for the affected area. A barangay official reviews, edits and publishes them.',
  },
  {
    tag: 'Check in',
    title: 'Households check in',
    body: 'Residents answer in the eGovPH app, in Filipino or English. Family members of one household are counted once.',
  },
  {
    tag: 'Respond',
    title: 'Officials respond',
    body: 'A queue with filters, status updates, manual entries and CSV export. LGU command sees the whole municipality.',
  },
]

export const ROLES = [
  {
    where: 'eGovPH app',
    title: 'Residents',
    body: 'Check in after an alert, report household needs, ask the citizen assistant, and file an eReport.',
  },
  { where: 'Web console', title: 'Barangay officials', body: 'Publish assessments, work the check-in queue, and export reports.' },
  { where: 'Web console', title: 'LGU command', body: 'Monitor every barangay in the municipality and coordinate incident response.' },
  {
    where: 'Developer console',
    title: 'Developers',
    body: 'Request API access, read the documentation, and browse eReport datasets.',
  },
]

export const INTEG = [
  { name: 'eGov SSO', body: 'Residents and officials sign in with the eGovPH account they already have.' },
  { name: 'eGovPH eSMS', body: 'Assessment notices go out by text message.' },
  { name: 'eGov AI', body: 'Drafts questions, translates answers and powers the citizen assistant.' },
  { name: 'eReport', body: 'Complaints and location datasets go to the eReport service.' },
  { name: 'Telegram', body: 'Optional channel for assessment notifications.' },
]

export const ALERT_SOURCES = ['PAGASA', 'NDRRMC', 'PHIVOLCS']

export const FACTS = [
  { value: '3', label: 'alert sources', note: 'PAGASA, NDRRMC, PHIVOLCS' },
  { value: '4', label: 'roles', note: 'resident, barangay, LGU, developer' },
  { value: '1', label: 'count per household', note: 'family check-ins are de-duplicated' },
  { value: '< 3 min', label: 'end-to-end demo', note: 'from alert to response queue' },
]

export const FAQ = [
  {
    q: 'Is HANDA running in my barangay now?',
    a: 'Not yet. HANDA is a prototype built for the eGovPH Hackathon 2026. The demo uses sample households and simulated alerts.',
  },
  {
    q: 'Do residents need a new account?',
    a: 'No. Residents use the eGovPH account they already have. HANDA reads their verified barangay from eGovPH sign-in.',
  },
  {
    q: 'What data does HANDA keep?',
    a: "Check-in answers, linked to the resident's eGovPH ID and barangay code. Service keys stay on the server, never in the browser. Retention period: [to be set before a pilot].",
  },
  {
    q: 'What if there is no mobile data?',
    a: 'Assessment notices can go out by SMS through eGovPH eSMS. Offline check-in: [answer pending].',
  },
  {
    q: 'Can I use HANDA to call for rescue?',
    a: 'No. HANDA is not an emergency hotline. In an emergency, call 911 or your barangay hotline.',
  },
  { q: 'What does a pilot cost an LGU?', a: '[Pricing to be confirmed by Cordon Bleu.]' },
]

export const PILOT_ROLES = [
  'Barangay official',
  'LGU disaster office (MDRRMO or CDRRMO)',
  'Other LGU staff',
  'Other',
]

export type LegalSlug = 'privacy' | 'terms' | 'accessibility' | 'cookies'

export const LEGAL: Record<LegalSlug, { nav: string; title: string; lead: string; items: [string, string][] }> = {
  privacy: {
    nav: 'Privacy notice',
    title: 'Privacy notice',
    lead: 'How Cordon Bleu handles personal data in HANDA, under the Data Privacy Act of 2012 (RA 10173).',
    items: [
      ['Who we are', 'Cordon Bleu, the team behind HANDA. [Registered address and Data Protection Officer contact pending.]'],
      [
        'What we collect',
        'Pilot requests: name, work email, LGU or barangay, role, message. In the app: eGovPH ID, name and barangay from eGovPH sign-in, and check-in answers.',
      ],
      [
        'Why we collect it',
        'To reply to pilot requests, and to let barangays and LGUs see which households need help after an incident.',
      ],
      [
        'Who we share it with',
        'Your barangay and LGU officials, and the eGovPH services HANDA uses for sign-in, SMS, AI and eReport. [List to be confirmed.]',
      ],
      ['How long we keep it', '[Retention period pending.]'],
      [
        'Your rights',
        'Under RA 10173 you can ask to see, correct or delete your data, object to processing, and file a complaint with the National Privacy Commission.',
      ],
      [
        'Contact',
        `Email ${CONTACT_EMAIL} for privacy questions or to access, correct or delete your data. [Data Protection Officer name pending.]`,
      ],
    ],
  },
  terms: {
    nav: 'Terms of use',
    title: 'Terms of use',
    lead: 'The rules for using the HANDA prototype.',
    items: [
      ['Prototype status', 'HANDA is a prototype for the eGovPH Hackathon 2026. It runs on sample data and may change or stop without notice.'],
      ['Not an emergency service', 'Do not use HANDA to request rescue. In an emergency, call 911 or your barangay hotline.'],
      ['Acceptable use', "Do not submit false reports, or other people's data without their consent."],
      ['Liability', '[Liability and warranty terms pending legal review.]'],
      ['Governing law', 'Laws of the Republic of the Philippines.'],
    ],
  },
  accessibility: {
    nav: 'Accessibility statement',
    title: 'Accessibility statement',
    lead: 'What we do so everyone can use HANDA.',
    items: [
      ['Our target', 'WCAG 2.2 level AA.'],
      ['What we do', 'Keyboard navigation, visible focus, AA color contrast in light and dark, reduced motion, English and Filipino.'],
      ['Known issues', '[Pending accessibility audit.]'],
      ['Report a problem', `Email ${CONTACT_EMAIL} and tell us the page and what went wrong.`],
    ],
  },
  cookies: {
    nav: 'Cookie policy',
    title: 'Cookie policy',
    lead: 'What HANDA stores in your browser.',
    items: [
      ['What we use', 'Only essential storage: your sign-in session in the app and your language choice.'],
      ['What we do not use', 'No analytics, advertising or tracking cookies.'],
      ['If this changes', 'We will ask for your consent first, with Accept, Reject and Customize options.'],
    ],
  },
}
