"""
Provider Abstraction and Deterministic Rule-Based Copilot Provider for NIRIKSHAK AI.
Adheres strictly to the core principle:
AI detects and organizes evidence; authorized officer verifies facts and makes official determination.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import re
from .schemas import CopilotResponse, CopilotSource, CopilotAction
from legal.rule_registry import STATUTORY_RULES_REGISTRY, get_rule_by_id


class BaseCopilotProvider(ABC):
    """Abstract interface for copilot text and source generation."""

    @abstractmethod
    def generate(self, message: str, context: Dict[str, Any]) -> CopilotResponse:
        """Processes the officer inquiry and returns an evidence-grounded response."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Checks if the provider is operational."""
        pass


class DeterministicRuleBasedCopilotProvider(BaseCopilotProvider):
    """
    Offline-first, deterministic, evidence-grounded copilot engine.
    Derives answers directly from verified inspection data, conflict records,
    and statutory rule registries without relying on external API subscriptions.
    """

    def is_available(self) -> bool:
        return True

    def generate(self, message: str, context: Dict[str, Any]) -> CopilotResponse:
        query = message.strip().lower()
        inspection_id = context.get("inspection_id", "")
        product_name = context.get("product_name", "Commodity")
        findings = context.get("findings", [])
        declarations = context.get("declarations", {})
        conflicts = context.get("conflicts", [])
        images = context.get("images", [])
        observations = context.get("observations", [])
        verification = context.get("verification")

        sources: List[CopilotSource] = []
        actions: List[CopilotAction] = []

        # -------------------------------------------------------------
        # 1. OUT-OF-SCOPE GUARD
        # -------------------------------------------------------------
        out_of_scope_triggers = [
            "every violation in india",
            "weather",
            "capital of",
            "who is",
            "recipe",
            "movie",
            "tell me a joke",
            "unrelated",
        ]
        if any(t in query for t in out_of_scope_triggers):
            return CopilotResponse(
                success=True,
                answer=(
                    "This copilot is strictly limited to verified evidence and statutory evaluations "
                    "available for this inspection and configured Legal Metrology sources. "
                    "Please navigate to the Compliance Rules library for general statutory standards."
                ),
                sources=[],
                actions=[CopilotAction(type="OPEN_RULE", label="View Rules Library", target_tab="rules")],
                grounded=True,
                quality_state="INSUFFICIENT_EVIDENCE",
                mode="RULE_BASED_DEMO",
            )

        # -------------------------------------------------------------
        # 2. CONFLICT INQUIRY
        # -------------------------------------------------------------
        if any(w in query for w in ["conflict", "mismatch", "discrepancy", "conflicting"]):
            if conflicts:
                c = conflicts[0]
                decl_name = c.get("declaration_name", "Declaration")
                v1 = c.get("value_1", "Value 1")
                v2 = c.get("value_2", "Value 2")
                p1 = c.get("panel_1", "Panel 1")
                p2 = c.get("panel_2", "Panel 2")
                conf1 = int((c.get("confidence_1") or 0.95) * 100)
                conf2 = int((c.get("confidence_2") or 0.92) * 100)

                answer = (
                    f"A cross-panel {decl_name} conflict was detected between packaging faces:\n\n"
                    f"• {p1} Panel: {v1} (OCR confidence: {conf1}%)\n"
                    f"• {p2} Panel: {v2} (OCR confidence: {conf2}%)\n\n"
                    f"The system has not selected either value as legally authoritative.\n\n"
                    f"Officer Action Required: Review both physical package panels and record the verified determination in the Conflict Drawer."
                )

                # Attach evidence sources
                for img in images:
                    if img.get("panel_type") in (p1, p2):
                        sources.append(
                            CopilotSource(
                                type="CONFLICT",
                                label=f"{decl_name} ({img.get('panel_type')})",
                                inspection_id=inspection_id,
                                image_id=img.get("id"),
                                panel_type=img.get("panel_type"),
                                declaration_key=c.get("declaration_key"),
                            )
                        )

                actions.append(
                    CopilotAction(
                        type="OPEN_CONFLICT",
                        label="Open Conflict Drawer",
                        target_id=c.get("declaration_key"),
                    )
                )

                return CopilotResponse(
                    success=True,
                    answer=answer,
                    sources=sources,
                    actions=actions,
                    grounded=True,
                    quality_state="GROUNDED",
                    mode="RULE_BASED_DEMO",
                )
            else:
                return CopilotResponse(
                    success=True,
                    answer="No cross-panel declaration conflicts were detected across the analyzed package images.",
                    sources=[],
                    actions=[],
                    grounded=True,
                    quality_state="GROUNDED",
                    mode="RULE_BASED_DEMO",
                )

        # -------------------------------------------------------------
        # 3. MISSING EVIDENCE / NOT DETECTED INQUIRY
        # -------------------------------------------------------------
        if any(w in query for w in ["not detected", "missing", "un-detected", "absent", "consumer care", "toll free"]):
            # Look for missing declarations
            missing_items = []
            for k, decl in declarations.items():
                if decl.get("status") in ("missing", "uncertain", "not_detected"):
                    missing_items.append((k, decl.get("label", k)))

            if missing_items:
                missing_names = ", ".join([name for _, name in missing_items[:3]])
                answer = (
                    f"The OCR analysis did not detect reliable visual evidence for: {missing_names}.\n\n"
                    f"Statutory Boundary: This is a visual detection result within the scanned panels, "
                    f"NOT confirmation that the declaration is physically absent from the package.\n\n"
                    f"Officer Action Required: Physically inspect the remaining package surfaces and record your observation."
                )

                for k, name in missing_items[:3]:
                    sources.append(
                        CopilotSource(
                            type="DECLARATION",
                            label=f"{name} (NOT_DETECTED)",
                            inspection_id=inspection_id,
                            declaration_key=k,
                        )
                    )

                actions.append(
                    CopilotAction(
                        type="OPEN_EVIDENCE",
                        label="Inspect Package Evidence",
                        target_tab="EVIDENCE",
                    )
                )

                return CopilotResponse(
                    success=True,
                    answer=answer,
                    sources=sources,
                    actions=actions,
                    grounded=True,
                    quality_state="GROUNDED",
                    mode="RULE_BASED_DEMO",
                )

        # -------------------------------------------------------------
        # 4. OFFICER REVIEW CHECKLIST INQUIRY
        # -------------------------------------------------------------
        if any(w in query for w in ["checklist", "what remains", "pending", "steps to complete", "action list"]):
            checklist_items = []

            if conflicts:
                checklist_items.append("Resolve cross-panel MRP / declaration conflict")
                actions.append(CopilotAction(type="OPEN_CONFLICT", label="Resolve Conflicts", target_tab="EVIDENCE"))

            review_findings = [f for f in findings if f.get("status") in ("REVIEW_REQUIRED", "POTENTIAL_VIOLATION")]
            if review_findings:
                f_title = review_findings[0].get("statutory_title", "declaration")
                checklist_items.append(f"Review AI statutory finding: {f_title}")
                actions.append(CopilotAction(type="OPEN_FINDING", label="Review Findings", target_tab="AI_ANALYSIS"))

            if len(observations) == 0:
                checklist_items.append("Record physical officer observation for net quantity / packaging condition")
                actions.append(CopilotAction(type="OPEN_EVIDENCE", label="Record Observation", target_tab="OBSERVATIONS"))

            if not verification or verification.get("decision") == "REVIEW_REQUIRED":
                checklist_items.append("Confirm visual evidence, AI findings, and physical observations")
                checklist_items.append("Select formal officer decision (Confirm Violation / Override AI / Compliant)")
                checklist_items.append("Complete statutory verification sign-off")
                actions.append(CopilotAction(type="OPEN_VERIFICATION", label="Complete Verification", target_tab="VERIFICATION"))

            if not checklist_items:
                answer = "All statutory review gates are complete. Verification is finalized for this inspection."
            else:
                formatted_list = "\n".join([f"☐ {item}" for item in checklist_items])
                answer = (
                    f"Officer Review Checklist for {product_name} ({inspection_id}):\n\n"
                    f"{formatted_list}\n\n"
                    f"Each checklist item reflects an unresolved statutory condition requiring authorized human verification."
                )

            return CopilotResponse(
                success=True,
                answer=answer,
                sources=[],
                actions=actions,
                grounded=True,
                quality_state="GROUNDED",
                mode="RULE_BASED_DEMO",
            )

        # -------------------------------------------------------------
        # 5. INSPECTION SUMMARY INQUIRY
        # -------------------------------------------------------------
        if any(w in query for w in ["summarize", "summary", "overview", "status of inspection"]):
            img_count = len(images)
            decl_count = len([d for d in declarations.values() if d.get("status") == "detected"])
            finding_count = len(findings)
            review_count = len([f for f in findings if f.get("status") in ("REVIEW_REQUIRED", "POTENTIAL_VIOLATION")])
            conflict_count = len(conflicts)
            obs_count = len(observations)
            ver_status = "Verified" if (verification and verification.get("decision") != "REVIEW_REQUIRED") else "Pending Officer Verification"

            key_items = []
            if conflict_count > 0:
                key_items.append(f"• {conflict_count} cross-panel declaration conflict(s) detected")
            if review_count > 0:
                key_items.append(f"• {review_count} statutory finding(s) require officer review")
            if obs_count == 0:
                key_items.append("• No physical officer observations recorded yet")
            if not key_items:
                key_items.append("• All visual declarations align with statutory thresholds")

            key_text = "\n".join(key_items)

            answer = (
                f"Statutory Inspection Summary for {product_name} ({inspection_id}):\n\n"
                f"• Images Analyzed: {img_count} packaging panels\n"
                f"• Declarations Detected: {decl_count}\n"
                f"• Statutory Findings: {finding_count} ({review_count} review required)\n"
                f"• Conflicts: {conflict_count}\n"
                f"• Officer Observations: {obs_count}\n"
                f"• Verification Status: {ver_status}\n\n"
                f"Key Items Requiring Review:\n{key_text}"
            )

            actions.append(CopilotAction(type="OPEN_FINDING", label="View AI Findings", target_tab="AI_ANALYSIS"))
            actions.append(CopilotAction(type="OPEN_VERIFICATION", label="Verification Gate", target_tab="VERIFICATION"))

            return CopilotResponse(
                success=True,
                answer=answer,
                sources=[],
                actions=actions,
                grounded=True,
                quality_state="GROUNDED",
                mode="RULE_BASED_DEMO",
            )

        # -------------------------------------------------------------
        # 6. EXPLAIN A SPECIFIC FINDING OR RULE
        # -------------------------------------------------------------
        target_finding = context.get("target_finding")
        if not target_finding and findings:
            # Check if query matches any finding title or rule
            for f in findings:
                r_ref = (f.get("rule_reference") or "").lower()
                r_title = (f.get("statutory_title") or "").lower()
                if any(w in query for w in r_ref.split()) or any(w in query for w in r_title.split()):
                    target_finding = f
                    break
            if not target_finding:
                target_finding = findings[0]

        if target_finding:
            f_id = target_finding.get("id", "")
            r_ref = target_finding.get("rule_reference", "Rule 6")
            title = target_finding.get("statutory_title", "Statutory Requirement")
            detected = target_finding.get("what_detected", "Not specified")
            expected = target_finding.get("what_expected", "Statutory compliance")
            reason = target_finding.get("reason", "Review required under Legal Metrology Rules.")
            status = target_finding.get("status", "REVIEW_REQUIRED")

            answer = (
                f"Statutory Finding Analysis: {title} ({r_ref})\n\n"
                f"Why this was raised:\n"
                f"{reason}\n\n"
                f"• What was detected: {detected}\n"
                f"• Statutory expectation: {expected}\n"
                f"• Current status: {status}\n\n"
                f"Officer Action: Verify whether the physical packaging fulfills {r_ref}. "
                f"If the declaration is physically compliant, record an officer observation and justification."
            )

            sources.append(
                CopilotSource(
                    type="FINDING",
                    label=f"{title} ({r_ref})",
                    inspection_id=inspection_id,
                    finding_id=f_id,
                    rule_reference=r_ref,
                )
            )

            # Link relevant image panel if available
            for img in images:
                sources.append(
                    CopilotSource(
                        type="EVIDENCE",
                        label=f"{img.get('panel_type', 'Package')} Panel",
                        inspection_id=inspection_id,
                        image_id=img.get("id"),
                        panel_type=img.get("panel_type"),
                    )
                )
                break

            actions.append(
                CopilotAction(
                    type="OPEN_FINDING",
                    label="View Finding in Workspace",
                    target_id=f_id,
                    target_tab="AI_ANALYSIS",
                )
            )

            return CopilotResponse(
                success=True,
                answer=answer,
                sources=sources,
                actions=actions,
                grounded=True,
                quality_state="GROUNDED",
                mode="RULE_BASED_DEMO",
            )

        # -------------------------------------------------------------
        # 7. DEFAULT EVIDENCE-GROUNDED GUIDANCE
        # -------------------------------------------------------------
        return CopilotResponse(
            success=True,
            answer=(
                f"NIRIKSHAK AI Copilot is active for inspection {inspection_id} ({product_name}).\n\n"
                f"I can help explain:\n"
                f"• Why specific statutory findings were flagged\n"
                f"• Cross-panel declaration conflicts (e.g. MRP discrepancies)\n"
                f"• Declarations that were not reliably detected\n"
                f"• Evidence locations on packaging panels\n"
                f"• An officer review checklist to complete verification"
            ),
            sources=[],
            actions=[
                CopilotAction(type="OPEN_EVIDENCE", label="Inspect Evidence Canvas", target_tab="EVIDENCE"),
                CopilotAction(type="OPEN_FINDING", label="Review AI Findings", target_tab="AI_ANALYSIS"),
            ],
            grounded=True,
            quality_state="GROUNDED",
            mode="RULE_BASED_DEMO",
        )


# Global singleton copilot provider
copilot_provider: BaseCopilotProvider = DeterministicRuleBasedCopilotProvider()
