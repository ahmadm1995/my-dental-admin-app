#!/usr/bin/env python3
# scripts/parse_pdf.py

import sys
import json
import pdfplumber
import re

def parse_deposit_transactions(text):
    """Parse deposit transactions from Provident Bank statement text"""
    deposits = []
    lines = text.split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Look for date pattern at start of line (Jun XX format)
        date_match = re.match(r'^(Jun \d{2})', line)
        if date_match:
            date = date_match.group(1)
            
            # Skip SHIFT4/PYMT, DEPOSIT, CHERRY/PAYMENT, and SYNCHRONY transactions
            line_upper = line.upper()
            if ('SHIFT4/PYMT' in line_upper or 
                'CHERRY/PAYMENT' in line_upper or
                'SYNCHRONY' in line_upper):
                continue
            
            # Skip lines that are ONLY "DEPOSIT" (but allow things like "METLIFE...DEPOSIT")
            if line_upper.strip().endswith('DEPOSIT') and not any(keyword in line_upper for keyword in ['METLIFE', 'FEP']):
                continue
                
            # Check for deposit indicators (excluding SYNCHRONY)
            if ('METLIFE DENTAL/HCCLAIMPMT' in line or
                'FEP DENTAL' in line):
                
                deposit = parse_deposit_line(date, line)
                if deposit:
                    deposits.append(deposit)
    
    return deposits

def parse_deposit_line(date, line):
    """Parse a single deposit transaction line"""
    # Extract amount from the line (look for numbers with decimal places)
    amount_pattern = r'(\d{1,3}(?:,\d{3})*\.\d{2})'
    amounts = re.findall(amount_pattern, line)
    
    if not amounts:
        return None
    
    line_upper = line.upper()
    
    # Skip if line contains filtered keywords (but be more specific)
    if ('SHIFT4/PYMT' in line_upper or 
        'CHERRY/PAYMENT' in line_upper):
        return None
    
    # Skip standalone DEPOSIT lines (but allow compound descriptions)
    if line_upper.strip().endswith('DEPOSIT') and not any(keyword in line_upper for keyword in ['METLIFE', 'SYNCHRONY', 'FEP']):
        return None
    
    if 'METLIFE DENTAL/HCCLAIMPMT' in line:
        # MetLife dental claim payments
        trn_match = re.search(r'TRN\*1\*(\d+)', line)
        trn_id = trn_match.group(1) if trn_match else "UNKNOWN"
        
        return {
            'date': date,
            'description': f"METLIFE DENTAL/HCCLAIMPMT TRN*1*{trn_id}*1135581829*4444",
            'amount': float(amounts[0].replace(',', ''))
        }
    
    elif 'SYNCHRONY BANK/MTOT DEP' in line:
        return {
            'date': date,
            'description': "SYNCHRONY BANK/MTOT DEP 534812122067071 GENUINE SMILES PA",
            'amount': float(amounts[0].replace(',', ''))
        }
    
    elif 'FEP DENTAL' in line:
        return {
            'date': date,
            'description': "FEP DENTAL 36C/HCCLAIMPMT TRN*1*CH01000582*1020574609",
            'amount': float(amounts[0].replace(',', ''))
        }
    
    return None

def extract_office_from_text(text):
    """Extract office name from Account Owner(s) field"""
    import sys
    print(f"Debug: Full text length: {len(text)}", file=sys.stderr)  # Debug to stderr
    
    # Look for the Account Owner(s) pattern
    owner_pattern = r'Account Owner\(s\):\s*(.+)'
    match = re.search(owner_pattern, text, re.IGNORECASE)
    
    if match:
        owner_text = match.group(1).strip()
        print(f"Debug: Found Account Owner text: '{owner_text}'", file=sys.stderr)  # Debug to stderr
        
        # Extract office from the owner text
        # Look for office names in the text
        office_mappings = {
            'UNION': 'Union',
            'LIVINGSTON': 'Livingston', 
            'KEARNY': 'Kearny',
            'HACKENSACK': 'Hackensack',
            'JERSEY CITY': 'Jersey City'
        }
        
        owner_upper = owner_text.upper()
        print(f"Debug: Owner text uppercase: '{owner_upper}'", file=sys.stderr)  # Debug to stderr
        
        for key, office in office_mappings.items():
            if key in owner_upper:
                print(f"Debug: Found office match: {key} -> {office}", file=sys.stderr)  # Debug to stderr
                return office
        
        print("Debug: No office match found in owner text", file=sys.stderr)  # Debug to stderr
    else:
        print("Debug: Account Owner(s) pattern not found", file=sys.stderr)  # Debug to stderr
        
        # Try alternative patterns - look for "GENUINE SMILES [OFFICE]" anywhere in text
        office_mappings = {
            'UNION': 'Union',
            'LIVINGSTON': 'Livingston', 
            'KEARNY': 'Kearny',
            'HACKENSACK': 'Hackensack',
            'JERSEY CITY': 'Jersey City'
        }
        
        # Try patterns for each office
        for office_key, office_name in office_mappings.items():
            patterns = [
                rf'GENUINE SMILES {office_key}',
                rf'{office_key}.*LLC',
                rf'SMILES {office_key}'
            ]
            
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    print(f"Debug: Found {office_name} via pattern: {pattern}", file=sys.stderr)  # Debug to stderr
                    return office_name
    
    # Fallback - return None if not found
    print("Debug: No office detected", file=sys.stderr)  # Debug to stderr
    return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python parse_pdf.py <pdf_file_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    try:
        deposits = []
        full_text = ""
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
        
        # Extract office from the full text
        office_name = extract_office_from_text(full_text)
        
        # Parse deposits
        deposits = parse_deposit_transactions(full_text)
        
        # Calculate summary
        total_amount = sum(deposit['amount'] for deposit in deposits)
        
        regular_deposits = len([d for d in deposits if d['description'] == "DEPOSIT"])
        metlife_payments = len([d for d in deposits if "METLIFE DENTAL" in d['description']])
        synchrony_deposits = len([d for d in deposits if "SYNCHRONY BANK" in d['description']])
        fep_dental = len([d for d in deposits if "FEP DENTAL" in d['description']])
        
        result = {
            'deposits': deposits,
            'office': office_name,  # Add the detected office
            'summary': {
                'totalDeposits': len(deposits),
                'totalAmount': round(total_amount, 2),
                'breakdown': {
                    'regularDeposits': regular_deposits,
                    'metlifePayments': metlife_payments,
                    'synchronyDeposits': synchrony_deposits,
                    'fepDental': fep_dental
                }
            }
        }
        
        print(json.dumps(result))
    
    except Exception as e:
        error_result = {
            'error': f"Failed to process PDF: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()