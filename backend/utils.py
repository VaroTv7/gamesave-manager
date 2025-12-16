import os
import shutil
import zipfile
import hashlib
from pathlib import Path
from werkzeug.utils import secure_filename

def calculate_checksum(file_path):
    """Calculate SHA256 checksum of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def get_file_size(file_path):
    """Get file size in bytes"""
    if os.path.isfile(file_path):
        return os.path.getsize(file_path)
    return 0

def format_file_size(size_bytes):
    """Format bytes to human-readable size"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} PB"

def generate_version_filename(save_id, game_name, version_num, original_ext='.zip'):
    """Generate standardized filename: {ID}_{SafeName}_v{Num}.zip"""
    safe_name = secure_filename(game_name)
    return f"{save_id}_{safe_name}_v{version_num}{original_ext}"

def rename_physical_file(base_dir, old_rel_path, new_rel_path):
    """
    Rename a file on disk.
    base_dir: Root data directory
    old_rel_path: Relative path from DB (e.g. 1_Zelda_v1.zip)
    new_rel_path: New relative path (e.g. 1_Link_v1.zip)
    """
    old_full = os.path.join(base_dir, old_rel_path)
    new_full = os.path.join(base_dir, new_rel_path)

    if not os.path.exists(old_full):
        return False, "Original file not found"
    
    try:
        os.rename(old_full, new_full)
        return True, "OK"
    except OSError as e:
        return False, str(e)

def get_time_ago(dt):
    """Convert datetime object to human readable string"""
    if not dt:
        return ""
    # Simplified for backend use, frontend usually handles this better with libraries
    # But we return string for API
    now = datetime.now()
    # Assuming dt is naive or local
    diff = now - datetime.strptime(dt, '%Y-%m-%d %H:%M:%S') 
    # This part depends on how sqlite stores dates, usually strings
    # Re-using logic from original if needed, but standardizing
    return str(dt) 

from datetime import datetime

def safe_delete_file(file_path):
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass
