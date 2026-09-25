import os
import random
from datetime import date, timedelta
import pandas as pd

def generate_sample_observations_excel(output_path: str = "data/Observations.xlsx", total_rows: int = 1974):
    """
    Generates a high-fidelity Observations.xlsx file matching the exact 29 columns,
    1,974 rows, date distributions (August 2026, reported into Aug-Sep 2026),
    hierarchy splits, risk levels, and unpivoted action distributions.
    """
    random.seed(42)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    top_units = ["Unit 05", "Unit 41", "Unit 03", "Unit 02", "Unit 13", "Unit 51", "Unit 08", "R&D", "Unit 19", "Unit 22"]
    unit_weights = [0.25, 0.20, 0.18, 0.14, 0.08, 0.05, 0.04, 0.03, 0.02, 0.01]
    
    sub_locations_by_unit = {
        "Unit 05": ["FG Warehouse central", "Assembly Line A", "Chemical Storage", "Packaging Bay 2", "Loading Dock 1"],
        "Unit 41": ["Reactor Floor 3", "Compressor Room", "Control Room B", "Pipe Rack North", "Boiler Section"],
        "Unit 03": ["Maintenance Workshop", "Electrical Substation", "Conveyor Belt 4", "Machining Cell", "Raw Material Yard"],
        "Unit 02": ["Packing Hall 1", "Staging Area East", "QC Laboratory", "Pallet Storage", "Scrap Yard"],
        "Unit 13": ["Solvent Tank Farm", "Dispensing Booth", "Utility Building", "HVAC Plant", "Effluent Treatment Plant"],
        "Unit 51": ["FG Warehouse central", "Container Yard", "Dispatch Office", "Battery Charging Station"],
        "Unit 08": ["Cold Storage", "Filter Press Area", "Mixing Tank 2", "Pump House"],
        "R&D": ["Pilot Plant 1", "Synthesis Lab 4", "Analytical Lab", "Fume Hood Station 3"],
        "Unit 19": ["Baler Machine Area", "Compressor Room 2", "Secondary Gate"],
        "Unit 22": ["Fabrication Yard", "Welding Bay 3", "Crane Operation Bay"]
    }

    exact_locations = [
        "Container loading area", "Near Conveyor Motor #3", "Walkway near Column D4",
        "Overhead cable tray", "Emergency Exit Staircase 2", "Chemical Dosing Skid",
        "Panel Board #4", "Forklift charging bay", "Mezzanine Floor Edge",
        "Near Eye Wash Station", "--", "--", "--", "--" # '--' represents null sentinel
    ]

    categories_hierarchy = [
        ("Unsafe Condition", "Tools & Equipment", "Use of defective tools and equipment"),
        ("Unsafe Condition", "Housekeeping", "Spillage of oil or chemicals on walkway"),
        ("Unsafe Condition", "Housekeeping", "Blocked emergency exit or fire extinguisher"),
        ("Unsafe Condition", "Electrical", "Damaged insulation on flexible cable"),
        ("Unsafe Condition", "Electrical", "Uncovered junction box with exposed terminals"),
        ("Unsafe Condition", "Working at Height", "Missing toe board or loose scaffold clamp"),
        ("Unsafe Condition", "Machinery Safeguarding", "Missing interlock guard on rotating shaft"),
        ("Unsafe Act", "Tools & Equipment", "Using makeshift or uncertified lifting tackle"),
        ("Unsafe Act", "PPE Compliance", "Working without mandatory safety glasses / face shield"),
        ("Unsafe Act", "PPE Compliance", "Improper use or non-use of safety harness at height"),
        ("Unsafe Act", "Material Handling", "Overloading forklift beyond rated SWL"),
        ("Unsafe Act", "Standard Operating Procedure", "Bypassing safety interlock during line changeover"),
        ("Unsafe Act", "Line of Fire", "Standing under suspended load during crane movement"),
        ("Best Practices", "Housekeeping", "5S excellence in tool shadow board and oil containment"),
        ("Best Practices", "Safety Culture", "Proactive hazard identification and immediate peer correction"),
        ("Best Practices", "Innovation", "Implementation of magnetic safety latch on high-risk gate"),
        ("QA - Observations", "Process Integrity", "Calibration sticker expired on pressure gauge"),
        ("QA - Observations", "Contamination Control", "Inadequate segregation of rejected packaging material"),
        ("QA - Observations", "Documentation", "Incomplete batch record entry during transfer"),
        ("LSR Violation", "Lockout Tagout (LOTO)", "Work commenced on energized line without zero energy verification"),
        ("LSR Violation", "Confined Space Entry", "Entering vessel without atmospheric test certificate"),
        ("LSR Violation", "Hot Work", "Welding performed within 10m of solvent line without permit")
    ]
    
    cat_weights = [
        0.10, 0.08, 0.07, 0.06, 0.05, 0.05, 0.04, # Unsafe Condition (~45%)
        0.08, 0.07, 0.05, 0.05, 0.05, 0.04,       # Unsafe Act (~34%)
        0.04, 0.03, 0.02,                         # Best Practices (~9%)
        0.03, 0.02, 0.02,                         # QA - Observations (~7%)
        0.02, 0.015, 0.015                        # LSR Violation (~5%)
    ]

    risk_levels = ["Minor", "Serious", "Fatal", None]
    risk_weights = [0.65, 0.25, 0.027, 0.073] # ~143 rows null/blank

    action_status_options = ["Open", "Overdue", "Completed", "Closed", "In Progress"]
    obs_status_options = ["Open", "In Progress", "Overdue"]
    
    names_pool = [
        "David Miller", "Sarah Jenkins", "Rajesh Kumar", "Amit Patel", "Elena Rostova",
        "Michael Chang", "Carlos Gomez", "Priya Sharma", "John Sterling", "Vikram Sen", "--"
    ]

    descriptions_base = [
        "Operator observed using damaged grinder with missing wheel guard in {} near {}.",
        "Significant hydraulic oil leak observed on floor creating slipping hazard at {} - {}.",
        "Fire extinguisher inspection tag overdue by 3 months at {} ({}) obstructing clear access.",
        "Temporary extension board found without ELCB protection near {} work station.",
        "Scaffolding erected on uneven ground without sole plates at {}.",
        "Forklift driver noticed operating at excessive speed while carrying pallet near {}.",
        "Technician working on 415V distribution board without insulated gloves or arc flash suit at {}.",
        "Exemplary implementation of visual tool shadow board and waste segregation at {}.",
        "Zero energy state was not verified prior to clearing conveyor jam at {}.",
        "Secondary containment tray filled with rainwater and chemical residue at {}.",
        "Welder observed working on structural support without safety harness anchored at {}."
    ]

    data = []
    
    start_date = date(2026, 8, 1)
    end_date = date(2026, 8, 31)
    total_days = (end_date - start_date).days + 1

    for i in range(1, total_rows + 1):
        # 1. Sequence number
        seq_no = i
        
        # 2. Observation Id & -S flag
        obs_num = 601000 + i
        has_s = random.random() < 0.15
        obs_id = f"OBS0826{obs_num}-S" if has_s else f"OBS0826{obs_num}"

        # 3. Occurrence Date (01-Aug-2026 to 31-Aug-2026)
        occ_day_offset = random.randint(0, total_days - 1)
        occ_date = start_date + timedelta(days=occ_day_offset)
        date_str = occ_date.strftime("%d-%b-%Y") # e.g. 14-Aug-2026

        # 4. Type (Category, Sub-Category, Detail)
        cat_tuple = random.choices(categories_hierarchy, weights=cat_weights)[0]
        type_str = f"{cat_tuple[0]}, {cat_tuple[1]}, {cat_tuple[2]}"

        # 6. Location (Unit, Sub-Location) & 7. Exact Location
        unit = random.choices(top_units, weights=unit_weights)[0]
        sub_loc = random.choice(sub_locations_by_unit[unit])
        location_str = f"{unit}, {sub_loc}"
        exact_loc_str = random.choice(exact_locations)

        # 5. Description (1947/1974 mostly unique)
        base_desc = random.choice(descriptions_base)
        desc_text = base_desc.format(unit, sub_loc) + (f" Tag Ref #{i}" if i > 27 else "")

        # 8. Reported On (August to September 2026)
        # Reporting lag between 0 and 12 days
        lag_days = random.choices([0, 1, 2, 3, 4, 5, 7, 10, 14], weights=[0.45, 0.25, 0.12, 0.08, 0.04, 0.03, 0.015, 0.01, 0.005])[0]
        rep_date = occ_date + timedelta(days=lag_days)
        reported_on_str = rep_date.strftime("%d-%b-%Y")

        # 9. Risk Level (Minor / Serious / Fatal / blank)
        # LSR Violations and Working at height have higher Serious/Fatal weight
        if cat_tuple[0] == "LSR Violation":
            risk = random.choices(["Serious", "Fatal", "Minor"], weights=[0.60, 0.35, 0.05])[0]
        elif cat_tuple[0] == "Best Practices":
            risk = "Minor"
        else:
            risk = random.choices(risk_levels, weights=risk_weights)[0]

        # 10. Observation Status
        obs_status = random.choices(obs_status_options, weights=[0.55, 0.30, 0.15])[0]

        # 11. Pair Present
        pair_present = random.choice(["Yes", "No"])

        # 12. Observation Closure Date (Always empty in sample)
        obs_closure_date = None

        # 13. Closed By
        closed_by = random.choice(names_pool)

        # Actions breakdown
        # ~80% of rows have at least Action1 assigned
        has_action1 = random.random() < 0.82
        
        # Action 1
        if has_action1:
            act1 = f"Rectify hazard: {cat_tuple[2]} in {sub_loc} immediately and train team."
            act_status1 = random.choices(action_status_options, weights=[0.35, 0.20, 0.25, 0.10, 0.10])[0]
            due_date1 = (occ_date + timedelta(days=random.randint(3, 14))).strftime("%d-%b-%Y")
            closure_date1 = (occ_date + timedelta(days=random.randint(1, 10))).strftime("%d-%b-%Y") if act_status1 in ["Completed", "Closed"] else None
            remarks1 = f"Action assigned to area supervisor {closed_by}."
            reason_no_actions = None
        else:
            act1 = None
            act_status1 = None
            due_date1 = None
            closure_date1 = None
            remarks1 = None
            reason_no_actions = random.choice([
                "Hazard rectified immediately on the spot by observer.",
                "Best practice acknowledged and logged for quarterly safety award.",
                "Duplicate logging of existing maintenance work order.",
                "Non-critical observation requiring standard scheduled PM cycle."
            ])

        # Action 2 (Rare - ~10 / 1974 rows)
        # We populate Action2 for specific rows
        if i in [14, 82, 199, 412, 608, 920, 1145, 1430, 1722, 1910]:
            act2 = "Perform root cause analysis and update SOP with engineering controls."
            act_status2 = random.choice(["Open", "In Progress", "Completed"])
            due_date2 = (occ_date + timedelta(days=21)).strftime("%d-%b-%Y")
            closure_date2 = (occ_date + timedelta(days=18)).strftime("%d-%b-%Y") if act_status2 == "Completed" else None
            remarks2 = "Safety committee review scheduled."
        else:
            act2, act_status2, due_date2, closure_date2, remarks2 = None, None, None, None, None

        # Action 3 (Rare - 1 / 1974 rows)
        if i == 608:
            act3 = "Procure permanent interlock safety guard and install before next production shift."
            act_status3 = "Open"
            due_date3 = (occ_date + timedelta(days=30)).strftime("%d-%b-%Y")
            closure_date3 = None
            remarks3 = "Capex approved by plant manager."
        else:
            act3, act_status3, due_date3, closure_date3, remarks3 = None, None, None, None, None

        row = {
            "No.": seq_no,
            "Observation Id": obs_id,
            "Date": date_str,
            "Type": type_str,
            "Description": desc_text,
            "Location": location_str,
            "Exact Location": exact_loc_str,
            "Reported On": reported_on_str,
            "Risk level": risk,
            "Observation Status": obs_status,
            "Pair Present": pair_present,
            "Observation Closure Date": obs_closure_date,
            "Closed by": closed_by,
            "Reason for no Actions": reason_no_actions,
            "Action1": act1,
            "Action Status1": act_status1,
            "Due Date1": due_date1,
            "Closure Date1": closure_date1,
            "Remarks1": remarks1,
            "Action2": act2,
            "Action Status2": act_status2,
            "Due Date2": due_date2,
            "Closure Date2": closure_date2,
            "Remarks2": remarks2,
            "Action3": act3,
            "Action Status3": act_status3,
            "Due Date3": due_date3,
            "Closure Date3": closure_date3,
            "Remarks3": remarks3,
        }
        data.append(row)

    df = pd.DataFrame(data)
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="observations", index=False)

    print(f"Generated sample {output_path} with {len(df)} rows and {len(df.columns)} columns.")
    return output_path

if __name__ == "__main__":
    generate_sample_observations_excel()
