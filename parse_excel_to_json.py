import pandas as pd
import json
import re

file_path = "Original Price List May 2026.xlsx"
sheet_name = "Original Price List May 2026"

# Load the file, skipping the first 7 rows to use the header in row 7 (0-indexed as row 7)
df = pd.read_excel(file_path, sheet_name=sheet_name, skiprows=7)

categories = []
current_category = "General"

parsed_tests = []
seen_codes = set()

def clean_and_generate_code(name, category):
    # Remove any %, &, /, +, -, etc.
    name_clean = name.strip()
    
    # 1. Look for explicit abbreviation in parentheses, e.g. "Haemogram (CBC) 43 para" -> "CBC"
    # or "Electrochemiluminescence Assay, ECL" -> "ECL"
    abbrev_match = re.search(r'\(([^)]+)\)', name_clean)
    if not abbrev_match:
        # Also check for comma abbreviation like ", ECL"
        abbrev_match = re.search(r',\s*([A-Z]{2,6})\b', name_clean)
        
    abbrev = ""
    if abbrev_match:
        cand = abbrev_match.group(1).strip()
        # Ensure it looks like an abbreviation
        cand_clean = re.sub(r'[^A-Za-z0-9]', '', cand).upper()
        if 2 <= len(cand_clean) <= 8:
            abbrev = cand_clean

    # 2. General slugification
    # Replace special characters with spaces
    slug = re.sub(r'[^A-Za-z0-9\s]', ' ', name_clean)
    # Replace multiple spaces with single space
    slug = ' '.join(slug.split())
    # Replace spaces with underscores and uppercase
    slug_code = slug.replace(' ', '_').upper()
    
    # 3. Choose base code
    if abbrev:
        # If we have an abbreviation, let's use it as prefix or main code
        # If slug_code starts with abbreviation or abbreviation is part of it, use a cleaned abbreviation
        if len(slug_code) > 20:
            # Shorten if it contains abbreviation
            words = name_clean.split()
            # If the abbreviation is prominent, use it
            base_code = abbrev
        else:
            base_code = slug_code
    else:
        base_code = slug_code

    # Fallback if empty
    if not base_code:
        base_code = "TEST"
        
    # Shorten if too long (max 30 characters)
    if len(base_code) > 30:
        base_code = base_code[:30].strip('_')

    # 4. Guarantee Uniqueness
    final_code = base_code
    counter = 1
    while final_code in seen_codes:
        counter += 1
        suffix = f"_{counter}"
        # Ensure it fits in 30 characters even with suffix
        if len(base_code) + len(suffix) > 30:
            final_code = base_code[:30 - len(suffix)].strip('_') + suffix
        else:
            final_code = base_code + suffix
            
    seen_codes.add(final_code)
    return final_code

# Parse rows
for idx, row in df.iterrows():
    no_val = str(row.iloc[0]).strip()
    test_name = str(row.iloc[1]).strip()
    price = row.iloc[2]
    collection = row.iloc[3]
    tat = row.iloc[4]
    
    # Detect category headers
    if pd.isna(row.iloc[0]) and pd.isna(price) and pd.isna(collection) and pd.isna(tat):
        if pd.notna(row.iloc[1]) and test_name:
            current_category = test_name
    elif pd.notna(price) or pd.notna(row.iloc[0]):
        # Skip the header row if re-parsed
        if no_val == "No." or test_name == "Test Name":
            continue
            
        # Clean price (remove decimal if it's .0)
        try:
            base_price = float(price) if pd.notna(price) else 0.0
        except ValueError:
            base_price = 0.0
            
        # Clean collection tube and TAT
        col_str = str(collection).strip() if pd.notna(collection) else ""
        tat_str = str(tat).strip() if pd.notna(tat) else ""
        
        # Build description
        desc_parts = []
        if col_str:
            desc_parts.append(f"Collection Tube: {col_str}")
        if tat_str:
            desc_parts.append(f"Turnaround Time (TAT): {tat_str}")
        description = ". ".join(desc_parts) if desc_parts else "Diagnostic catalog test."
        
        # Generate code
        test_code = clean_and_generate_code(test_name, current_category)
        
        parsed_tests.append({
            "test_name": test_name,
            "test_code": test_code,
            "description": description,
            "base_price_mmk": base_price,
            "category": current_category,
            "is_package": 0,
            "is_active": 1
        })

# Write to JSON file
with open("parsed_tests.json", "w", encoding="utf-8") as f:
    json.dump(parsed_tests, f, indent=2, ensure_ascii=False)

print(f"Successfully generated parsed_tests.json with {len(parsed_tests)} tests.")
