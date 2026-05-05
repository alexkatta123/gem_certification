import os
import pandas as pd
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from tkinter import Tk, filedialog

# Register fonts
pdfmetrics.registerFont(TTFont('AlegreyaSC-Bold', 'AlegreyaSC-Bold.ttf'))  # Name font
pdfmetrics.registerFont(TTFont('Aleo-Regular', 'Aleo-Regular.ttf'))       # Sr No font

def generate_certificate(template_path, output_path, sr_no, name, gender_code, name_y=300, srno_x=120, srno_y=390):
    """Generate a single certificate with name, gender prefix, and Sr No."""

    # Gender prefix
    prefix = "Mr" if str(gender_code) == "1" else "Mr. "
    full_name = f"{prefix} {name}"

    overlay_path = "overlay.pdf"

    # === Get actual page size from template ===
    template_pdf = PdfReader(open(template_path, "rb"))
    page = template_pdf.pages[0]
    page_width = float(page.mediabox[2])  # width in points
    page_height = float(page.mediabox[3]) # height in points

    # === Create overlay ===
    c = canvas.Canvas(overlay_path, pagesize=(page_width, page_height))

    # Name in center
    c.setFont("AlegreyaSC-Bold", 21)  # Name bold + larger
    c.drawCentredString(page_width / 2, name_y, full_name)

    # Sr No in bold
    c.setFont("Aleo-Regular", 14)
    c.drawString(srno_x, srno_y, f"Sr No : {sr_no}")

    c.save()

    # === Merge overlay with template ===
    writer = PdfWriter()
    overlay_pdf = PdfReader(open(overlay_path, "rb"))

    page.merge_page(overlay_pdf.pages[0])
    writer.add_page(page)

    with open(output_path, "wb") as f:
        writer.write(f)

    # Clean temp
    if os.path.exists(overlay_path):
        try:
            os.remove(overlay_path)
        except PermissionError:
            pass

    print(f"✅ Certificate saved: {output_path}")


def batch_generate(template_file, excel_file, sr_start):
    """Generate certificates for all rows in Excel file."""
    df = pd.read_excel(excel_file)

    sr_no = sr_start
    for _, row in df.iterrows():
        name = str(row["Name"]).strip()
        gender = row["Gender"]

        safe_name = name.replace(" ", "_")
        output_file = f"{safe_name}.pdf"

        generate_certificate(template_file, output_file, sr_no, name, gender)
        sr_no += 1


if __name__ == "__main__":
    Tk().withdraw()

    # Select template PDF
    template_file = filedialog.askopenfilename(
        title="Select Certificate Template PDF",
        filetypes=[("PDF Files", "*.pdf")]
    )
    if not template_file:
        print("❌ No template selected, exiting.")
        exit()

    # Select Excel file
    excel_file = filedialog.askopenfilename(
        title="Select Excel File",
        filetypes=[("Excel Files", "*.xlsx;*.xls")]
    )
    if not excel_file:
        print("❌ No Excel file selected, exiting.")
        exit()

    # Starting Sr No
    sr_start = int(input("Enter starting Sr No: "))

    batch_generate(template_file, excel_file, sr_start)
