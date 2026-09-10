# Data and Secrets Policy

## Allowed repository content

- Code written for the 2026 reconstruction
- Synthetic records produced by the repository's generator
- Aggregated metrics computed from synthetic data
- Public documentation written specifically for this repository
- Environment-variable names without real secret values

## Prohibited repository content

- Original CRM exports, lead notes, account names, contact names, or identifiers
- Corporate slide decks, internal specifications, or partner communications
- Source archives from the 2024 prototype unless ownership is explicitly cleared
- API keys, access tokens, passwords, private endpoints, or populated `.env` files
- Model artifacts trained on the original corporate dataset

## Synthetic-data rule

Public data must be generated from a documented statistical specification. It
must not be created by perturbing, masking, translating, or sampling real records.
Names, notes, IDs, and dates must be newly generated and non-identifying.

## Secret handling

- Configure services through environment variables.
- Commit `.env.example` with placeholders only.
- Keep local `.env` files ignored by Git.
- Run a secret scan before every public release.
- Revoke any historical credential that may have been included in an archive,
  even if the archive is never committed.

## Pre-publication checklist

- [ ] `git status` contains no archive or raw-data path
- [ ] repository history contains no secret or customer information
- [ ] synthetic-data generator and seed are documented
- [ ] generated samples pass schema and privacy tests
- [ ] team attribution and corporate naming have been reviewed
- [ ] secret scan reports no verified findings
