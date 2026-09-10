# Synthetic data

Files in this directory are generated exclusively by this repository.

The samples reconstruct the historical workflow's lead/note relationship without
copying source records:

- `leads_sample.csv` - 20 synthetic raw-like lead rows;
- `lead_notes_sample.csv` - matching one-to-many synthetic note rows.

Both are generated with seed `42`. `leads.ObjectID` joins to
`lead_notes.ParentObjectID`.

The generator is calibrated from aggregate facts visible in public 2024 notebook
outputs, including status/source frequencies, selected-field missingness, note
relationship rates, language proportions, and selected field cardinalities.

The values themselves are newly generated. No historical identifier, customer or
employee name, or free-text note is copied, masked, translated, perturbed, or
sampled into these files.

See `docs/HISTORICAL_DATA_PROFILE.md` for the evidence and the remaining
approximations.
