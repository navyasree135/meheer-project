import logging
import re
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

def clean_null_str(val: Any) -> Optional[str]:
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if s in ["--", "-", "N/A", "n/a", "NA", "null", "NULL", ""]:
        return None
    return s

def parse_flexible_date(val: Any) -> Optional[date]:
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (datetime, pd.Timestamp)):
        return val.date()
    if isinstance(val, date):
        return val
    s = str(val).strip()
    if s in ["--", "-", "N/A", "n/a", "NA", "null", "NULL", ""]:
        return None
    try:
        # Try DD-Mon-YYYY format first e.g. 30-Aug-2026
        dt = datetime.strptime(s, "%d-%b-%Y")
        return dt.date()
    except Exception:
        pass
    try:
        dt = date_parser.parse(s, dayfirst=True)
        return dt.date()
    except Exception as e:
        logger.debug(f"Could not parse date string '{val}': {e}")
        return None

def get_iso_week_info(d: Optional[date]) -> Tuple[Optional[int], Optional[int], Optional[str]]:
    """Returns (iso_year, iso_week, week_label e.g. 'Week of Aug 3, 2026')"""
    if not d:
        return None, None, None
    iso_year, iso_week, _ = d.isocalendar()
    # Find Monday of that ISO week
    monday = d - timedelta(days=d.weekday())
    week_label = f"Week of {monday.strftime('%b %d')}"
    return iso_year, iso_week, week_label

def parse_type_hierarchy(raw_type: Optional[str]) -> Tuple[str, Optional[str], Optional[str]]:
    """
    Splits 'Category, Sub-Category, Detail' into 3 parts.
    e.g. 'Unsafe Act, Tools & Equipment, Use of defective tools' -> ('Unsafe Act', 'Tools & Equipment', 'Use of defective tools')
    """
    if not raw_type:
        return "Unclassified", None, None
    parts = [p.strip() for p in str(raw_type).split(",") if p.strip()]
    if len(parts) == 0:
        return "Unclassified", None, None
    if len(parts) == 1:
        return parts[0], None, None
    if len(parts) == 2:
        return parts[0], parts[1], None
    # 3 or more parts: join remainder as detail
    return parts[0], parts[1], ", ".join(parts[2:])

def parse_location_hierarchy(raw_loc: Optional[str]) -> Tuple[str, Optional[str]]:
    """
    Splits 'Unit 51, FG Warehouse central' into unit and sub_location.
    """
    if not raw_loc:
        return "Unknown Unit", None
    parts = [p.strip() for p in str(raw_loc).split(",") if p.strip()]
    if len(parts) == 0:
        return "Unknown Unit", None
    if len(parts) == 1:
        return parts[0], None
    return parts[0], ", ".join(parts[1:])

def parse_pair_present(val: Any) -> bool:
    if pd.isna(val) or val is None:
        return False
    s = str(val).strip().lower()
    return s in ["yes", "true", "1", "y", "t"]

def parse_observation_rows_from_df(df: pd.DataFrame, dataset_id: str) -> List[Dict[str, Any]]:
    """
    Parses a Pandas DataFrame of the observations sheet into a list of normalized row dicts
    ready for Kafka publishing or direct ingestion.
    """
    # Normalize column names: strip whitespace and match case-insensitively
    col_map = {}
    for col in df.columns:
        clean_col = str(col).strip()
        col_map[clean_col.lower()] = clean_col

    def get_col(possible_names: List[str]) -> Optional[str]:
        for name in possible_names:
            if name.lower() in col_map:
                return col_map[name.lower()]
        return None

    c_no = get_col(["no.", "no", "seq", "sequence"])
    c_obs_id = get_col(["observation id", "obs id", "observation_id", "id"])
    c_date = get_col(["date", "occurrence date", "occurrence_date"])
    c_type = get_col(["type", "observation type", "category type"])
    c_desc = get_col(["description", "obs description", "details"])
    c_loc = get_col(["location", "unit location"])
    c_exact_loc = get_col(["exact location", "exact_location"])
    c_reported_on = get_col(["reported on", "reported_on", "report date"])
    c_risk = get_col(["risk level", "risk", "severity"])
    c_obs_status = get_col(["observation status", "obs status", "status"])
    c_pair = get_col(["pair present", "pair_present", "pair"])
    c_closure_date = get_col(["observation closure date", "closure date", "closed on"])
    c_closed_by = get_col(["closed by", "closed_by"])
    c_reason_no_actions = get_col(["reason for no actions", "reason no action", "no action reason"])

    # Action 1
    c_act1 = get_col(["action1", "action 1"])
    c_act_st1 = get_col(["action status1", "action status 1", "action_status1"])
    c_due1 = get_col(["due date1", "due date 1", "due_date1"])
    c_cls1 = get_col(["closure date1", "closure date 1", "closure_date1"])
    c_rem1 = get_col(["remarks1", "remarks 1", "remark1"])

    # Action 2
    c_act2 = get_col(["action2", "action 2"])
    c_act_st2 = get_col(["action status2", "action status 2", "action_status2"])
    c_due2 = get_col(["due date2", "due date 2", "due_date2"])
    c_cls2 = get_col(["closure date2", "closure date 2", "closure_date2"])
    c_rem2 = get_col(["remarks2", "remarks 2", "remark2"])

    # Action 3
    c_act3 = get_col(["action3", "action 3"])
    c_act_st3 = get_col(["action status3", "action status 3", "action_status3"])
    c_due3 = get_col(["due date3", "due date 3", "due_date3"])
    c_cls3 = get_col(["closure date3", "closure date 3", "closure_date3"])
    c_rem3 = get_col(["remarks3", "remarks 3", "remark3"])

    parsed_rows = []

    for idx, row in df.iterrows():
        # Seq No
        raw_no = row[c_no] if c_no and not pd.isna(row[c_no]) else (idx + 1)
        try:
            seq_no = int(raw_no)
        except Exception:
            seq_no = idx + 1

        # Observation Id
        raw_obs_id = clean_null_str(row[c_obs_id]) if c_obs_id else None
        if not raw_obs_id:
            raw_obs_id = f"OBS-AUTO-{idx+1}"
        
        has_suffix_s = raw_obs_id.endswith("-S") or raw_obs_id.endswith("_S")

        # Occurrence Date
        occ_date = parse_flexible_date(row[c_date]) if c_date else None
        if not occ_date:
            occ_date = date(2026, 8, 1) # Default fallback date
        
        iso_year, iso_week, week_label = get_iso_week_info(occ_date)

        # Type Hierarchy
        raw_type = clean_null_str(row[c_type]) if c_type else None
        category, sub_cat, detail = parse_type_hierarchy(raw_type)

        # Description
        description = clean_null_str(row[c_desc]) if c_desc else None

        # Location Hierarchy
        raw_loc = clean_null_str(row[c_loc]) if c_loc else None
        unit, sub_loc = parse_location_hierarchy(raw_loc)
        exact_loc = clean_null_str(row[c_exact_loc]) if c_exact_loc else None

        # Reported On Date & Lag
        rep_date = parse_flexible_date(row[c_reported_on]) if c_reported_on else occ_date
        rep_year, rep_week, rep_label = get_iso_week_info(rep_date)
        
        lag_days = (rep_date - occ_date).days if rep_date and occ_date else 0
        if lag_days < 0:
            lag_days = 0

        # Risk Level (~143 rows are blank/null -> Unclassified)
        raw_risk = clean_null_str(row[c_risk]) if c_risk else None
        if not raw_risk:
            risk_level = "Unclassified"
        else:
            r_norm = raw_risk.title()
            if "Fatal" in r_norm:
                risk_level = "Fatal"
            elif "Serious" in r_norm or "Severe" in r_norm or "High" in r_norm:
                risk_level = "Serious"
            elif "Minor" in r_norm or "Low" in r_norm or "Medium" in r_norm:
                risk_level = "Minor"
            else:
                risk_level = r_norm

        # Observation Status
        raw_status = clean_null_str(row[c_obs_status]) if c_obs_status else "Open"
        obs_status = raw_status.title() if raw_status else "Open"

        # Pair Present
        pair_present = parse_pair_present(row[c_pair]) if c_pair else False

        # Closure metadata
        closure_date = parse_flexible_date(row[c_closure_date]) if c_closure_date else None
        closed_by = clean_null_str(row[c_closed_by]) if c_closed_by else None
        reason_no_actions = clean_null_str(row[c_reason_no_actions]) if c_reason_no_actions else None

        # Unpivoting Actions
        actions_list = []
        
        # Action 1
        act1_text = clean_null_str(row[c_act1]) if c_act1 else None
        if act1_text:
            actions_list.append({
                "action_number": 1,
                "action_text": act1_text,
                "status": clean_null_str(row[c_act_st1]) or "Open",
                "due_date": parse_flexible_date(row[c_due1]) if c_due1 else None,
                "closure_date": parse_flexible_date(row[c_cls1]) if c_cls1 else None,
                "remarks": clean_null_str(row[c_rem1]) if c_rem1 else None,
            })

        # Action 2
        act2_text = clean_null_str(row[c_act2]) if c_act2 else None
        if act2_text:
            actions_list.append({
                "action_number": 2,
                "action_text": act2_text,
                "status": clean_null_str(row[c_act_st2]) or "Open",
                "due_date": parse_flexible_date(row[c_due2]) if c_due2 else None,
                "closure_date": parse_flexible_date(row[c_cls2]) if c_cls2 else None,
                "remarks": clean_null_str(row[c_rem2]) if c_rem2 else None,
            })

        # Action 3
        act3_text = clean_null_str(row[c_act3]) if c_act3 else None
        if act3_text:
            actions_list.append({
                "action_number": 3,
                "action_text": act3_text,
                "status": clean_null_str(row[c_act_st3]) or "Open",
                "due_date": parse_flexible_date(row[c_due3]) if c_due3 else None,
                "closure_date": parse_flexible_date(row[c_cls3]) if c_cls3 else None,
                "remarks": clean_null_str(row[c_rem3]) if c_rem3 else None,
            })

        parsed_rows.append({
            "dataset_id": dataset_id,
            "seq_no": seq_no,
            "observation_id": raw_obs_id,
            "has_suffix_s": has_suffix_s,
            "occurrence_date": occ_date.isoformat() if occ_date else None,
            "occurrence_iso_year": iso_year,
            "occurrence_iso_week": iso_week,
            "occurrence_week_label": week_label,
            "raw_type": raw_type,
            "category": category,
            "sub_category": sub_cat,
            "detail": detail,
            "description": description,
            "raw_location": raw_loc,
            "unit": unit,
            "sub_location": sub_loc,
            "exact_location": exact_loc,
            "reported_on": rep_date.isoformat() if rep_date else None,
            "reported_iso_year": rep_year,
            "reported_iso_week": rep_week,
            "reported_week_label": rep_label,
            "reporting_lag_days": lag_days,
            "risk_level": risk_level,
            "observation_status": obs_status,
            "pair_present": pair_present,
            "closure_date": closure_date.isoformat() if closure_date else None,
            "closed_by": closed_by,
            "reason_for_no_actions": reason_no_actions,
            "actions": actions_list
        })

    return parsed_rows

def load_and_parse_file(file_path: str, dataset_id: str) -> List[Dict[str, Any]]:
    """Loads an Excel (.xlsx/.xls) or CSV file and converts it into parsed normalized observations."""
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
    else:
        # Excel: check sheets
        xls = pd.ExcelFile(file_path, engine="openpyxl")
        sheet_to_use = "observations" if "observations" in [s.lower() for s in xls.sheet_names] else xls.sheet_names[0]
        # Match exact sheet name
        for s in xls.sheet_names:
            if s.lower() == sheet_to_use.lower():
                sheet_to_use = s
                break
        df = pd.read_excel(file_path, sheet_name=sheet_to_use, engine="openpyxl")

    return parse_observation_rows_from_df(df, dataset_id)
