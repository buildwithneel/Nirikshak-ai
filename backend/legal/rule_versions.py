"""
Statutory Rule Version Tracking and Amendment History.
Maintains effective dates and statutory amendment revisions under the
Legal Metrology (Packaged Commodities) Rules, 2011.
"""

from typing import Dict, Any, List

RULE_AMENDMENTS_HISTORY: List[Dict[str, Any]] = [
    {
        "version": "1.0",
        "title": "Initial Promulgation",
        "notification_no": "G.S.R. 202(E)",
        "published_date": "2011-03-07",
        "effective_date": "2011-04-01",
        "summary": "Original notification of Legal Metrology (Packaged Commodities) Rules, 2011 replacing the Standards of Weights and Measures (Packaged Commodities) Rules, 1977.",
        "authority": "Department of Consumer Affairs, Government of India",
    },
    {
        "version": "1.1",
        "title": "Principal Display Panel and Font Specifications",
        "notification_no": "G.S.R. 359(E)",
        "published_date": "2017-06-23",
        "effective_date": "2018-01-01",
        "summary": "Mandated prominent PDP font size tables based on package area and enhanced consumer helpline declaration rules.",
        "authority": "Department of Consumer Affairs, Government of India",
    },
    {
        "version": "2.0",
        "title": "Unit Sale Price (USP) and Standard Packaging Reform",
        "notification_no": "G.S.R. 779(E)",
        "published_date": "2021-11-02",
        "effective_date": "2022-12-01",
        "summary": "Introduced mandatory Unit Sale Price declaration (per gram / per ml / per piece) alongside total MRP to facilitate consumer price comparison across package sizes.",
        "authority": "Department of Consumer Affairs, Government of India",
    }
]
