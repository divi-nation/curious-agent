#!/usr/bin/env python3
"""
Standardize journal filenames to: YYYY-MM-DD-HHMM-session-XXX.md

This script scans record/journal/, reads each file's content, extracts the
session number and timestamp, and renames the file to the new format.

If a file has no timestamp, it uses the file's modification time.
If two files resolve to the same session, the timestamp is incremented.
"""

import re
import os
from pathlib import Path
from datetime import datetime

JOURNAL_DIR = Path("record/journal")


def extract_session_from_content(content):
    """Extract session number from the content (e.g., '=== Session 29:')."""
    match = re.search(r'=== Session ([A-Za-z0-9]+):', content)
    if match:
        return match.group(1)
    return None


def extract_timestamp_from_content(content):
    """Extract timestamp from the content (e.g., '## 2026-07-19 07:50')."""
    match = re.search(r'^##\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})', content, re.MULTILINE)
    if match:
        date_str = match.group(1)
        hour = match.group(2)
        minute = match.group(3)
        return f"{date_str}-{hour}{minute}"
    return None


def parse_session_from_filename(filename):
    """
    Try to extract session number from the filename if content parsing fails.
    Handles patterns like:
      - 2026-07-19-session-001.md
      - 2026-07-19-afternoon-40.md
      - 2026-07-19-10-49.md
    """
    # Try to find "session-XXX" or "session-X" (with or without letters)
    match = re.search(r'session-([A-Za-z0-9]+)', filename, re.IGNORECASE)
    if match:
        return match.group(1)
    
    # Try to find a number at the end (e.g., "afternoon-40")
    match = re.search(r'-(\d+)\.md$', filename)
    if match:
        return match.group(1)
    
    return None


def parse_timestamp_from_filename(filename):
    """Try to extract a date/time from the filename."""
    # Try to match YYYY-MM-DD-HHMM
    match = re.search(r'(\d{4}-\d{2}-\d{2})-(\d{4})', filename)
    if match:
        return f"{match.group(1)}-{match.group(2)}"
    
    # Try to match YYYY-MM-DD
    match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    if match:
        return match.group(1) + "-0000"  # default to midnight if no time
    return None

def format_session_number(session_num):
    """Zero-pad numeric session numbers to 5 digits."""
    if session_num is None:
        return "unknown"
    if session_num.isdigit():
        return f"{int(session_num):05d}"  # <-- changed from 03d to 05d
    return session_num

def main():
    if not JOURNAL_DIR.exists():
        print(f"❌ {JOURNAL_DIR} not found. Are you in the repo root?")
        return

    files = list(JOURNAL_DIR.glob("*.md"))
    if not files:
        print("⚠️ No .md files found in record/journal/")
        return

    print(f"📂 Found {len(files)} files in {JOURNAL_DIR}")

    # Group files by (date, session) to detect duplicates
    file_groups = {}
    renamed_count = 0
    skipped_count = 0
    duplicates_found = 0

    for file_path in sorted(files):
        content = file_path.read_text(encoding="utf-8")
        
        # Try to extract from content first
        session_num = extract_session_from_content(content)
        timestamp = extract_timestamp_from_content(content)

        # Fallback: parse from filename
        if session_num is None:
            session_num = parse_session_from_filename(file_path.name)
        if timestamp is None:
            timestamp = parse_timestamp_from_filename(file_path.name)

        # Final fallback: use file modification time
        if timestamp is None:
            mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
            timestamp = mtime.strftime("%Y-%m-%d-%H%M")
            print(f"  ⏰ Using modification time for {file_path.name}: {timestamp}")

        if session_num is None:
            session_num = "unknown"

        # Format session number
        session_formatted = format_session_number(session_num)

        # Build new filename
        new_name = f"{timestamp}-session-{session_formatted}.md"
        new_path = JOURNAL_DIR / new_name

        # Handle duplicates (two files with same date+session)
        counter = 1
        while new_path.exists() and new_path != file_path:
            duplicates_found += 1
            new_name = f"{timestamp}-session-{session_formatted}-{counter:04d}.md"
            new_path = JOURNAL_DIR / new_name
            counter += 1

        # Rename the file
        if file_path != new_path:
            file_path.rename(new_path)
            renamed_count += 1
            print(f"  ✅ Renamed: {file_path.name} → {new_name}")
        else:
            skipped_count += 1

    print("\n" + "=" * 50)
    print(f"✅ Done! Renamed {renamed_count} files.")
    print(f"📭 Skipped {skipped_count} files (already correct).")
    if duplicates_found:
        print(f"⚠️ Handled {duplicates_found} duplicate(s) by adding a counter.")
    print("=" * 50)


if __name__ == "__main__":
    main()
