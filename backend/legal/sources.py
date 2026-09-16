"""
Authoritative Legal Sources for NIRIKSHAK AI Legal Metrology Rule Engine.
References authoritative publications from the Ministry of Consumer Affairs,
Food & Public Distribution, Government of India and India Code.
"""

from typing import Dict, Any, List

AUTHORITATIVE_LEGAL_SOURCES: Dict[str, Dict[str, Any]] = {
    "LM_ACT_2009": {
        "source_id": "LM_ACT_2009",
        "name": "The Legal Metrology Act, 2009 (Act No. 1 of 2010)",
        "authority": "Parliament of India / Ministry of Consumer Affairs, Food & Public Distribution",
        "jurisdiction": "Republic of India",
        "official_url": "https://www.indiacode.nic.in/handle/123456789/2056",
        "enactment_date": "2010-01-13",
        "effective_date": "2011-04-01",
        "description": "An Act to establish and enforce standards of weights and measures, regulate trade and commerce in weights, measures and other goods which are sold or distributed by weight, measure or number.",
        "verification_status": "VERIFIED",
        "last_verified_at": "2026-03-01",
    },
    "LM_PCR_2011": {
        "source_id": "LM_PCR_2011",
        "name": "Legal Metrology (Packaged Commodities) Rules, 2011 (GSR 202(E))",
        "authority": "Department of Consumer Affairs, Ministry of Consumer Affairs, Food & Public Distribution",
        "jurisdiction": "Republic of India",
        "official_url": "https://consumeraffairs.nic.in/acts-and-rules/legal-metrology",
        "enactment_date": "2011-03-07",
        "effective_date": "2011-04-01",
        "description": "Statutory rules governing declarations on pre-packaged commodities, including Principal Display Panel mandates, net quantity tolerances, maximum retail price, and consumer grievance contact disclosures.",
        "verification_status": "VERIFIED",
        "last_verified_at": "2026-03-01",
    },
    "LM_AMENDMENT_2021": {
        "source_id": "LM_AMENDMENT_2021",
        "name": "Legal Metrology (Packaged Commodities) Amendment Rules, 2021 (GSR 779(E))",
        "authority": "Department of Consumer Affairs, Government of India",
        "jurisdiction": "Republic of India",
        "official_url": "https://consumeraffairs.nic.in/acts-and-rules/legal-metrology/amendments",
        "enactment_date": "2021-11-02",
        "effective_date": "2022-12-01",
        "description": "Amended provisions requiring unit sale price declaration (per gram / per ml / per piece) alongside MRP, and standard packaging norms.",
        "verification_status": "VERIFIED",
        "last_verified_at": "2026-03-01",
    }
}
