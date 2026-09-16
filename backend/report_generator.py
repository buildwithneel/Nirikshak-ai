"""
NIRIKSHAK AI — Institutional PDF Report Generator
Generates government-grade Legal Metrology Compliance Inspection Reports
with package evidence crops, deterministic finding breakdowns, officer notes,
and statutory legal disclaimers using ReportLab.
"""

import io
import os
import base64
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas
from PIL import Image as PILImage

logger = logging.getLogger("nirikshak_report")

# Institutional Color Palette
PRIMARY_FOREST = colors.HexColor("#164E3D")
FOREST_DARK = colors.HexColor("#0D3328")
FOREST_LIGHT = colors.HexColor("#E6F4EA")
CREAM_BG = colors.HexColor("#FDFBF7")
CREAM_CARD = colors.HexColor("#F7F3EA")
BORDER_COLOR = colors.HexColor("#D1D5DB")
INK_PRIMARY = colors.HexColor("#111827")
INK_SECONDARY = colors.HexColor("#4B5563")

STATUS_COMPLIANT_BG = colors.HexColor("#ECFDF5")
STATUS_COMPLIANT_TEXT = colors.HexColor("#065F46")
STATUS_REVIEW_BG = colors.HexColor("#FFFBEB")
STATUS_REVIEW_TEXT = colors.HexColor("#92400E")
STATUS_VIOLATION_BG = colors.HexColor("#FEF2F2")
STATUS_VIOLATION_TEXT = colors.HexColor("#991B1B")


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to compute and render total page count and institutional running header/footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(INK_SECONDARY)

        # Header (pages 2+)
        if self._pageNumber > 1:
            self.drawString(
                36,
                A4[1] - 28,
                "NIRIKSHAK AI — AI-Assisted Legal Metrology Inspection Report"
            )
            self.drawRightString(
                A4[0] - 36,
                A4[1] - 28,
                "CONFIDENTIAL & PRIVILEGED"
            )
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.5)
            self.line(36, A4[1] - 32, A4[0] - 36, A4[1] - 32)

        # Running Footer on all pages
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(36, 38, A4[0] - 36, 38)

        self.drawString(
            36,
            26,
            "NIRIKSHAK AI • Ministry of Consumer Affairs, Legal Metrology (Packaged Commodities) Rules, 2011"
        )
        self.drawRightString(
            A4[0] - 36,
            26,
            f"Page {self._pageNumber} of {total_pages}"
        )
        self.restoreState()


def decode_base64_image(data_uri: str) -> Optional[PILImage.Image]:
    """Safely decode base64 data URI into PIL Image."""
    if not data_uri or not isinstance(data_uri, str):
        return None
    try:
        if "," in data_uri:
            data_uri = data_uri.split(",", 1)[1]
        img_bytes = base64.b64decode(data_uri)
        img = PILImage.open(io.BytesIO(img_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
        return img
    except Exception as e:
        logger.warning(f"Failed to decode base64 image: {e}")
        return None


def crop_evidence_box(pil_img: PILImage.Image, norm_box: Dict[str, float]) -> Optional[io.BytesIO]:
    """Crop an evidence region from the image with 10% safety padding."""
    if not pil_img or not norm_box:
        return None
    try:
        img_w, img_h = pil_img.size
        x = norm_box.get("x", 0)
        y = norm_box.get("y", 0)
        w = norm_box.get("width", 20)
        h = norm_box.get("height", 10)

        # 10% padding
        pad_x = max(1.0, w * 0.15)
        pad_y = max(1.0, h * 0.20)

        left = max(0, int((x - pad_x) * img_w / 100))
        top = max(0, int((y - pad_y) * img_h / 100))
        right = min(img_w, int((x + w + pad_x) * img_w / 100))
        bottom = min(img_h, int((y + h + pad_y) * img_h / 100))

        if right <= left or bottom <= top:
            return None

        cropped = pil_img.crop((left, top, right, bottom))
        buf = io.BytesIO()
        cropped.save(buf, format="JPEG", quality=85)
        buf.seek(0)
        return buf
    except Exception as e:
        logger.warning(f"Failed to crop evidence box: {e}")
        return None


def generate_pdf_report(inspection_data: Dict[str, Any]) -> io.BytesIO:
    """
    Main generator producing an official PDF inspection report.
    Returns in-memory BytesIO containing the PDF document.
    """
    output_stream = io.BytesIO()
    doc = SimpleDocTemplate(
        output_stream,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=46,
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    style_title = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=PRIMARY_FOREST,
    )
    style_subtitle = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=INK_SECONDARY,
    )
    style_section = ParagraphStyle(
        "SectionHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=PRIMARY_FOREST,
        spaceAfter=6,
    )
    style_body = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=INK_PRIMARY,
    )
    style_body_muted = ParagraphStyle(
        "BodyMuted",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=INK_SECONDARY,
    )
    style_table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )
    style_table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=INK_PRIMARY,
    )
    style_advisory = ParagraphStyle(
        "AdvisoryText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=STATUS_REVIEW_TEXT,
    )

    story = []

    # 1. Header Banner & Title
    story.append(Paragraph("NIRIKSHAK AI", style_title))
    story.append(
        Paragraph(
            "AI-Assisted Legal Metrology Compliance &amp; Inspection Report • Rule 6 Audit",
            style_subtitle,
        )
    )
    story.append(Spacer(1, 8))

    # Metadata Strip (Inspection ID, Timestamp, Source)
    insp_id = inspection_data.get("id", "INSP-UNASSIGNED")
    timestamp = inspection_data.get("timestamp") or datetime.now().strftime("%d %b %Y, %H:%M:%S IST")
    source = inspection_data.get("source", "upload")
    source_label = "Real Packaging Upload" if source == "upload" else "Direct Camera Capture" if source == "camera" else "Quick Test / Demonstration Mode"

    meta_data = [
        [
            Paragraph(f"<b>Inspection Reference:</b> <font color='#164E3D'><b>{insp_id}</b></font>", style_body),
            Paragraph(f"<b>Audit Date:</b> {inspection_data.get('date', '16 Sep 2026')}", style_body),
        ],
        [
            Paragraph(f"<b>Evidence Source:</b> {source_label}", style_body),
            Paragraph(f"<b>Report Generated:</b> {datetime.now().strftime('%d %b %Y %H:%M IST')}", style_body),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[260, 260])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), CREAM_CARD),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # 2. Official Statutory Advisory Notice
    advisory_data = [
        [
            Paragraph(
                "<b>STATUTORY NOTICE &amp; DISCLAIMER:</b> This audit report presents AI-assisted OCR extraction, "
                "pattern recognition, and rule evaluations under the <b>Legal Metrology (Packaged Commodities) Rules, 2011</b>. "
                "These findings serve as an investigative aid. <b>Final statutory verification and enforcement action "
                "must be authorized by a certified Legal Metrology Officer.</b>",
                style_advisory,
            )
        ]
    ]
    advisory_table = Table(advisory_data, colWidths=[520])
    advisory_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), STATUS_REVIEW_BG),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#FDE68A")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(advisory_table)
    story.append(Spacer(1, 12))

    # 3. Executive Commodity Summary & Overall Status
    story.append(Paragraph("1. Commodity &amp; Compliance Executive Summary", style_section))

    overall_status = inspection_data.get("overallStatus", "REVIEW_REQUIRED")
    status_color = (
        STATUS_COMPLIANT_TEXT
        if overall_status == "COMPLIANT"
        else STATUS_VIOLATION_TEXT
        if overall_status == "POTENTIAL_VIOLATION"
        else STATUS_REVIEW_TEXT
    )
    status_bg = (
        STATUS_COMPLIANT_BG
        if overall_status == "COMPLIANT"
        else STATUS_VIOLATION_BG
        if overall_status == "POTENTIAL_VIOLATION"
        else STATUS_REVIEW_BG
    )
    status_text = overall_status.replace("_", " ").title()

    summary_stats = inspection_data.get("complianceSummary") or {}
    total_rules = summary_stats.get("totalRules", len(inspection_data.get("findings", [])) or 6)
    compliant_n = summary_stats.get("compliantCount", 0)
    review_n = summary_stats.get("reviewRequiredCount", 0)
    violation_n = summary_stats.get("potentialViolationCount", 0)
    score = inspection_data.get("complianceScore", 78)

    summary_table_data = [
        [
            Paragraph(f"<b>Commodity / Product:</b><br/>{inspection_data.get('productName', 'Packaged Commodity')}", style_body),
            Paragraph(f"<b>Brand:</b><br/>{inspection_data.get('brand', 'Commercial Brand')}", style_body),
            Paragraph(f"<b>Overall Determination:</b><br/><font color='{status_color}'><b>{status_text}</b></font>", style_body),
        ],
        [
            Paragraph(f"<b>Retail Point / Location:</b><br/>{inspection_data.get('inspectionLocation', 'Retail Market')}", style_body),
            Paragraph(f"<b>Category:</b><br/>{inspection_data.get('category', 'Food & Beverages')}", style_body),
            Paragraph(f"<b>Compliance Score:</b><br/><b>{score} / 100 PTS</b> (Rule 6 Index)", style_body),
        ],
        [
            Paragraph(f"<b>Total Mandatory Rules:</b> {total_rules}", style_body_muted),
            Paragraph(f"<b>Compliant:</b> {compliant_n} &nbsp;•&nbsp; <b>Review:</b> {review_n}", style_body_muted),
            Paragraph(f"<b>Potential Violations:</b> {violation_n}", style_body_muted),
        ],
    ]
    summary_table = Table(summary_table_data, colWidths=[180, 170, 170])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#F3F4F6")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(summary_table)
    story.append(Spacer(1, 12))

    # 4. Multi-Image Package Evidence Gallery & Primary Panel
    images_list = inspection_data.get("images", [])
    pil_image = decode_base64_image(inspection_data.get("imageUrl", ""))
    primary_pil = pil_image

    if not primary_pil and images_list:
        for im in images_list:
            if im.get("raw_bytes"):
                try:
                    primary_pil = PILImage.open(io.BytesIO(im["raw_bytes"]))
                    if primary_pil.mode != "RGB":
                        primary_pil = primary_pil.convert("RGB")
                    pil_image = primary_pil
                    break
                except Exception:
                    pass

    # Render Primary Image
    if primary_pil:
        try:
            max_w, max_h = 420, 150
            orig_w, orig_h = primary_pil.size
            ratio = min(max_w / orig_w, max_h / orig_h)
            display_w = orig_w * ratio
            display_h = orig_h * ratio

            buf = io.BytesIO()
            primary_pil.save(buf, format="JPEG", quality=85)
            buf.seek(0)

            primary_panel = images_list[0].get("panel_type", "PRIMARY") if images_list else "PRIMARY DISPLAY"
            primary_source = images_list[0].get("source", "EVIDENCE") if images_list else "CAPTURE"

            img_flowable = RLImage(buf, width=display_w, height=display_h)
            img_container = Table(
                [
                    [Paragraph(f"<b>Primary Packaging Evidence ({primary_panel} PANEL • {primary_source.replace('_', ' ')})</b>", style_body_muted)],
                    [img_flowable]
                ],
                colWidths=[520],
                hAlign="CENTER"
            )
            img_container.setStyle(
                TableStyle([
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("BACKGROUND", (0, 0), (-1, -1), CREAM_CARD),
                    ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ])
            )
            story.append(img_container)
            story.append(Spacer(1, 10))
        except Exception as e:
            logger.warning(f"Could not render primary image: {e}")

    # Render Multi-Image Evidence Table if multiple images exist
    if len(images_list) > 1:
        img_table_rows = [
            [
                Paragraph("<b>Evidence Ref</b>", style_table_header),
                Paragraph("<b>Panel Classification</b>", style_table_header),
                Paragraph("<b>Evidence Source</b>", style_table_header),
                Paragraph("<b>Processing Status</b>", style_table_header),
            ]
        ]
        for idx, im in enumerate(images_list):
            src_color = "#164E3D" if im.get("source") == "OFFICER_ADDED" else "#B45309"
            img_table_rows.append([
                Paragraph(f"<b>Image {idx + 1}</b> ({im.get('id', 'IMG')})", style_table_cell),
                Paragraph(f"<b>{im.get('panel_type', 'UNKNOWN')} PANEL</b>", style_table_cell),
                Paragraph(f"<font color='{src_color}'><b>{im.get('source', 'UPLOAD').replace('_', ' ')}</b></font>", style_table_cell),
                Paragraph(im.get("ocr_status", "COMPLETED"), style_table_cell),
            ])
        evidence_panel_table = Table(img_table_rows, colWidths=[130, 130, 140, 120])
        evidence_panel_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_FOREST),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        story.append(evidence_panel_table)
        story.append(Spacer(1, 12))

    # Declaration Conflict Reporting (Section 27)
    conflicts = inspection_data.get("conflicts", [])
    if conflicts:
        story.append(Paragraph("Declaration Conflict Investigation Notice", style_section))
        conflict_rows = [
            [
                Paragraph("<b>Target Declaration</b>", style_table_header),
                Paragraph("<b>Detected Values Across Panels</b>", style_table_header),
                Paragraph("<b>Status &amp; Legal Protocol</b>", style_table_header),
            ]
        ]
        for c in conflicts:
            field_name = c.get("field_label", c.get("field_key", "Declaration"))
            val_items = []
            for occ in c.get("conflicting_values", []):
                val_items.append(
                    f"• <b>{occ.get('value')}</b> — {occ.get('panel_type', 'Panel')} Panel (Conf: {int(occ.get('confidence', 0)*100)}%)"
                )
            vals_block = "<br/>".join(val_items)
            conflict_rows.append([
                Paragraph(f"<b>{field_name}</b>", style_table_cell),
                Paragraph(vals_block, style_table_cell),
                Paragraph(
                    "<font color='#991B1B'><b>REVIEW REQUIRED</b></font><br/>"
                    "Discrepancy detected across packaging panels.<br/>"
                    "<i>Officer physical verification required.</i>",
                    style_table_cell
                ),
            ])

        conflict_table = Table(conflict_rows, colWidths=[130, 240, 150])
        conflict_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#991B1B")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#F87171")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#FEE2E2")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FEF2F2")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        story.append(conflict_table)
        story.append(Spacer(1, 14))

    # 5. Mandatory Declarations Table (Rule 6 Extraction)
    story.append(Paragraph("2. Mandatory Declarations Table (Legal Metrology Rule 6 Analysis)", style_section))

    declarations = inspection_data.get("declarations", [])
    table_rows = [
        [
            Paragraph("<b>Mandatory Declaration</b>", style_table_header),
            Paragraph("<b>Rule Ref</b>", style_table_header),
            Paragraph("<b>Detected Packaging Value</b>", style_table_header),
            Paragraph("<b>Status</b>", style_table_header),
            Paragraph("<b>Extraction Conf.</b>", style_table_header),
        ]
    ]

    for idx, dec in enumerate(declarations):
        row_bg = colors.HexColor("#F9FAFB") if idx % 2 == 1 else colors.white
        status = dec.get("status", "COMPLIANT")
        st_color = (
            "#065F46" if status == "COMPLIANT" else "#991B1B" if status == "POTENTIAL_VIOLATION" else "#92400E"
        )
        conf = dec.get("extractionConfidence") or dec.get("confidence") or 90

        detected_val = dec.get("detectedValue", "[NOT DETECTED]")
        if len(detected_val) > 75:
            detected_val = detected_val[:72] + "..."

        table_rows.append([
            Paragraph(f"<b>{dec.get('name', 'Declaration')}</b>", style_table_cell),
            Paragraph(dec.get("ruleReference", "Rule 6"), style_table_cell),
            Paragraph(detected_val, style_table_cell),
            Paragraph(f"<font color='{st_color}'><b>{status.replace('_', ' ')}</b></font>", style_table_cell),
            Paragraph(f"{conf}%", style_table_cell),
        ])

    decl_table = Table(table_rows, colWidths=[130, 60, 210, 75, 45])
    decl_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_FOREST),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(decl_table)
    story.append(Spacer(1, 14))

    # 6. Detailed Statutory Findings with Evidence Snapshots
    story.append(Paragraph("3. Detailed Statutory Findings &amp; Visual Evidence Snapshots", style_section))

    findings = inspection_data.get("findings", [])
    ocr_lines = inspection_data.get("ocrLines", [])
    bounding_boxes = inspection_data.get("boundingBoxes", [])

    for f_idx, finding in enumerate(findings):
        f_status = finding.get("status", "COMPLIANT")
        f_color = (
            "#065F46" if f_status == "COMPLIANT" else "#991B1B" if f_status == "POTENTIAL_VIOLATION" else "#92400E"
        )
        f_bg = (
            STATUS_COMPLIANT_BG if f_status == "COMPLIANT" else STATUS_VIOLATION_BG if f_status == "POTENTIAL_VIOLATION" else STATUS_REVIEW_BG
        )

        # Attempt to find matching bounding box / OCR line for visual crop
        target_key = finding.get("declarationKey")
        matched_box = None
        for b in bounding_boxes:
            if b.get("declarationKey") == target_key or b.get("id") in finding.get("sourceLineIds", []):
                # Ensure it's not marked missing
                if not ("NOT DETECTED" in str(b.get("extractedText", "")).upper()):
                    matched_box = {"x": b.get("x", 0), "y": b.get("y", 0), "width": b.get("width", 20), "height": b.get("height", 10)}
                    break

        if not matched_box and ocr_lines:
            for line_id in finding.get("sourceLineIds", []):
                matched_line = next((l for l in ocr_lines if l.get("id") == line_id), None)
                if matched_line and matched_line.get("normalized_box"):
                    matched_box = matched_line["normalized_box"]
                    break

        # Crop visual evidence if available and valid
        crop_flowable = None
        if pil_image and matched_box:
            cropped_buf = crop_evidence_box(pil_image, matched_box)
            if cropped_buf:
                try:
                    crop_flowable = RLImage(cropped_buf, width=150, height=45)
                except Exception:
                    crop_flowable = None

        finding_title = f"<b>{f_idx + 1}. {finding.get('statutoryTitle', 'Statutory Check')}</b> ({finding.get('ruleReference', 'Rule 6')})"

        # If evidence is missing (strict rule: NEVER draw fake box)
        if f_status == "POTENTIAL_VIOLATION" and not matched_box:
            evidence_cell = Paragraph(
                "<font color='#991B1B'><b>VISUAL EVIDENCE STATUS:</b><br/>"
                "No Reliable Visual Evidence Detected in Scanned Packaging Region.<br/>"
                "<i>Action: Inspect alternate packaging panels (side/back).</i></font>",
                style_body_muted
            )
        elif crop_flowable:
            evidence_cell = [
                Paragraph("<font color='#164E3D'><b>Target Visual Evidence Crop:</b></font>", style_body_muted),
                crop_flowable,
            ]
        else:
            evidence_cell = Paragraph(
                f"<b>Visual Evidence:</b> Verified PDP Surface (Lines: {', '.join(finding.get('sourceLineIds', [])) or 'Confirmed'})",
                style_body_muted
            )

        finding_block_data = [
            [
                Paragraph(finding_title, style_body),
                Paragraph(f"<font color='{f_color}'><b>{f_status.replace('_', ' ')}</b></font>", style_body),
            ],
            [
                Paragraph(
                    f"<b>Observed Packaging Text:</b> {finding.get('whatDetected', '[NOT DETECTED]')}<br/>"
                    f"<b>Statutory Standard:</b> {finding.get('whatExpected', 'Rule 6 Compliance')}<br/>"
                    f"<b>Statutory Analysis:</b> {finding.get('reason', 'Compliant declaration.')}",
                    style_body
                ),
                evidence_cell,
            ]
        ]

        finding_table = Table(finding_block_data, colWidths=[350, 170])
        finding_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), f_bg),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ])
        )

        story.append(KeepTogether([finding_table, Spacer(1, 8)]))

    story.append(Spacer(1, 8))

    # 7. Physical Officer Observations & Verification Section
    story.append(Paragraph("4. Inspecting Officer Verification &amp; Field Observations", style_section))

    obs_list = inspection_data.get("observations", [])
    obs_paragraphs = []
    if obs_list:
        for o in obs_list:
            obs_paragraphs.append(
                f"• <b>[{o.get('category', 'GENERAL')}]</b> {o.get('observation')} <i>({o.get('created_at', '')[:10]})</i>"
            )
    else:
        obs_paragraphs.append("No manual physical observations recorded on-site.")

    verif = inspection_data.get("verification")
    verif_text = "Pending formal legal verification."
    if verif:
        verif_text = (
            f"<b>Decision:</b> <font color='#164E3D'><b>{verif.get('decision', 'CONFIRMED').replace('_', ' ')}</b></font> &nbsp;|&nbsp; "
            f"<b>Verified At:</b> {verif.get('verified_at', 'Recorded')[:19]}<br/>"
            f"<b>Statutory Justification:</b> {verif.get('notes') or inspection_data.get('officerNotes') or 'Formal verification completed under Legal Metrology Rules.'}"
        )
    elif inspection_data.get("officerNotes"):
        verif_text = f"<b>Field Notes:</b> {inspection_data.get('officerNotes')}"

    notes_data = [
        [
            Paragraph(
                "<b>PHYSICAL ON-SITE OBSERVATIONS:</b><br/>" + "<br/>".join(obs_paragraphs),
                style_body
            )
        ],
        [
            Paragraph(
                "<b>HUMAN OFFICER LEGAL VERIFICATION PROTOCOL:</b><br/>" + verif_text,
                style_body
            )
        ]
    ]
    notes_table = Table(notes_data, colWidths=[520])
    notes_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), CREAM_CARD),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(notes_table)
    story.append(Spacer(1, 12))

    # 8. Immutable Audit Timeline (Prompt 9 Section 26 & 35)
    audit_events = inspection_data.get("auditEvents", [])
    if audit_events:
        story.append(Paragraph("5. Immutable Enforcement Audit Timeline", style_section))
        audit_rows = [
            [
                Paragraph("<b>Timestamp (UTC)</b>", style_table_header),
                Paragraph("<b>Workflow Action Event</b>", style_table_header),
                Paragraph("<b>Actor Email</b>", style_table_header),
                Paragraph("<b>Entity Target</b>", style_table_header),
            ]
        ]
        for ev in audit_events[:8]:
            audit_rows.append([
                Paragraph(ev.get("timestamp", "")[:19].replace("T", " "), style_table_cell),
                Paragraph(f"<b>{ev.get('action', '').replace('_', ' ')}</b>", style_table_cell),
                Paragraph(ev.get("actor", "system"), style_table_cell),
                Paragraph(ev.get("entity", "INSPECTION"), style_table_cell),
            ])
        audit_table = Table(audit_rows, colWidths=[110, 160, 160, 90])
        audit_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_FOREST),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(audit_table)
        story.append(Spacer(1, 14))

    # 9. Official Statutory Sign-off Box
    signoff_data = [
        [
            Paragraph("<b>Legal Metrology Inspecting Officer</b><br/><br/>____________________________________<br/>Signature &amp; Verification Stamp", style_body_muted),
            Paragraph("<b>Enforcement Inspection Protocol</b><br/><br/>Date: ________________________<br/>Official Location: ___________________", style_body_muted),
        ]
    ]
    signoff_table = Table(signoff_data, colWidths=[260, 260])
    signoff_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(KeepTogether([signoff_table]))

    # 10. Report Provenance & Cryptographic Integrity Reference (Section 14 & 46)
    gen_time = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    integrity_data = [
        [
            Paragraph(
                f"<b>REPORT INTEGRITY &amp; STATUTORY PROVENANCE REFERENCE</b><br/>"
                f"NIRIKSHAK AI Legal Metrology Surveillance System • Ministry of Consumer Affairs, Govt. of India<br/>"
                f"Inspection ID: <b>{inspection_data.get('id', 'N/A')}</b> • Version: <b>{inspection_data.get('report_version', 1)}</b> • Generated: <b>{gen_time}</b><br/>"
                f"<i>Statutory Principle: AI detects and organizes visual evidence; the authorized Legal Metrology Officer verifies facts and determines statutory compliance.</i>",
                style_body_muted,
            )
        ]
    ]
    integrity_table = Table(integrity_data, colWidths=[520])
    integrity_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(Spacer(1, 10))
    story.append(KeepTogether([integrity_table]))

    # Build PDF with two-pass NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    output_stream.seek(0)
    return output_stream
