# Historical CRM Aggregate Profile

This document records the aggregate facts used to calibrate the public synthetic
data generator. The facts below are represented as aggregate implementation
assumptions for the synthetic data generator.

No historical customer rows, identifiers, employee names, free-text notes,
credentials, or trained model artifacts are copied into this repository.

## Reconstructed data flow

The synthetic workflow uses these stages:

1. `leads.csv`: 86,244 rows x 181 columns.
2. `lead_notes.csv`: 134,793 rows x 16 columns.
3. Inner join `leads.ObjectID = lead_notes.ParentObjectID`.
4. Select a smaller working field set.
5. Group by `ObjectID` and keep the row with the earliest `Created_On` note.
6. Resulting working cohort: 78,759 lead rows.
7. A later `Short4_leads.csv` drops join-only fields for model experiments.

The pipeline moves from wide, sparse CRM-like tables through join and reduction
stages before training.

## Lead-to-note relationship

- Raw leads: 86,244
- Raw note rows: 134,793
- Leads surviving the note inner join: 78,759
- Matched-lead rate: approximately 91.32%
- Unmatched-lead rate: approximately 8.68%
- Mean note rows per matched lead: approximately 1.71

The generator reproduces the unmatched-lead behavior and approximates the
one-to-many note count with a shifted Poisson distribution. The exact historical
note-count histogram was not published, so the distribution shape is an
approximation even though its mean is calibrated.

## Status distribution

The Transformer notebook tripled `Converted` rows before displaying class
counts. Reversing only that documented oversampling step gives the original
78,759-row working-cohort counts:

| Status | Count | Share |
| --- | ---: | ---: |
| Closed | 53,538 | 67.98% |
| Unqualified | 14,402 | 18.29% |
| Converted | 6,097 | 7.74% |
| Qualified | 3,789 | 4.81% |
| Sales Rejected | 933 | 1.18% |

The public generator uses these proportions by default. This replaces the early
hand-authored conversion distribution used in the first reconstruction draft.

## Source distribution

`Source_Text` contains 39 observed categories in the working cohort. The largest
ones are strongly imbalanced:

| Source | Count |
| --- | ---: |
| Website Contact Form | 34,328 |
| Web Member Registration | 13,604 |
| Sales | 6,227 |
| Webinar | 5,012 |
| Trade Show | 4,466 |
| Conference | 4,140 |
| Chat-bot | 2,043 |
| e-Catalog | 1,446 |
| Relationship newsletter | 1,320 |
| Sealing Solutions Configurator | 1,006 |

All 39 aggregate counts are stored in
`src/lead_intelligence/historical_profile.py` and are used as generation weights.

## Working-cohort missingness

After the note join and earliest-note selection, the public notebook reports:

| Field | Missing | Missing rate |
| --- | ---: | ---: |
| Name | 161 | 0.20% |
| Contact_Information_Job_Title | 12,005 | 15.24% |
| Sales_Unit_Name | 48,663 | 61.79% |
| Sales_Territory_Name | 40,215 | 51.06% |
| Note | 1,400 | 1.78% |
| Text | 423 | 0.54% |

`Source_Text`, `Status_Text`, `Start_Date`, `End_Date`, `Owner_Party_Name`,
`ObjectID`, and `Created_On` were non-null in that 78,759-row working cohort.

A useful consistency relationship is also visible across the notebook outputs:

- raw lead `Note` missing count: 8,885;
- leads excluded by the note inner join: 86,244 - 78,759 = 7,485;
- joined-cohort lead `Note` missing count: 1,400;
- 7,485 + 1,400 = 8,885.

The generator preserves this relationship structurally: leads without note rows
have a null lead-level `Note`, while matched leads use the observed 1.78% lead
`Note` missing rate.

## High-cardinality fields

The public working-cohort output reports:

- `Name`: 11,768 distinct values;
- `Start_Date`: 3,083 distinct string values;
- `Owner_Party_Name`: 1,108 distinct values;
- `Sales_Unit_Name`: 104 distinct non-null values;
- `Sales_Territory_Name`: 397 distinct non-null values.

The synthetic generator creates large synthetic label pools and skewed sampling
weights instead of reusing historical project, employee, team, or territory
names.

## Dirty-data signals preserved

The public raw data is visibly less clean than a typical tutorial dataset:

- many of the 181 lead fields contain nulls;
- dozens of raw lead columns trigger mixed-type CSV warnings;
- `Start_Date` remains an object column and contains mixed ISO and M/D/YYYY
  formatting;
- raw examples include sentinel `End_Date` values such as `9999-12-31`;
- 1,393 raw lead notes contain the literal placeholder `.`;
- lead and note text appears in multiple languages;
- the note table is one-to-many rather than one-row-per-lead.

The reconstruction deliberately keeps several of these properties so later
preprocessing has real engineering work to perform. The public outputs do not
quantify the sentinel-date frequency, so that property is documented but not yet
statistically calibrated in the generator.

## Potential target leakage found in the historical workflow

The public notebook comments and examples indicate that some note `Text` values
for converted leads were system-generated conversion-event messages. A model
that consumes those messages can learn the outcome after it happened rather than
predicting conversion from pre-outcome information.

The synthetic-data milestone records this historical issue but does not solve it.
The preprocessing milestone must define an explicit prediction cutoff and remove
post-outcome/system-event information before model training.

## Observed vs approximated

Directly calibrated from public notebook aggregates:

- raw row/column counts;
- lead/note relationship rate and mean note count;
- five status proportions;
- all 39 `Source_Text` proportions;
- selected field missingness;
- selected field cardinalities;
- raw lead-name language proportions;
- raw `Note` null count and `.` placeholder count.

Still approximated because a complete distribution was not available in the
public outputs:

- exact per-lead note-count histogram;
- full 181-column lead dictionary and every field's missingness;
- full job-title distribution;
- reason-code distribution;
- exact date-format, sentinel-date, and lead-duration distributions;
- relationships/correlations between every pair of fields.

Those approximations are kept explicit rather than being presented as historical
facts.
