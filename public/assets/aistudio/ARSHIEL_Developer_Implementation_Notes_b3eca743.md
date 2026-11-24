# ARSHIEL SAFETY – Global EHS Master Database (v1.0)

## Package contents
- `ARSHIEL_Global_EHS_Master_Database.xlsx`: industry taxonomy, parent modules, master document inventory, industry-specific inventory, reference register, template catalogue, relational data model, workflows and dynamic field schema.
- `ARSHIEL_Editable_EHS_Template_Library.docx`: original editable starter templates with approval and revision tables.
- This note: developer implementation guidance.

## Recommended document code
`AR-{COUNTRY}-{SITE}-{MODULE}-{TYPE}-{SEQUENCE}`
Example: `AR-IN-HYD01-PTW-PER-0001`

## Recommended dynamic hierarchy
Tenant → Business Unit → Country → Site → Department → Area → Parent Module → Child Module → Document Template → Document Version → Form Submission / Evidence → Action / CAPA.

The module tree should support unlimited configurable depth while enforcing permissions, validation and usable navigation.

## Critical safeguards
1. A library entry is not proof of legal compliance.
2. Legal applicability must be assessed by country, state, local authority, site, activity and threshold.
3. India OSHWC Code 2020 commencement is shown as 21-Nov-2025; the Ministry's Labour Codes page lists OSHWC Central Rules 2026. Verify state rules, notifications and current implementation.
4. Factories Act 1948 is retained as a legacy / historical mapping and transition reference; do not label it as universally current primary law.
5. ISO/NFPA/SEMI standards are copyrighted. Store metadata and licensed links; do not reproduce full text without permission.
6. Clause-level mapping is marked for validation. Populate only from licensed/current editions and competent review.
7. Medical and personal information needs restricted role-based access and applicable privacy controls.
8. AI-generated assessments and documents are advisory drafts. Human competent review and approval are mandatory.
9. Configure review frequencies and retention periods based on law, risk, manufacturer instructions and company policy.

## Official reference links
- India Code: https://www.indiacode.nic.in/indiacode/handle/123456789/22041?view_type=browse
- Ministry of Labour & Employment: https://www.labour.gov.in/offerings/schemes-and-services/details/labour-codes-gzNzQzMtQWa
- ISO 45001: https://www.iso.org/standard/45001
- ISO 14001: https://www.iso.org/standard/14001
- OSHA 1910: https://www.osha.gov/laws-regs/regulations/standardnumber/1910
- OSHA 1926: https://www.osha.gov/laws-regs/regulations/standardnumber/1926
- NFPA Codes: https://www.nfpa.org/codes-and-standards
- CPCB rules: https://cpcb.nic.in/web/rules/

This package is an implementation starter. It requires local legal review, licensed standard access, site-specific risk assessment and controlled approval before operational deployment.
