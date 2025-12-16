from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from models import Database
import utils

app = Flask(__name__)
CORS(app)

# Configuration
DATA_DIR = os.environ.get('DATA_DIR', './data')
DB_PATH = os.environ.get('DB_PATH', './database/gamesaves.db')
STATIC_FOLDER = os.environ.get('STATIC_FOLDER', '../frontend/dist')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='/')
db = Database(DB_PATH)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "version": "1.0.0"})

@app.route('/api/saves', methods=['GET'])
def get_saves():
    saves = db.get_all_saves()
    # Enhance specific formatting if needed
    for save in saves:
        if save.get('file_size'):
             save['formatted_size'] = utils.format_file_size(save['file_size'])
    return jsonify(saves)

@app.route('/api/saves', methods=['POST'])
def create_save():
    """Create a new game entry (Container for versions)"""
    data = request.form
    game_name = data.get('game_name')
    platform = data.get('platform')
    
    if not game_name:
        return jsonify({"error": "Game name required"}), 400

    existing = [s for s in db.get_all_saves() if s['game_name'] == game_name]
    if existing:
        return jsonify({"error": "Game already exists"}), 409

    save_id = db.create_savedata(game_name, platform)
    
    # If file uploaded immediately
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename:
            # Create version 1
            filename = utils.generate_version_filename(save_id, game_name, 1)
            save_path = os.path.join(DATA_DIR, filename)
            file.save(save_path)
            
            size = utils.get_file_size(save_path)
            db.add_version(save_id, filename, size, "Initial Upload")

    return jsonify({"success": True, "id": save_id})

@app.route('/api/saves/<int:save_id>', methods=['GET'])
def get_save_details(save_id):
    save = db.get_savedata_by_id(save_id)
    if not save:
        return jsonify({"error": "Not found"}), 404
    
    versions = db.get_versions(save_id)
    # Format versions
    for v in versions:
        if v['file_size']:
             v['formatted_size'] = utils.format_file_size(v['file_size'])
             v['created_at_formatted'] = utils.get_time_ago(v['created_at'])

    return jsonify({"save": save, "versions": versions})

@app.route('/api/saves/<int:save_id>/upload', methods=['POST'])
def upload_version(save_id):
    """Upload a new version for existing save"""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    notes = request.form.get('notes', '')
    
    save = db.get_savedata_by_id(save_id)
    if not save:
        return jsonify({"error": "Save not found"}), 404

    versions = db.get_versions(save_id)
    next_ver = 1
    if versions:
        next_ver = versions[0]['version_number'] + 1

    filename = utils.generate_version_filename(save_id, save['game_name'], next_ver)
    destination = os.path.join(DATA_DIR, filename)
    
    file.save(destination)
    size = utils.get_file_size(destination)
    
    db.add_version(save_id, filename, size, notes)
    return jsonify({"success": True})

@app.route('/api/saves/<int:save_id>', methods=['PUT'])
def update_save(save_id):
    data = request.json
    save = db.get_savedata_by_id(save_id)
    if not save:
        return jsonify({"error": "Not found"}), 404

    new_name = data.get('game_name')
    new_platform = data.get('platform')
    
    # Platform Update
    if new_platform:
        db.update_savedata_platform(save_id, new_platform)

    # Rename Protocol
    if new_name and new_name != save['game_name']:
        print(f"Renaming {save['game_name']} -> {new_name}")
        
        versions = db.get_versions(save_id)
        errors = []
        for v in versions:
            old_filename = v['file_path']
            _, ext = os.path.splitext(old_filename)
            new_filename = utils.generate_version_filename(save_id, new_name, v['version_number'], ext)
            
            success, msg = utils.rename_physical_file(DATA_DIR, old_filename, new_filename)
            if success:
                db.update_version_path(v['id'], new_filename)
            else:
                errors.append(f"Ver {v['version_number']}: {msg}")
        
        if errors:
            print("Errors during file rename:", errors)
            
        db.rename_savedata(save_id, new_name)

    return jsonify({"success": True})

@app.route('/api/versions/<int:version_id>', methods=['PUT'])
def update_version(version_id):
    data = request.json
    if not data or 'note' not in data:
        return jsonify({'error': 'No note provided'}), 400
    
    db.update_version_note(version_id, data['note'])
    return jsonify({'message': 'Note updated successfully'})

@app.route('/api/saves/<int:save_id>/download', methods=['GET'])
def download_latest(save_id):
    versions = db.get_versions(save_id)
    if not versions:
        return jsonify({"error": "No versions"}), 404
    
    latest = versions[0]
    return send_from_directory(DATA_DIR, latest['file_path'], as_attachment=True)

@app.route('/api/versions/<int:version_id>/download', methods=['GET'])
def download_version(version_id):
    v = db.get_version(version_id)
    if not v:
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(DATA_DIR, v['file_path'], as_attachment=True)

@app.route('/api/saves/<int:save_id>', methods=['DELETE'])
def delete_save(save_id):
    versions = db.get_versions(save_id)
    for v in versions:
        path = os.path.join(DATA_DIR, v['file_path'])
        utils.safe_delete_file(path)
    
    db.delete_savedata(save_id)
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
