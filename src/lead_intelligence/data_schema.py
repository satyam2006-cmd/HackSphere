"""Observed public schema for the privacy-safe CRM reconstruction."""

from __future__ import annotations

from typing import Final

from lead_intelligence.historical_profile import HISTORICAL_RAW_LEAD_COLUMNS

ID_COLUMN: Final = "ObjectID"
NOTE_PARENT_COLUMN: Final = "ParentObjectID"
STATUS_COLUMN: Final = "Status_Text"
CONVERTED_STATUS: Final = "Converted"

# Publicly observed lead fields. This is intentionally not padded with invented
# placeholders just to reach the historical 181-column width.
LEAD_COLUMNS: Final[tuple[str, ...]] = (
    ID_COLUMN,
    "Lead_ID",
    "Name",
    "Name_Language_Code",
    "Name_Language_Code_Text",
    "Account_Party_Name",
    "Main_Contact_Person_Name",
    "Company",
    "Contact_Information_Job_Title",
    STATUS_COLUMN,
    "Reason_Code_Text",
    "Source_Text",
    "Priority_Text",
    "Start_Date",
    "End_Date",
    "Owner_Party_Name",
    "Marketing_Unit_Name",
    "Sales_Unit_Name",
    "Sales_Territory_Name",
    "Note",
)

# Semantic columns observed in the public 16-column lead_notes.csv export.
# The original first column, `Unnamed: 0`, was a CSV index artifact and is not
# reproduced as domain data.
LEAD_NOTE_COLUMNS: Final[tuple[str, ...]] = (
    "ObjectID",
    NOTE_PARENT_COLUMN,
    "HeaderObjectID",
    "External_Key",
    "LeadExternalKey",
    "ID",
    "Text",
    "Language_Code",
    "Language_Code_Text",
    "Type_Code",
    "Type_Code_Text",
    "Author_UUID",
    "Author_Name",
    "Created_On",
    "Updated_On",
)

# Fields selected by the original make_leads-Copy1.ipynb after joining notes.
JOINED_WORKFLOW_COLUMNS: Final[tuple[str, ...]] = (
    "Name",
    "Contact_Information_Job_Title",
    "Source_Text",
    STATUS_COLUMN,
    "Start_Date",
    "End_Date",
    "Owner_Party_Name",
    "Sales_Unit_Name",
    "Sales_Territory_Name",
    ID_COLUMN,
    "Created_On",
    "Note",
    "Text",
)

HISTORICAL_LEAD_WIDTH: Final = HISTORICAL_RAW_LEAD_COLUMNS
