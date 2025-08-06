#!/usr/bin/env python3
# scripts/parse_pdf.py

import sys
import json
import re
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import io

def parse_deposit_transactions(text, filename_office=None):
    deposits = []
    debug_all_deposits = []
    lines = text.split('\n')

    print(f"Debug: Total lines to parse: {len(lines)}", file=sys.stderr)

    # Dynamic date matching for any 3-letter month
    date_regex = re.compile(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b', re.IGNORECASE)

    # Log lines containing dates (anywhere in the line)
    date_lines = []
    for i, line in enumerate(lines):
        if date_regex.search(line):
            date_lines.append(f"Line {i}: {line.strip()[:100]}")
    print(f"Debug: Found {len(date_lines)} date lines:", file=sys.stderr)
    for date_line in date_lines[:10]:
        print(f"  {date_line}", file=sys.stderr)
    if len(date_lines) > 10:
        print(f"  ... and {len(date_lines) - 10} more", file=sys.stderr)

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        date_match = date_regex.search(line)

        if date_match:
            date_prefix = date_match.group(0)  # e.g., 'Jun 20'
            full_transaction_lines = [line]
            j = i + 1

            while j < min(len(lines), i + 6):
                next_line = lines[j].strip()
                if date_regex.search(next_line) or not next_line:
                    break
                full_transaction_lines.append(next_line)
                j += 1

            full_transaction = ' '.join(full_transaction_lines).strip()
            full_upper = full_transaction.upper()

            # Log all lines with a date and at least one amount-like pattern
            if re.search(r'\d{1,3}(?:,\d{3})*\.\d{2}', full_transaction):
                debug_all_deposits.append({
                    'date': date_prefix,
                    'raw': full_transaction
                })

            skip_keywords = [
                'SHIFT4/PYMT', 'SHIFT4/FEES', 'CHERRY/PAYMENT', 'SYNCHRONY',
                'BEGINNING BALANCE', 'MOBILE TRANSFER', 'TRANSFER DEBIT',
                'TOTAL NUMBER OF CHECKS', 'ENDING BALANCE'
            ]

            if any(keyword in full_upper for keyword in skip_keywords):
                i = j
                continue

            if full_upper.strip().endswith('DEPOSIT') and not any(
                keyword in full_upper for keyword in ['METLIFE', 'FEP', 'CIGNA', 'DELTA', 'UHC', 'UNITED', 'DDPNH']):
                i = j
                continue

            insurance_keywords = [
                'HCCLAIMPMT', 'DENTAL', 'METLIFE', 'CIGNA', 'DELTA',
                'FEP', 'UHC', 'UNITED HEALTHCARE', 'UNITED HEALTH',
                'DDPNH', 'CLAIMS', 'EDIRPAY'
            ]

            if any(keyword in full_upper for keyword in insurance_keywords):
                deposit = parse_deposit_line(date_prefix, full_transaction, filename_office)
                if deposit:
                    deposits.append(deposit)

            i = j
        else:
            i += 1

    print(f"Debug: Final deposit count: {len(deposits)}", file=sys.stderr)
    print(f"Debug: Logging all deposit-like transactions (total {len(debug_all_deposits)})", file=sys.stderr)
    for entry in debug_all_deposits:
        print(f"  [Possible Deposit] {entry['date']} — {entry['raw'][:100]}", file=sys.stderr)

    return deposits

    deposits = []
    debug_all_deposits = []  # new list to log all found deposits
    lines = text.split('\n')

    print(f"Debug: Total lines to parse: {len(lines)}", file=sys.stderr)

    date_lines = []
    for i, line in enumerate(lines):
        if re.match(r'^\s*(Jun \d{2})', line.strip(), flags=re.IGNORECASE):
            date_lines.append(f"Line {i}: {line.strip()[:100]}")

    print(f"Debug: Found {len(date_lines)} date lines:", file=sys.stderr)
    for date_line in date_lines[:10]:
        print(f"  {date_line}", file=sys.stderr)
    if len(date_lines) > 10:
        print(f"  ... and {len(date_lines) - 10} more", file=sys.stderr)

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        date_match = re.match(r'^\s*(Jun \d{2})', line, flags=re.IGNORECASE)

        if date_match:
            date = date_match.group(1)
            full_transaction_lines = [line.strip()]
            j = i + 1

            while j < min(len(lines), i + 6):
                next_line = lines[j].strip()
                if re.match(r'^\s*(Jun \d{2})', next_line, flags=re.IGNORECASE) or not next_line:
                    break
                full_transaction_lines.append(next_line)
                j += 1

            full_transaction = ' '.join(full_transaction_lines).strip()
            full_upper = full_transaction.upper()

            # DEBUG: capture everything that has a monetary value
            if re.search(r'\d{1,3}(?:,\d{3})*\.\d{2}', full_transaction):
                debug_all_deposits.append({
                    'date': date,
                    'raw': full_transaction
                })

            skip_keywords = [
                'SHIFT4/PYMT', 'SHIFT4/FEES', 'CHERRY/PAYMENT', 'SYNCHRONY',
                'BEGINNING BALANCE', 'MOBILE TRANSFER', 'TRANSFER DEBIT',
                'TOTAL NUMBER OF CHECKS', 'ENDING BALANCE'
            ]

            if any(keyword in full_upper for keyword in skip_keywords):
                i = j
                continue

            if full_upper.strip().endswith('DEPOSIT') and not any(keyword in full_upper for keyword in ['METLIFE', 'FEP', 'CIGNA', 'DELTA', 'UHC', 'UNITED', 'DDPNH']):
                i = j
                continue

            insurance_keywords = [
                'HCCLAIMPMT', 'DENTAL', 'METLIFE', 'CIGNA', 'DELTA',
                'FEP', 'UHC', 'UNITED HEALTHCARE', 'UNITED HEALTH',
                'DDPNH', 'CLAIMS', 'EDIRPAY'
            ]

            if any(keyword in full_upper for keyword in insurance_keywords):
                deposit = parse_deposit_line(date, full_transaction, filename_office)
                if deposit:
                    deposits.append(deposit)

            i = j
        else:
            i += 1

    print(f"Debug: Final deposit count: {len(deposits)}", file=sys.stderr)
    print(f"Debug: Logging all deposit-like transactions (total {len(debug_all_deposits)})", file=sys.stderr)
    for entry in debug_all_deposits:
        print(f"  [Possible Deposit] {entry['date']} — {entry['raw'][:100]}", file=sys.stderr)

    return deposits


def parse_deposit_line(date, line, filename_office=None):
    amount_pattern = r'(\d{1,3}(?:,\d{3})*\.\d{2})'
    amounts = re.findall(amount_pattern, line)

    if not amounts:
        print(f"Debug: No amounts found in line: {line}", file=sys.stderr)
        return None

    line_upper = line.upper()

    skip_keywords = [
        'SHIFT4/PYMT', 'SHIFT4/FEES', 'CHERRY/PAYMENT', 'SYNCHRONY',
        'BEGINNING BALANCE', 'MOBILE TRANSFER', 'TRANSFER DEBIT',
        'TOTAL NUMBER OF CHECKS', 'ENDING BALANCE'
    ]

    if any(keyword in line_upper for keyword in skip_keywords):
        return None

    if line_upper.strip().endswith('DEPOSIT') and not any(keyword in line_upper for keyword in ['METLIFE', 'FEP', 'CIGNA', 'DELTA', 'UHC', 'UNITED', 'DDPNH']):
        return None

    transaction_office = filename_office

    if 'METLIFE' in line_upper and filename_office == 'Kearny':
        transaction_office = 'Livingston/Kearny'
    elif any(uhc_keyword in line_upper for uhc_keyword in ['UHC', 'UNITED HEALTHCARE', 'UNITED HEALTH']) and filename_office == 'Livingston':
        transaction_office = 'Livingston/Kearny'

    try:
        return {
            'date': date,
            'description': line.strip(),
            'amount': float(amounts[0].replace(',', '')),
            'office': transaction_office
        }
    except Exception as e:
        print(f"Debug: Failed to convert amount in line: {line} | Error: {e}", file=sys.stderr)
        return None


def extract_office_from_filename(filename):
    if not filename:
        return None

    name_without_ext = filename.replace('.pdf', '').replace('.PDF', '').upper()
    office_mappings = [
        ('JERSEY CITY', 'Jersey City'),
        ('HACKENSACK', 'Hackensack'),
        ('LIVINGSTON', 'Livingston'),
        ('KEARNY', 'Kearny'),
        ('UNION', 'Union')
    ]

    for office_key, office_name in office_mappings:
        if office_key in name_without_ext:
            return office_name

    return None


def extract_office_from_text(text):
    print(f"Debug: Full text length: {len(text)}", file=sys.stderr)

    owner_pattern = r'Account Owner\(s\):\s*(.+)'
    match = re.search(owner_pattern, text, re.IGNORECASE)

    if match:
        owner_text = match.group(1).strip()
        print(f"Debug: Found Account Owner text: '{owner_text}'", file=sys.stderr)

        office_mappings = {
            'UNION': 'Union',
            'LIVINGSTON': 'Livingston',
            'KEARNY': 'Kearny',
            'HACKENSACK': 'Hackensack',
            'JERSEY CITY': 'Jersey City'
        }

        owner_upper = owner_text.upper()
        print(f"Debug: Owner text uppercase: '{owner_upper}'", file=sys.stderr)

        for key, office in office_mappings.items():
            if key in owner_upper:
                print(f"Debug: Found office match: {key} -> {office}", file=sys.stderr)
                return office

    print("Debug: No office detected", file=sys.stderr)
    return None


def extract_text_with_ocr_fallback(pdf_path):
    import cv2
    import numpy as np

    doc = fitz.open(pdf_path)
    full_text = ""

    for page_num, page in enumerate(doc):
        print(f"Processing page {page_num + 1}...", file=sys.stderr)
        text = page.get_text()
        if text.strip():
            full_text += text + "\n"
        else:
            print(f"Fallback to OCR for page {page_num + 1}", file=sys.stderr)
            
            # Render page as image
            pix = page.get_pixmap(dpi=300)
            image_bytes = pix.tobytes("png")
            img = Image.open(io.BytesIO(image_bytes))

            # Preprocessing: convert to OpenCV grayscale image
            cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
            _, thresh = cv2.threshold(cv_img, 150, 255, cv2.THRESH_BINARY)
            denoised = cv2.medianBlur(thresh, 3)

            # OCR with custom config
            custom_config = r'--oem 3 --psm 4'
            ocr_text = pytesseract.image_to_string(denoised, config=custom_config)

            print(f"Debug: OCR text (first 200 chars): {ocr_text[:200]}", file=sys.stderr)
            full_text += ocr_text + "\n"

    return full_text



def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_pdf.py <pdf_file_path> [original_filename]", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    original_filename = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        print(f"Debug: Starting PDF extraction for {original_filename}", file=sys.stderr)

        full_text = extract_text_with_ocr_fallback(pdf_path)
        print(f"Debug: Total extracted text length: {len(full_text)} characters", file=sys.stderr)

        office_name = extract_office_from_filename(original_filename)
        if not office_name:
            office_name = extract_office_from_text(full_text)

        deposits = parse_deposit_transactions(full_text, office_name)
        total_amount = sum(deposit['amount'] for deposit in deposits)

        result = {
            'deposits': deposits,
            'office': office_name,
            'originalFilename': original_filename,
            'summary': {
                'totalDeposits': len(deposits),
                'totalAmount': round(total_amount, 2),
            }
        }

        print(json.dumps(result, indent=2))

    except Exception as e:
        error_result = {
            'error': f"Failed to process PDF: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == "__main__":
    main()
