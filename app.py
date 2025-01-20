import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from werkzeug.utils import secure_filename
from image_processor import ImageProcessor
import io
import cv2
import numpy as np
from PIL import Image
import imghdr
import base64

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__, 
           static_folder='static',  # Set static folder path
           static_url_path='')      # Empty string for root-level static serving
# Security configurations
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = '/tmp'  # Temporary storage
app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30 minutes
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'sight-undercover-secret-key-prod')

# Enable CORS with security settings
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": ["Content-Type"]}})

# Setup rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/faq')
def faq():
    return render_template('faq.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        # Read image file
        img_stream = file.read()
        img_array = np.frombuffer(img_stream, np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'Invalid image file'}), 400

        processor = ImageProcessor(image)
        
        # Get metadata
        pil_image = Image.open(io.BytesIO(img_stream))
        metadata = {
            'format': pil_image.format,
            'size': pil_image.size,
            'mode': pil_image.mode
        }
        
        # Generate all filters
        results = {
            'original': processor.get_base64_image(image),
            'xray': processor.get_base64_image(processor.xray_effect()),
            'sharpen': processor.get_base64_image(processor.sharpen(float(request.form.get('sharpen_intensity', 1.0)))),
            'emboss': processor.get_base64_image(processor.emboss(float(request.form.get('emboss_strength', 1.0)))),
            'saturation': processor.get_base64_image(processor.adjust_saturation(float(request.form.get('saturation_factor', 1.5)))),
            'edges': processor.get_base64_image(processor.edge_detection(
                float(request.form.get('edge_threshold1', 100)),
                float(request.form.get('edge_threshold2', 200))
            )),
            'hue': processor.get_base64_image(processor.adjust_hue(float(request.form.get('hue_shift', 0.5)))),
            'levels': processor.get_base64_image(processor.adjust_levels()),
            'sketch': processor.get_base64_image(processor.sketch_effect()),
            'sepia': processor.get_base64_image(processor.sepia(float(request.form.get('sepia_intensity', 0.5)))),
            'vibrance': processor.get_base64_image(processor.vibrance(float(request.form.get('vibrance_factor', 1.5)))),
            'vignette': processor.get_base64_image(processor.vignette(float(request.form.get('vignette_intensity', 1.0)))),
            'noise_reduction': processor.get_base64_image(processor.noise_reduction(float(request.form.get('noise_reduction_strength', 7))))
        }
        
        return jsonify({
            'success': True,
            'metadata': metadata,
            'filters': results
        })
        
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/download/<filter_name>', methods=['POST'])
def download_image(filter_name):
    json_data = request.get_json()
    if not json_data or 'image_data' not in json_data:
        return jsonify({'error': 'No image data provided'}), 400
        
    try:
        image_data = json_data['image_data']
        # Check if the image_data contains the data URL prefix
        if ',' in image_data:
            image_data = image_data.split(',')[1]
            
        image_bytes = io.BytesIO()
        image_bytes.write(base64.b64decode(image_data))
        image_bytes.seek(0)
        
        return send_file(
            image_bytes,
            mimetype='image/jpeg',
            as_attachment=True,
            download_name=f'filtered_image_{filter_name}.jpg'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    # Production settings
    app.config['TEMPLATES_AUTO_RELOAD'] = False
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # 1 year cache
    app.config['STATIC_FOLDER'] = 'static'  # Explicitly set static folder
    app.config['STATIC_URL_PATH'] = '/static'  # Explicitly set static URL path
    app.run(host='0.0.0.0', port=5000, threaded=True)
