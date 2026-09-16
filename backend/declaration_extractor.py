"""
Declaration Extraction & Normalization Engine for Legal Metrology Inspections.
Parses OCR lines into structured statutory packaging declarations with confidence scoring,
unit normalization, source line tracking, and multi-candidate ambiguity detection.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from declaration_patterns import (
    QUANTITY_UNITS,
    QUANTITY_TRIGGERS,
    MANUFACTURER_TRIGGERS,
    MRP_TRIGGERS,
    TAX_INCLUSIVE_TRIGGERS,
    UNIT_SALE_PRICE_TRIGGERS,
    CONSUMER_CARE_TRIGGERS,
    DATE_TRIGGERS,
)

logger = logging.getLogger("nirikshak-extractor")


class DeclarationExtractor:
    """Extracts statutory declaration fields from OCR lines under Legal Metrology Rules."""

    def __init__(self):
        # Flatten triggers for quick matching
        self.all_mfg_triggers = self._flatten(MANUFACTURER_TRIGGERS)
        self.all_qty_triggers = self._flatten(QUANTITY_TRIGGERS)
        self.all_mrp_triggers = self._flatten(MRP_TRIGGERS)
        self.all_tax_triggers = self._flatten(TAX_INCLUSIVE_TRIGGERS)
        self.all_usp_triggers = self._flatten(UNIT_SALE_PRICE_TRIGGERS)
        self.all_care_triggers = self._flatten(CONSUMER_CARE_TRIGGERS)
        self.all_date_triggers = self._flatten(DATE_TRIGGERS)

    def _flatten(self, trigger_dict: Dict[str, List[str]]) -> List[str]:
        return [item.lower() for sublist in trigger_dict.values() for item in sublist]

    def extract_all(self, ocr_lines: List[Dict[str, Any]], full_text: str = "") -> Dict[str, Any]:
        """
        Executes full extraction pipeline over OCR lines.
        Returns dictionary of extracted declarations mapped to Rule 6 parameters.
        """
        declarations: Dict[str, Any] = {}
        claimed_line_ids: set = set()

        # 1. Extract Net Quantity
        qty_decl = self._extract_net_quantity(ocr_lines)
        declarations["net_quantity"] = qty_decl
        claimed_line_ids.update(qty_decl.get("source_line_ids", []))

        # 2. Extract MRP & Unit Sale Price
        mrp_decl = self._extract_mrp(ocr_lines)
        declarations["mrp"] = mrp_decl
        claimed_line_ids.update(mrp_decl.get("source_line_ids", []))

        # 3. Extract Manufacturer / Packer / Importer
        mfg_decl = self._extract_manufacturer(ocr_lines, claimed_line_ids)
        declarations["manufacturer_details"] = mfg_decl
        claimed_line_ids.update(mfg_decl.get("source_line_ids", []))

        # 4. Extract Consumer Care
        care_decl = self._extract_consumer_care(ocr_lines)
        declarations["consumer_care"] = care_decl
        claimed_line_ids.update(care_decl.get("source_line_ids", []))

        # 5. Extract Date of Manufacture / Packaging
        date_decl = self._extract_date_of_packaging(ocr_lines)
        declarations["date_of_packaging"] = date_decl
        claimed_line_ids.update(date_decl.get("source_line_ids", []))

        # 6. Extract Product / Commodity Name from remaining top-panel lines
        name_decl = self._extract_commodity_name(ocr_lines, claimed_line_ids)
        declarations["commodity_name"] = name_decl

        return declarations

    # -------------------------------------------------------------------------
    # Net Quantity Extraction (Rule 6(1)(b))
    # -------------------------------------------------------------------------
    def _extract_net_quantity(self, lines: List[Dict[str, Any]]) -> Dict[str, Any]:
        unit_pattern = r"(?:k?g|gm|gms|gram|grams|mg|m[lL]|l(?:tr|iter|itre)?|nos?|units?|ग्राम|किग्रा|મિલી|ગ્રામ|લિટર)"
        qty_regex = re.compile(
            rf"(?:(?:net\s*(?:qty|quantity|wt|weight|vol|volume)?|शुद्ध\s*(?:मात्रा|वजन)|ચોખ્ખું\s*વજન)\s*[:\-\s]*)?"
            rf"(\d+(?:\.\d+)?)\s*({unit_pattern})\b",
            re.IGNORECASE | re.UNICODE,
        )

        candidates = []
        for line in lines:
            text = line.get("text", "").strip()
            line_id = line.get("id", "")
            ocr_conf = line.get("confidence", 0.8)

            match = qty_regex.search(text)
            if match:
                num_str = match.group(1)
                unit_raw = match.group(2).lower()
                normalized_unit = QUANTITY_UNITS.get(unit_raw, unit_raw)

                try:
                    num_val = float(num_str) if "." in num_str else int(num_str)
                except ValueError:
                    continue

                # Check if semantic trigger is present on same line
                has_trigger = any(trig in text.lower() for trig in self.all_qty_triggers)
                extraction_conf = min(0.98, ocr_conf + (0.1 if has_trigger else 0.0))

                candidates.append({
                    "raw_text": text,
                    "matched_text": match.group(0),
                    "value": num_val,
                    "unit": normalized_unit,
                    "line_id": line_id,
                    "ocr_conf": ocr_conf,
                    "extraction_conf": extraction_conf,
                    "has_trigger": has_trigger,
                })

        if not candidates:
            return {
                "key": "net_quantity",
                "label": "Net Quantity",
                "detected_value": None,
                "normalized_value": None,
                "confidence": 0.0,
                "status": "missing",
                "source_line_ids": [],
                "notes": "No standard weight/measure pattern recognized in OCR lines.",
            }

        # Select candidate with semantic trigger first, or highest confidence
        candidates.sort(key=lambda c: (c["has_trigger"], c["extraction_conf"]), reverse=True)
        best = candidates[0]

        # Multi-candidate ambiguity check
        is_ambiguous = len(candidates) > 1 and any(
            c["value"] != best["value"] or c["unit"] != best["unit"] for c in candidates[1:]
        )

        cand_list_str = ", ".join(str(c["value"]) + " " + str(c["unit"]) for c in candidates[:3])
        status = "uncertain" if is_ambiguous or best["extraction_conf"] < 0.80 else "detected"
        notes = (
            f"Extracted {best['value']} {best['unit']} via pattern '{best['matched_text']}'."
            if not is_ambiguous
            else f"Multiple quantity candidates detected: {cand_list_str}. Officer review needed."
        )

        return {
            "key": "net_quantity",
            "label": "Net Quantity",
            "detected_value": f"{best['value']} {best['unit']}",
            "normalized_value": {
                "numeric_value": best["value"],
                "unit": best["unit"],
                "standard_display": f"{best['value']} {best['unit']}",
            },
            "confidence": round(best["extraction_conf"], 2),
            "status": status,
            "source_line_ids": [best["line_id"]],
            "notes": notes,
        }

    # -------------------------------------------------------------------------
    # Maximum Retail Price (MRP) Extraction (Rule 6(1)(da))
    # -------------------------------------------------------------------------
    def _extract_mrp(self, lines: List[Dict[str, Any]]) -> Dict[str, Any]:
        # Price pattern supporting ₹, Rs., Rs, INR, and numbers with optional decimals
        price_regex = re.compile(
            r"(?:(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price|अधिकतम\s*खुदरा\s*मूल्य|મહત્તમ\s*છૂટક\s*કિંમત)\s*[:\-\s]*)?"
            r"(?:₹|rs\.?|inr|रु\.?|રૂ\.?)?\s*([0-9]+(?:[\.,][0-9]{1,2})?)",
            re.IGNORECASE,
        )

        candidates = []
        unit_sale_price = None
        has_tax_inclusive = False
        tax_line_ids = []

        for line in lines:
            text = line.get("text", "").strip()
            line_id = line.get("id", "")
            ocr_conf = line.get("confidence", 0.8)
            text_lower = text.lower()

            # Check for tax inclusive declaration on this line
            if any(trig in text_lower for trig in self.all_tax_triggers):
                has_tax_inclusive = True
                tax_line_ids.append(line_id)

            # Check for Unit Sale Price
            if any(trig in text_lower for trig in self.all_usp_triggers):
                usp_match = re.search(r"(?:rs\.?|₹)\s*(\d+(?:\.\d{1,3})?)\s*(?:/|per)\s*([a-zA-Z]+)", text, re.IGNORECASE)
                if usp_match:
                    unit_sale_price = usp_match.group(0)

            # Check for MRP indicator
            is_mrp_line = any(trig in text_lower for trig in self.all_mrp_triggers)
            if is_mrp_line:
                # Handle OCR noise: substitute capital O in numeric token if followed by decimal or currency
                cleaned_text = re.sub(r"(?<=\d)O(?=\d|$)", "0", text)
                cleaned_text = re.sub(r"(?<=[₹Rs\.])\s*O", "0", cleaned_text)

                match = price_regex.search(cleaned_text)
                if match:
                    price_str = match.group(1).replace(",", ".")
                    try:
                        price_num = float(price_str)
                        # Filter out implausible years (e.g. 2026, 2027) mistaken for MRP
                        if 1.0 <= price_num <= 50000.0 and price_num not in [2024, 2025, 2026, 2027]:
                            candidates.append({
                                "raw_text": text,
                                "price": price_num,
                                "currency": "INR",
                                "line_id": line_id,
                                "ocr_conf": ocr_conf,
                                "extraction_conf": min(0.98, ocr_conf + 0.08),
                            })
                    except ValueError:
                        continue

        if not candidates:
            return {
                "key": "mrp",
                "label": "Maximum Retail Price (MRP)",
                "detected_value": None,
                "normalized_value": None,
                "confidence": 0.0,
                "status": "missing",
                "source_line_ids": [],
                "notes": "No retail price or currency marker (₹ / Rs.) identified in OCR lines.",
            }

        candidates.sort(key=lambda c: c["extraction_conf"], reverse=True)
        best = candidates[0]

        is_ambiguous = len(candidates) > 1 and any(abs(c["price"] - best["price"]) > 0.01 for c in candidates[1:])
        all_lines = [best["line_id"]] + [tid for tid in tax_line_ids if tid != best["line_id"]]

        status = "uncertain" if is_ambiguous or best["extraction_conf"] < 0.75 else "detected"
        display_val = f"₹{best['price']:0.2f}" if best['price'] % 1 != 0 else f"₹{int(best['price'])}"
        if has_tax_inclusive:
            display_val += " (Incl. of all taxes)"

        price_list_str = ", ".join("₹" + str(c["price"]) for c in candidates[:3])
        return {
            "key": "mrp",
            "label": "Maximum Retail Price (MRP)",
            "detected_value": display_val,
            "normalized_value": {
                "price": best["price"],
                "currency": "INR",
                "tax_inclusive_declared": has_tax_inclusive,
                "unit_sale_price": unit_sale_price,
            },
            "confidence": round(best["extraction_conf"], 2),
            "status": status,
            "source_line_ids": all_lines,
            "notes": (
                f"Detected retail price ₹{best['price']}. Tax inclusive declaration: {'Present' if has_tax_inclusive else 'Missing/Unverified'}."
                if not is_ambiguous
                else f"Multiple candidate prices found: {price_list_str}. Officer verification recommended."
            ),
        }

    # -------------------------------------------------------------------------
    # Manufacturer / Packer / Importer Details (Rule 6(1)(e))
    # -------------------------------------------------------------------------
    def _extract_manufacturer(self, lines: List[Dict[str, Any]], claimed_ids: set) -> Dict[str, Any]:
        pincode_regex = re.compile(r"\b\d{6}\b")
        mfg_lines = []
        found_trigger = False

        for idx, line in enumerate(lines):
            line_id = line.get("id", "")
            if line_id in claimed_ids:
                continue

            text = line.get("text", "").strip()
            text_lower = text.lower()

            has_trigger = any(trig in text_lower for trig in self.all_mfg_triggers)
            has_pincode = bool(pincode_regex.search(text))
            has_company_kw = any(kw in text_lower for kw in ["ltd", "limited", "foods", "industries", "pvt", "llp", "corp", "agency"])

            if has_trigger:
                found_trigger = True
                mfg_lines.append(line)
                # If next line is an address continuation, capture it too
                if idx + 1 < len(lines):
                    next_line = lines[idx + 1]
                    next_text = next_line.get("text", "")
                    if next_line.get("id") not in claimed_ids and (
                        pincode_regex.search(next_text)
                        or any(k in next_text.lower() for k in ["plot", "gidc", "road", "street", "delhi", "mumbai", "gujarat", "ahmedabad", "bengaluru"])
                    ):
                        mfg_lines.append(next_line)
                break
            elif has_company_kw and has_pincode:
                mfg_lines.append(line)
                break

        if not mfg_lines:
            return {
                "key": "manufacturer_details",
                "label": "Manufacturer / Packer Details",
                "detected_value": None,
                "normalized_value": None,
                "confidence": 0.0,
                "status": "missing",
                "source_line_ids": [],
                "notes": "No manufacturer, packer, or statutory premise address trigger found in OCR lines.",
            }

        combined_text = " • ".join(l.get("text", "").strip() for l in mfg_lines)
        line_ids = [l.get("id") for l in mfg_lines]
        avg_ocr = sum(l.get("confidence", 0.8) for l in mfg_lines) / len(mfg_lines)
        has_pin = bool(pincode_regex.search(combined_text))

        extraction_conf = min(0.96, avg_ocr + (0.1 if found_trigger and has_pin else 0.05))
        status = "detected" if extraction_conf >= 0.80 and found_trigger else "uncertain"

        return {
            "key": "manufacturer_details",
            "label": "Manufacturer / Packer Details",
            "detected_value": combined_text,
            "normalized_value": {
                "raw_address": combined_text,
                "has_pincode": has_pin,
                "has_explicit_trigger": found_trigger,
            },
            "confidence": round(extraction_conf, 2),
            "status": status,
            "source_line_ids": line_ids,
            "notes": (
                f"Manufacturer entity detected with {'postal PIN' if has_pin else 'address details'}."
                if status == "detected"
                else "Potential manufacturer declaration found, but complete postal address/PIN requires officer review."
            ),
        }

    # -------------------------------------------------------------------------
    # Consumer Care Contact Details (Rule 6(1)(n))
    # -------------------------------------------------------------------------
    def _extract_consumer_care(self, lines: List[Dict[str, Any]]) -> Dict[str, Any]:
        phone_regex = re.compile(r"(?:1800[-\s]?\d{3}[-\s]?\d{3,4}|\+?91[-\s]?\d{10}|\b\d{10}\b|\b0\d{2,4}[-\s]?\d{6,8}\b)")
        email_regex = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

        matched_lines = []
        phones = []
        emails = []

        for line in lines:
            text = line.get("text", "").strip()
            line_id = line.get("id", "")
            text_lower = text.lower()

            has_trigger = any(trig in text_lower for trig in self.all_care_triggers)
            found_phones = phone_regex.findall(text)
            found_emails = email_regex.findall(text)

            if has_trigger or found_phones or found_emails:
                matched_lines.append(line)
                phones.extend(found_phones)
                emails.extend(found_emails)

        if not matched_lines:
            return {
                "key": "consumer_care",
                "label": "Consumer Care Details",
                "detected_value": None,
                "normalized_value": None,
                "confidence": 0.0,
                "status": "missing",
                "source_line_ids": [],
                "notes": "No telephone helpline, toll-free number, or consumer redressal email address detected.",
            }

        line_ids = [l.get("id") for l in matched_lines]
        combined = " | ".join(l.get("text", "").strip() for l in matched_lines)
        avg_ocr = sum(l.get("confidence", 0.8) for l in matched_lines) / len(matched_lines)

        has_both = bool(phones and emails)
        extraction_conf = min(0.98, avg_ocr + (0.12 if has_both else 0.06))

        return {
            "key": "consumer_care",
            "label": "Consumer Care Details",
            "detected_value": combined,
            "normalized_value": {
                "phone_numbers": phones,
                "email_addresses": emails,
                "has_toll_free": any("1800" in p for p in phones),
            },
            "confidence": round(extraction_conf, 2),
            "status": "detected" if extraction_conf >= 0.75 else "uncertain",
            "source_line_ids": line_ids,
            "notes": f"Consumer contact redressal detected: {len(phones)} phone(s), {len(emails)} email(s).",
        }

    # -------------------------------------------------------------------------
    # Date of Manufacture / Packaging (Rule 6(1)(d))
    # -------------------------------------------------------------------------
    def _extract_date_of_packaging(self, lines: List[Dict[str, Any]]) -> Dict[str, Any]:
        date_pattern = re.compile(
            r"(?:(?:mfg|pkd|mfd|packed|batch)\s*(?:date)?[:\-\s]*)?"
            r"(\b(?:0[1-9]|1[0-2])\s*[\/\-]\s*20\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*20\d{2}\b)",
            re.IGNORECASE,
        )

        matched_lines = []
        date_vals = []

        for line in lines:
            text = line.get("text", "").strip()
            line_id = line.get("id", "")
            text_lower = text.lower()

            has_trigger = any(trig in text_lower for trig in self.all_date_triggers)
            match = date_pattern.search(text)
            if match or has_trigger:
                if match:
                    date_vals.append(match.group(0))
                matched_lines.append(line)

        if not matched_lines:
            return {
                "key": "date_of_packaging",
                "label": "Date of Manufacture / Packaging",
                "detected_value": None,
                "normalized_value": None,
                "confidence": 0.0,
                "status": "missing",
                "source_line_ids": [],
                "notes": "Month and year of manufacture or packing not clearly identified in OCR output.",
            }

        line_ids = [l.get("id") for l in matched_lines]
        best_date = date_vals[0] if date_vals else matched_lines[0].get("text", "")
        avg_ocr = sum(l.get("confidence", 0.8) for l in matched_lines) / len(matched_lines)

        return {
            "key": "date_of_packaging",
            "label": "Date of Manufacture / Packaging",
            "detected_value": best_date,
            "normalized_value": {"month_year": best_date},
            "confidence": round(min(0.95, avg_ocr + 0.05), 2),
            "status": "detected" if date_vals else "uncertain",
            "source_line_ids": line_ids,
            "notes": f"Statutory packaging timeline declared: '{best_date}'.",
        }

    # -------------------------------------------------------------------------
    # Product / Commodity Name (Rule 6(1)(a))
    # -------------------------------------------------------------------------
    def _extract_commodity_name(self, lines: List[Dict[str, Any]], claimed_ids: set) -> Dict[str, Any]:
        """
        Extracts commodity/product name candidate from upper package panel lines
        not claimed by other specific declarations.
        """
        candidates = []

        for line in lines:
            line_id = line.get("id", "")
            if line_id in claimed_ids:
                continue

            text = line.get("text", "").strip()
            if len(text) < 3:
                continue

            norm_box = line.get("normalized_box", {})
            y_pos = norm_box.get("y", 100.0)
            height = norm_box.get("height", 1.0)
            ocr_conf = line.get("confidence", 0.8)

            # Heuristic score for commodity name:
            # - Prominence: higher text height is favored
            # - Position: top/upper panel (y < 40%) favored
            # - Length: 5 to 40 characters typical
            pos_score = 1.0 if y_pos < 30.0 else (0.7 if y_pos < 55.0 else 0.3)
            size_score = min(1.0, height / 5.0) if height > 0 else 0.5
            len_score = 1.0 if 5 <= len(text) <= 45 else 0.6

            score = (pos_score * 0.45) + (size_score * 0.25) + (len_score * 0.15) + (ocr_conf * 0.15)

            candidates.append({
                "text": text,
                "line_id": line_id,
                "score": score,
                "ocr_conf": ocr_conf,
            })

        if not candidates:
            return {
                "key": "commodity_name",
                "label": "Name of Commodity",
                "detected_value": None,
                "normalized_value": None,
                "confidence": 0.0,
                "status": "missing",
                "source_line_ids": [],
                "notes": "No prominent product or generic commodity title identified on packaging panel.",
            }

        candidates.sort(key=lambda c: c["score"], reverse=True)
        top = candidates[0]

        status = "detected" if top["score"] >= 0.70 else "uncertain"
        confidence = round(min(0.95, top["score"]), 2)

        return {
            "key": "commodity_name",
            "label": "Name of Commodity",
            "detected_value": top["text"],
            "normalized_value": {"candidate_name": top["text"]},
            "confidence": confidence,
            "status": status,
            "source_line_ids": [top["line_id"]],
            "notes": (
                f"Candidate commodity title '{top['text']}' identified from top panel."
                if status == "detected"
                else f"Ambiguous commodity title '{top['text']}' requires officer confirmation."
            ),
        }
