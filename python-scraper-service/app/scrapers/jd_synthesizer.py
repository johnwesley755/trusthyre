"""
Job Description Synthesizer & Markdown Formatter.

Normalizes raw text, HTML snippets, and platform-specific metadata dictionaries
into clean, human-readable, structured Markdown job descriptions across all scrapers.
"""

import re
import html
from typing import Dict, Any, Optional, List

def clean_html_to_text(raw_html: str) -> str:
    """
    Converts raw HTML into clean text while preserving line breaks and lists.
    """
    if not raw_html:
        return ""
    
    text = raw_html
    # Unescape HTML entities
    text = html.unescape(text)
    
    # Replace line breaks and paragraph closings with newlines
    text = re.sub(r'<(?:br|br\s*/|/p|/div|/tr)>', '\n', text, flags=re.IGNORECASE)
    # Convert list items to markdown bullets
    text = re.sub(r'<li[^>]*>', '\n- ', text, flags=re.IGNORECASE)
    text = re.sub(r'</li>', '', text, flags=re.IGNORECASE)
    # Strip remaining HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    
    # Normalize excessive spaces and blank lines
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.split('\n')]
    
    # Filter repeated blank lines
    cleaned_lines = []
    prev_blank = False
    for line in lines:
        if not line:
            if not prev_blank:
                cleaned_lines.append("")
                prev_blank = True
        else:
            cleaned_lines.append(line)
            prev_blank = False
            
    return "\n".join(cleaned_lines).strip()


def synthesize_rich_jd(
    title: str,
    raw_description: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
    salary_text: Optional[str] = None,
    requirements: Optional[List[str]] = None,
    skills: Optional[List[str]] = None,
    shifts_and_hours: Optional[str] = None,
    benefits: Optional[List[str]] = None,
    contact_or_venue: Optional[str] = None,
    extra_specs: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Synthesizes a standardized, professional, rich markdown Job Description.
    """
    sections = []
    
    # 1. Summary
    cleaned_desc = clean_html_to_text(raw_description or "")
    if cleaned_desc:
        sections.append(f"### 📋 Job Summary\n{cleaned_desc}")
    elif title and company and location:
        sections.append(
            f"### 📋 Job Summary\n{company} is urgently hiring candidates for the position of **{title}** located in {location}."
        )

    # 2. Key Specifications Grid (if extra_specs provided)
    if extra_specs:
        specs_lines = []
        for k, v in extra_specs.items():
            if v:
                specs_lines.append(f"- **{k.strip()}:** {str(v).strip()}")
        if specs_lines:
            sections.append("### 🔍 Role Specifications\n" + "\n".join(specs_lines))

    # 3. Requirements & Eligibility
    req_items = []
    if requirements:
        for r in requirements:
            cleaned_r = clean_html_to_text(str(r))
            if cleaned_r:
                req_items.append(f"- {cleaned_r}")
    if skills:
        cleaned_skills = [str(s).strip() for s in skills if str(s).strip()]
        if cleaned_skills:
            req_items.append(f"- **Key Skills:** {', '.join(cleaned_skills)}")
            
    if req_items:
        sections.append("### 🎯 Requirements & Eligibility\n" + "\n".join(req_items))

    # 4. Shifts, Timings & Work Environment
    if shifts_and_hours:
        cleaned_shift = clean_html_to_text(shifts_and_hours)
        sections.append(f"### ⏰ Working Hours & Shifts\n{cleaned_shift}")

    # 5. Compensation & Perks
    comp_lines = []
    if salary_text:
        comp_lines.append(f"- **Salary:** {salary_text.strip()}")
    if benefits:
        for b in benefits:
            cleaned_b = clean_html_to_text(str(b))
            if cleaned_b:
                comp_lines.append(f"- {cleaned_b}")
                
    if comp_lines:
        sections.append("### 💰 Compensation & Benefits\n" + "\n".join(comp_lines))

    # 6. Interview Venue / Contact Details (if public)
    if contact_or_venue:
        cleaned_contact = clean_html_to_text(contact_or_venue)
        sections.append(f"### 📍 Interview & Application Details\n{cleaned_contact}")

    result = "\n\n".join(sections).strip()
    return result if len(result) >= 120 else (cleaned_desc or f"Hiring for {title} at {company or 'Reputed Employer'}.")

