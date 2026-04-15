"""
pdf_generator.py
----------------
Generate downloadable PDF reports from analysis results.
"""

import os
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def generate_pdf_report(analysis_data, validation_data, output_path):
    """
    Generate a comprehensive PDF report from analysis and validation data.
    
    Args:
        analysis_data: Dict containing the analysis results
        validation_data: Dict containing doctor's validation and notes
        output_path: Path where the PDF should be saved
    
    Returns:
        str: Path to the generated PDF file
    """
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2DD4BF'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#2DD4BF'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    # Title
    story.append(Paragraph("NeuroLens Medical Report", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Report metadata
    report_date = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    story.append(Paragraph(f"<b>Report Generated:</b> {report_date}", styles['Normal']))
    story.append(Paragraph(f"<b>Report ID:</b> {validation_data.get('report_id', 'N/A')}", styles['Normal']))
    story.append(Paragraph(f"<b>Validated By:</b> Dr. {validation_data.get('doctor_name', 'N/A')}", styles['Normal']))
    story.append(Paragraph(f"<b>License:</b> {validation_data.get('doctor_license', 'N/A')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Patient Information (if provided)
    if validation_data.get('patient_info'):
        story.append(Paragraph("Patient Information", heading_style))
        patient_info = validation_data['patient_info']
        patient_data = [
            ['Patient ID:', patient_info.get('patient_id', 'N/A')],
            ['Age:', patient_info.get('age', 'N/A')],
            ['Gender:', patient_info.get('gender', 'N/A')],
        ]
        patient_table = Table(patient_data, colWidths=[2*inch, 4*inch])
        patient_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F3F4F6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(patient_table)
        story.append(Spacer(1, 0.2*inch))
    
    # Clinical Summary
    story.append(Paragraph("Clinical Summary", heading_style))
    summary = analysis_data.get('summary', {})
    summary_data = [
        ['Region:', summary.get('region', 'N/A')],
        ['Volume:', summary.get('volume', 'N/A')],
        ['Dimensions:', summary.get('dimensions', 'N/A')],
        ['Laterality:', summary.get('laterality', 'N/A')],
        ['Depth from Surface:', summary.get('depth', 'N/A')],
        ['Risk Level:', summary.get('risk_level', 'N/A')],
    ]
    summary_table = Table(summary_data, colWidths=[2*inch, 4*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F3F4F6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Detailed Metrics
    story.append(Paragraph("Detailed Clinical Metrics", heading_style))
    metrics = analysis_data.get('metrics', {})
    metrics_data = [
        ['Tumor Volume (cm³):', str(metrics.get('tumor_volume_cm3', 'N/A'))],
        ['Region Function:', metrics.get('region_function', 'N/A')],
        ['Midline Distance (mm):', str(metrics.get('midline_distance_mm', 'N/A'))],
        ['Centroid (voxel):', str(metrics.get('centroid_voxel', 'N/A'))],
    ]
    metrics_table = Table(metrics_data, colWidths=[2.5*inch, 3.5*inch])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F3F4F6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Risk Factors
    risk_factors = metrics.get('risk_factors', [])
    if risk_factors:
        story.append(Paragraph("Risk Factors", heading_style))
        for factor in risk_factors:
            story.append(Paragraph(f"• {factor}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Surgery Recommendations
    if validation_data.get('surgery_recommendations'):
        story.append(Paragraph("Recommended Surgical Approaches", heading_style))
        for rec in validation_data['surgery_recommendations']:
            story.append(Paragraph(f"<b>{rec['name']}</b>", styles['Normal']))
            story.append(Paragraph(f"Suitability: {rec['suitability_score']}/10", styles['Normal']))
            story.append(Paragraph(f"Rationale: {rec['rationale']}", styles['Normal']))
            story.append(Spacer(1, 0.1*inch))
        story.append(Spacer(1, 0.2*inch))
    
    # Doctor's Validation Notes
    story.append(Paragraph("Doctor's Assessment", heading_style))
    story.append(Paragraph(f"<b>Status:</b> {validation_data.get('status', 'N/A')}", styles['Normal']))
    story.append(Paragraph(f"<b>Validation Date:</b> {validation_data.get('validation_date', 'N/A')}", styles['Normal']))
    story.append(Spacer(1, 0.1*inch))
    
    if validation_data.get('doctor_notes'):
        story.append(Paragraph("<b>Clinical Notes:</b>", styles['Normal']))
        story.append(Paragraph(validation_data['doctor_notes'], styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    # Clinical Reasoning
    story.append(PageBreak())
    story.append(Paragraph("Clinical Reasoning Process", heading_style))
    reasoning = analysis_data.get('reasoning', [])
    for step in reasoning:
        story.append(Paragraph(
            f"<b>Step {step.get('step', 'N/A')}: {step.get('title', 'N/A')}</b> "
            f"(Confidence: {step.get('confidence', 'N/A')})",
            styles['Normal']
        ))
        story.append(Paragraph(step.get('detail', 'N/A'), styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
    
    # Disclaimer
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Medical Disclaimer", heading_style))
    disclaimer_text = """
    This report is generated by NeuroLens AI-assisted analysis system and has been reviewed 
    by a licensed medical professional. This report is intended for clinical decision support 
    and should be used in conjunction with other diagnostic information and clinical judgment. 
    Final treatment decisions should be made by qualified healthcare professionals in consultation 
    with the patient.
    """
    story.append(Paragraph(disclaimer_text, styles['Normal']))
    
    # Build PDF
    doc.build(story)
    return output_path
