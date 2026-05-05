import os
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io

app = Flask(__name__)
CORS(app)

# Use absolute paths for Vercel compatibility
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_BOLD = os.path.join(BASE_DIR, 'AlegreyaSC-Bold.ttf')
FONT_REGULAR = os.path.join(BASE_DIR, 'Aleo-Regular.ttf')

if os.path.exists(FONT_BOLD):
    pdfmetrics.registerFont(TTFont('AlegreyaSC-Bold', FONT_BOLD))
if os.path.exists(FONT_REGULAR):
    pdfmetrics.registerFont(TTFont('Aleo-Regular', FONT_REGULAR))

TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')

def generate_pdf(name, gender, sr_no, template_name):
    # Gender prefix logic
    if gender.upper() == 'M':
        prefix = "Mr."
    elif gender.upper() == 'F':
        prefix = "Ms."
    else:
        prefix = ""
    
    full_name = f"{prefix} {name}".strip()
    
    # Overlay creation in memory
    packet = io.BytesIO()
    
    # Load template
    template_path = os.path.join(TEMPLATES_DIR, template_name)
    if not os.path.exists(template_path):
        return None
        
    template_pdf = PdfReader(open(template_path, "rb"))
    page = template_pdf.pages[0]
    page_width = float(page.mediabox[2])
    page_height = float(page.mediabox[3])
    
    c = canvas.Canvas(packet, pagesize=(page_width, page_height))
    
    # Name in center (Coordinates from original gemc.py)
    name_y = 300
    srno_x = 120
    srno_y = 390
    
    c.setFont("AlegreyaSC-Bold", 21)
    c.drawCentredString(page_width / 2, name_y, full_name)
    
    c.setFont("Aleo-Regular", 14)
    c.drawString(srno_x, srno_y, f"Sr No : {sr_no}")
    
    c.save()
    packet.seek(0)
    
    # Merge overlay
    new_pdf = PdfReader(packet)
    output = PdfWriter()
    
    page.merge_page(new_pdf.pages[0])
    output.add_page(page)
    
    output_stream = io.BytesIO()
    output.write(output_stream)
    output_stream.seek(0)
    
    return output_stream

@app.route('/_/backend/templates', methods=['GET'])
@app.route('/templates', methods=['GET'])
def list_templates():
    if not os.path.exists(TEMPLATES_DIR):
        return jsonify([])
    files = [f for f in os.listdir(TEMPLATES_DIR) if f.endswith('.pdf')]
    return jsonify(files)

@app.route('/_/backend/generate', methods=['POST'])
@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    name = data.get('name', 'Participant')
    gender = data.get('gender', 'M')
    sr_no = data.get('sr_no', '001')
    template_name = data.get('template', 'gem_training_intro.pdf')
    
    pdf_stream = generate_pdf(name, gender, sr_no, template_name)
    
    if pdf_stream is None:
        return jsonify({"error": f"Template {template_name} not found"}), 404
        
    return send_file(
        pdf_stream,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"{name.replace(' ', '_')}_Certificate.pdf"
    )

if __name__ == '__main__':
    # Ensure templates dir exists
    if not os.path.exists(TEMPLATES_DIR):
        os.makedirs(TEMPLATES_DIR)
    app.run(debug=True, port=5000)

