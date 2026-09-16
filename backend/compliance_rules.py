"""
Deterministic Legal Metrology Compliance Rule Engine.
Evaluates extracted declarations against statutory mandates of the
Legal Metrology (Packaged Commodities) Rules, 2011 (Rule 6 Specifications).
"""

from typing import Dict, Any, List, Tuple


class LegalMetrologyRuleEngine:
    """Configurable, deterministic statutory evaluation engine for Packaged Commodities."""

    RULES_REGISTRY = [
        {
            "id": "RULE_6_1_A",
            "declaration_key": "commodity_name",
            "rule_reference": "Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011",
            "statutory_title": "Generic Name or Commodity Description",
            "expected_requirement": "Clear generic name or description of the packaged commodity on the Principal Display Panel (PDP).",
        },
        {
            "id": "RULE_6_1_B",
            "declaration_key": "net_quantity",
            "rule_reference": "Rule 6(1)(b) & Rule 11, LM (Packaged Commodities) Rules, 2011",
            "statutory_title": "Net Quantity in Standard SI Units",
            "expected_requirement": "Net quantity in standard metric units (g, kg, ml, L, or numbers) declared in prescribed font size.",
        },
        {
            "id": "RULE_6_1_DA",
            "declaration_key": "mrp",
            "rule_reference": "Rule 6(1)(da) & Rule 18, LM (Packaged Commodities) Rules, 2011",
            "statutory_title": "Maximum Retail Price (MRP) & Tax Inclusion",
            "expected_requirement": "Maximum Retail Price in Indian Rupees inclusive of all taxes, with unit sale price where applicable.",
        },
        {
            "id": "RULE_6_1_E",
            "declaration_key": "manufacturer_details",
            "rule_reference": "Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011",
            "statutory_title": "Manufacturer / Packer / Importer Name & Address",
            "expected_requirement": "Complete name and physical manufacturing/packaging address with postal PIN code.",
        },
        {
            "id": "RULE_6_1_N",
            "declaration_key": "consumer_care",
            "rule_reference": "Rule 6(1)(n), Legal Metrology (Packaged Commodities) Rules, 2011",
            "statutory_title": "Consumer Redressal & Contact Office",
            "expected_requirement": "Name, physical postal address, telephone number, and email address of consumer care cell.",
        },
        {
            "id": "RULE_6_1_D",
            "declaration_key": "date_of_packaging",
            "rule_reference": "Rule 6(1)(d), Legal Metrology (Packaged Commodities) Rules, 2011",
            "statutory_title": "Month and Year of Manufacture / Packaging",
            "expected_requirement": "Statutory declaration of month and year in which commodity was manufactured, packed, or imported.",
        },
    ]

    def evaluate_all(self, declarations: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs deterministic compliance evaluation across all registered statutory rules.
        Returns structured findings, overall compliance status, and summary metrics.
        """
        findings: List[Dict[str, Any]] = []

        compliant_count = 0
        review_count = 0
        violation_count = 0

        for rule in self.RULES_REGISTRY:
            key = rule["declaration_key"]
            decl = declarations.get(key, {})

            status, reason, what_detected, what_expected = self._evaluate_single_rule(rule, decl)

            finding = {
                "id": f"finding-{rule['id'].lower()}",
                "rule_id": rule["id"],
                "rule_reference": rule["rule_reference"],
                "statutory_title": rule["statutory_title"],
                "declaration_key": key,
                "status": status,
                "what_detected": what_detected,
                "what_expected": what_expected,
                "reason": reason,
                "extraction_confidence": int(decl.get("confidence", 0.0) * 100),
                "source_line_ids": decl.get("source_line_ids", []),
            }

            findings.append(finding)

            if status == "COMPLIANT":
                compliant_count += 1
            elif status == "POTENTIAL_VIOLATION":
                violation_count += 1
            else:
                review_count += 1

        # Determine overall inspection status
        if violation_count > 0:
            overall_status = "POTENTIAL_VIOLATION"
        elif review_count > 0:
            overall_status = "REVIEW_REQUIRED"
        else:
            overall_status = "COMPLIANT"

        # Compliance score out of 100
        total_rules = len(self.RULES_REGISTRY)
        compliance_score = int(round((compliant_count / total_rules) * 100))

        return {
            "findings": findings,
            "overall_status": overall_status,
            "compliance_score": compliance_score,
            "summary": {
                "total_rules": total_rules,
                "compliant_count": compliant_count,
                "review_required_count": review_count,
                "potential_violation_count": violation_count,
            },
        }

    def _evaluate_single_rule(
        self, rule: Dict[str, str], decl: Dict[str, Any]
    ) -> Tuple[str, str, str, str]:
        """Evaluates an individual rule deterministically against the extracted field."""
        decl_status = decl.get("status", "missing")
        detected_val = decl.get("detected_value")
        norm_val = decl.get("normalized_value")
        key = rule["declaration_key"]

        # If field is completely missing
        if decl_status == "missing" or not detected_val:
            return (
                "POTENTIAL_VIOLATION",
                f"Statutory mandate under {rule['rule_reference']} was not detected on the package surface.",
                "Not Detected / Missing",
                rule["expected_requirement"],
            )

        # Rule 6(1)(a): Commodity Name
        if key == "commodity_name":
            if decl_status == "detected":
                return (
                    "COMPLIANT",
                    f"Product title declared as '{detected_val}' on upper package panel satisfies statutory identification.",
                    detected_val,
                    rule["expected_requirement"],
                )
            else:
                return (
                    "REVIEW_REQUIRED",
                    f"Candidate title '{detected_val}' was detected, but requires officer verification against Principal Display Panel (PDP) standards.",
                    detected_val,
                    rule["expected_requirement"],
                )

        # Rule 6(1)(b): Net Quantity
        if key == "net_quantity":
            unit = norm_val.get("unit") if isinstance(norm_val, dict) else ""
            if decl_status == "detected" and unit in ["g", "kg", "mg", "ml", "L", "units"]:
                return (
                    "COMPLIANT",
                    f"Net quantity of {detected_val} declared in approved standard metric unit ({unit}).",
                    detected_val,
                    rule["expected_requirement"],
                )
            else:
                return (
                    "REVIEW_REQUIRED",
                    f"Net quantity declaration '{detected_val}' requires verification for standard units and minimum numeral height.",
                    detected_val,
                    rule["expected_requirement"],
                )

        # Rule 6(1)(da): MRP & Tax Inclusion
        if key == "mrp":
            has_tax = norm_val.get("tax_inclusive_declared", False) if isinstance(norm_val, dict) else False
            if decl_status == "detected" and has_tax:
                return (
                    "COMPLIANT",
                    f"Maximum retail price declared with explicit statutory tax inclusion: '{detected_val}'.",
                    detected_val,
                    rule["expected_requirement"],
                )
            elif decl_status == "detected" and not has_tax:
                return (
                    "REVIEW_REQUIRED",
                    f"Retail price '{detected_val}' detected, but explicit 'inclusive of all taxes' wording requires officer verification.",
                    detected_val,
                    rule["expected_requirement"],
                )
            else:
                return (
                    "REVIEW_REQUIRED",
                    f"Candidate retail price '{detected_val}' detected with multiple candidates or OCR ambiguity.",
                    detected_val,
                    rule["expected_requirement"],
                )

        # Rule 6(1)(e): Manufacturer / Packer Details
        if key == "manufacturer_details":
            has_pin = norm_val.get("has_pincode", False) if isinstance(norm_val, dict) else False
            if decl_status == "detected" and has_pin:
                return (
                    "COMPLIANT",
                    f"Manufacturer/packer declaration includes commercial entity and postal PIN code verification.",
                    detected_val,
                    rule["expected_requirement"],
                )
            else:
                return (
                    "REVIEW_REQUIRED",
                    f"Manufacturer declaration detected ('{detected_val}'), but complete postal address/PIN code requires physical package confirmation.",
                    detected_val,
                    rule["expected_requirement"],
                )

        # Rule 6(1)(n): Consumer Care Details
        if key == "consumer_care":
            phones = norm_val.get("phone_numbers", []) if isinstance(norm_val, dict) else []
            emails = norm_val.get("email_addresses", []) if isinstance(norm_val, dict) else []
            if phones and emails:
                return (
                    "COMPLIANT",
                    f"Comprehensive consumer care details detected with telephone ({phones[0]}) and email ({emails[0]}).",
                    detected_val,
                    rule["expected_requirement"],
                )
            elif phones or emails:
                return (
                    "REVIEW_REQUIRED",
                    f"Partial consumer redressal contact detected ({'phone only' if phones else 'email only'}). Rule 6(1)(n) requires telephone and email.",
                    detected_val,
                    rule["expected_requirement"],
                )
            else:
                return (
                    "POTENTIAL_VIOLATION",
                    "Consumer care contact details not detected on packaging panel.",
                    detected_val or "Missing",
                    rule["expected_requirement"],
                )

        # Rule 6(1)(d): Month & Year of Packaging
        if key == "date_of_packaging":
            if decl_status == "detected":
                return (
                    "COMPLIANT",
                    f"Statutory manufacturing/packaging timeline declared as '{detected_val}'.",
                    detected_val,
                    rule["expected_requirement"],
                )
            else:
                return (
                    "REVIEW_REQUIRED",
                    f"Date of packaging '{detected_val}' detected, but requires officer verification for month and year format.",
                    detected_val,
                    rule["expected_requirement"],
                )

        # Fallback default
        return (
            "REVIEW_REQUIRED",
            f"Declaration requires officer assessment under {rule['rule_reference']}.",
            str(detected_val),
            rule["expected_requirement"],
        )
