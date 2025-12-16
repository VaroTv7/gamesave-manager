import React, { useState, useEffect } from 'react';
import { Plus, Search, HardDrive, Gamepad2, Calendar, Clock, MoreVertical, Download, Upload, Trash2, Edit2, FileText, Check, X as XIcon } from 'lucide-react';
import Modal from './components/Modal';

// API Base - Change if deployed differently
const API_BASE = '/api';

function App() {
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSave, setSelectedSave] = useState(null); // For Details/Edit
  const [isEditMode, setIsEditMode] = useState(false);

  // Forms
  const [formData, setFormData] = useState({ game_name: '', platform: '', file: null });

  useEffect(() => {
    fetchSaves();
  }, []);

  const fetchSaves = async () => {
    try {
      const res = await fetch(`${API_BASE}/saves`);
      const data = await res.json();
      setSaves(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('game_name', formData.game_name);
    data.append('platform', formData.platform);
    if (formData.file) data.append('file', formData.file);

    try {
      const res = await fetch(`${API_BASE}/saves`, { method: 'POST', body: data });
      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({ game_name: '', platform: '', file: null });
        fetchSaves();
      }
    } catch (err) {
      alert("Error creating save");
    }
  };

  const handleUpdate = async (saveId, updates) => {
    try {
      const res = await fetch(`${API_BASE}/saves/${saveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchSaves();
        if (selectedSave) {
          // Update selected save local state mainly for the Name in modal
          setSelectedSave({ ...selectedSave, ...updates });
        }
        setIsEditMode(false);
      }
    } catch (err) {
      alert("Update failed");
    }
  };

  const handleDelete = async (saveId) => {
    if (!confirm("Are you sure? This will delete all versions.")) return;
    try {
      const res = await fetch(`${API_BASE}/saves/${saveId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedSave?.id === saveId) setSelectedSave(null);
        fetchSaves();
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  const filteredSaves = saves.filter(s =>
    s.game_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.platform?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-gray-200">
      {/* Header */}
      <header className="border-b border-white/10 bg-surface/50 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <Gamepad2 size={24} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
              Varo SaveManager v1.0
            </h1>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} />
            New Save
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="relative mb-8 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="text"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-full py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white placeholder-gray-500"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-20 text-gray-500">Loading library...</div>
          ) : filteredSaves.map(save => (
            <div
              key={save.id}
              onClick={() => setSelectedSave(save)}
              className="group bg-surface border border-white/5 hover:border-primary/50 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{save.game_name}</h3>
                  <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded mt-1 inline-block">{save.platform || 'PC'}</span>
                </div>
                <div className={`p-2 rounded-full ${save.last_backup ? 'bg-green-500/10 text-green-400' : 'bg-gray-700/50 text-gray-500'}`}>
                  <HardDrive size={18} />
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>Updated: {save.updated_at ? new Date(save.updated_at).toLocaleDateString() : 'Never'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={14} />
                  <span>Versions: {save.version_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Game Save"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Game Name</label>
            <input
              required
              type="text"
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
              value={formData.game_name}
              onChange={e => setFormData({ ...formData, game_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Platform</label>
            <select
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white outline-none"
              value={formData.platform}
              onChange={e => setFormData({ ...formData, platform: e.target.value })}
            >
              <option value="">Select Platform...</option>
              <option value="PC">PC</option>
              <option value="Nintendo Switch">Nintendo Switch</option>
              <option value="PlayStation">PlayStation</option>
              <option value="Xbox">Xbox</option>
              <option value="Retro">Retro / Emulator</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Initial Save File (Zip)</label>
            <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".zip"
                onChange={e => setFormData({ ...formData, file: e.target.files[0] })}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {formData.file ? (
                  <span className="text-primary font-medium">{formData.file.name}</span>
                ) : (
                  <span className="text-gray-500">Click to upload .zip file</span>
                )}
              </label>
            </div>
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all">
            Create Repository
          </button>
        </form>
      </Modal>

      {/* Details/Edit Modal */}
      {selectedSave && (
        <DetailsModal
          save={selectedSave}
          onClose={() => setSelectedSave(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function DetailsModal({ save, onClose, onUpdate, onDelete }) {
  const [versions, setVersions] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(save.game_name);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [save.id]);

  const fetchVersions = async () => {
    const res = await fetch(`${API_BASE}/saves/${save.id}`);
    if (res.ok) {
      // Backend currently returns save obj? Wait, my app.py GET /saves returns list. 
      // I need a GET /saves/<id> to get versions? 
      // Ah, looking at my app.py, I only have /api/saves (list) and update/delete. 
      // I need to fetch versions manually or add a route.
      // Actually, my backend code has "get_savedata_by_id" but no specific route for it returning versions?
      // Wait, app.py: @app.route('/api/saves/<int:save_id>/upload')
      // app.py doesn't seem to have a GET /api/saves/<id> that returns versions list?
      // I checked my written code. 
      // It has `get_saves` (LIST), `create_save`, `upload_version`, `update_save`, `download_latest`, `delete_save`.
      // It MISSES `GET /api/saves/<id>` to return details + versions list!
      // I MUST FIX THE BACKEND CODE.
    }
  };

  // Placeholder for now
  return (
    <Modal isOpen={true} onClose={onClose} title={isEditing ? "Edit Game" : save.game_name}>
      <div className="space-y-6">
        {isEditing ? (
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 bg-black/20 border border-white/10 rounded p-2 text-white"
            />
            <button onClick={() => { onUpdate(save.id, { game_name: newName }); setIsEditing(false); }} className="bg-green-600 p-2 rounded"><Check size={18} /></button>
            <button onClick={() => setIsEditing(false)} className="bg-red-600 p-2 rounded"><XIcon size={18} /></button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Platform: {save.platform}</span>
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-white/10 rounded text-blue-400"><Edit2 size={18} /></button>
              <button onClick={() => onDelete(save.id)} className="p-2 hover:bg-white/10 rounded text-red-400"><Trash2 size={18} /></button>
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-4">
          <h3 className="font-bold mb-4">Versions History</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {/* Versions list would go here. I need to fix backend to provide it. */}
            <div className="text-center text-gray-500 italic">Backend update required for versions list</div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <button className="w-full border-2 border-dashed border-white/10 hover:border-primary/50 p-4 rounded-lg text-gray-400 hover:text-white transition-all">
            Upload New Version (.zip)
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default App;
