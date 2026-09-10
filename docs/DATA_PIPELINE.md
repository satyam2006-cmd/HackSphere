# Calibrated Synthetic CRM Specification

This document defines the privacy-safe synthetic data used by HackSphere. The
records are newly generated, while the schema, relationships, and selected
statistical properties are calibrated from aggregate project requirements.

For the reconstructed source statistics and their provenance, see
[Historical CRM Aggregate Profile](HISTORICAL_DATA_PROFILE.md).

## Historical shape

The synthetic workflow uses:

- `leads.csv`: 86,244 rows x 181 columns;
- `lead_notes.csv`: 134,793 rows x 16 columns;
- inner join on `ObjectID = ParentObjectID`;
- earliest `Created_On` note selected per lead;
- 78,759-row working cohort;
- later reduced `Short*` datasets used for modeling experiments.

HackSphere therefore keeps **raw-like lead and note tables separate**.

## Public synthetic tables

### `leads`

The generator includes only lead fields whose names/roles are visible in public
notebook outputs. Examples include:

- `ObjectID`, `Lead_ID`;
- `Name`, `Name_Language_Code`, `Name_Language_Code_Text`;
- account/contact labels;
- `Contact_Information_Job_Title`;
- `Status_Text`, `Reason_Code_Text`, `Source_Text`, `Priority_Text`;
- `Start_Date`, `End_Date`;
- owner, marketing, sales-unit, and territory fields;
- lead-level `Note`.

The historical raw lead table had 181 columns. Unknown fields are **not** padded
with meaningless invented placeholders merely to reach 181 columns. Additional
fields can be added as their public schema and behavior are recovered.

### `lead_notes`

The public raw note export had 16 columns. The synthetic table recreates the 15
semantic fields visible in the notebook and deliberately omits the CSV index
artifact `Unnamed: 0`.

Important fields include:

- note `ObjectID`;
- `ParentObjectID` and `HeaderObjectID`;
- `Text`;
- note type fields;
- author fields;
- `Created_On` and `Updated_On`.

## Default calibration

With `missing_rate=None`, `generate_synthetic_crm()` uses public aggregate facts
rather than generic hand-authored percentages where those facts are available.

Examples:

- five historical workflow statuses, with Converted at approximately 7.74%;
- all 39 observed `Source_Text` categories with their aggregate frequencies;
- approximately 91.32% of leads receiving at least one note row;
- approximately 1.71 note rows per matched lead on average;
- field-specific working-cohort missingness, including approximately 61.79% for
  `Sales_Unit_Name` and 51.06% for `Sales_Territory_Name`;
- large, skewed synthetic pools reflecting observed cardinalities such as 1,108
  owners, 104 sales units, and 397 territories;
- mixed date formatting and dirty note placeholders observed in the public data;
- lead-name language-code proportions from the raw notebook summary.

`missing_rate` remains available as an explicit override for edge-case tests.

## What remains synthetic

Calibration does **not** mean the historical rows were anonymized or copied.
Every public record is newly generated.

The generator does not read, mask, perturb, translate, sample, or memorize source
customer rows. Generated identifiers and person/account/organization labels are
explicitly synthetic. Free-text templates are newly written and do not copy the
historical notes.

## What remains approximate

Some original distributions are not fully recoverable from public notebook
outputs. The current generator therefore documents, rather than hides, the
remaining approximations:

- exact note-count histogram;
- every one of the 181 raw lead fields and their missingness;
- full job-title and reason-code distributions;
- exact date-format and duration distributions;
- full multivariate correlations between fields.

As more public aggregate evidence is recovered, these parts can be calibrated
without changing the privacy boundary.

## Historical preprocessing behavior to reproduce next

The public `make_leads-Copy1.ipynb` workflow:

1. selects `ParentObjectID`, `Text`, and `Created_On` from notes;
2. inner-joins notes to leads by `ObjectID`;
3. selects the working fields;
4. groups by `ObjectID`;
5. keeps the earliest `Created_On` row.

That behavior belongs in the preprocessing milestone rather than this generator
PR.

A separate concern also needs to be handled there: public notebook examples
indicate that some converted-lead note text represented post-conversion system
events. Those fields can leak the target and must not be blindly used as
predictors.

## Reproducibility

The generator uses NumPy's seeded RNG. Identical generator arguments reproduce
identical synthetic lead and note tables.

## Validation in this milestone

Tests cover:

- deterministic regeneration;
- lead and note schema contracts;
- unique synthetic identifiers and valid foreign keys;
- leads with no note rows;
- approximate agreement with the public status and missingness profile on a
  larger generated sample;
- clearly synthetic public identifiers and labels;
- invalid argument handling.

## Samples

- `data/synthetic/leads_sample.csv`
- `data/synthetic/lead_notes_sample.csv`

Both are generated with seed `42`. They exist only for inspection and contain no
historical source rows.
