import React, { useState, useEffect } from 'react';
import { Plus, Search, HardDrive, Gamepad2, Calendar, Clock, MoreVertical, Download, Upload, Trash2, Edit2, FileText, Check, X as XIcon } from 'lucide-react';
import Modal from './components/Modal';

// API Base - Change if deployed differently
const API_BASE = '/api';

// Platform Options
const PLATFORMS = [
  "PC", "Steam", "GOG", "Epic Games", "Ubisoft", "Origin", "Amazon Games",
  "Nintendo Switch", "PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One",
  "Retro / Emulator", "Other"
];

function App() {
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSave, setSelectedSave] = useState(null); // For Details/Edit

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
          // Update local state if needed
          const updated = { ...selectedSave, ...updates };
          setSelectedSave(updated);
        }
        return true;
      }
    } catch (err) {
      alert("Update failed");
    }
    return false;
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
              Varo SaveManager v1.1
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
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
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
  const [loading, setLoading] = useState(true);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(save.game_name);
  const [editPlatform, setEditPlatform] = useState(save.platform);

  // Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDetails();
    setEditName(save.game_name);
    setEditPlatform(save.platform);
  }, [save.id]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/saves/${save.id}`);
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.versions || []).sort((a, b) => b.version_number - a.version_number);
        setVersions(sorted);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleCreateVersion = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    const data = new FormData();
    data.append('file', uploadFile);
    data.append('notes', uploadNote);

    try {
      const res = await fetch(`${API_BASE}/saves/${save.id}/upload`, { method: 'POST', body: data });
      if (res.ok) {
        setUploadFile(null);
        setUploadNote('');
        fetchDetails();
        onUpdate(save.id, {}); // Trigger refresh on parent
      }
    } catch (e) { alert("Upload failed"); }
    setUploading(false);
  };

  const handleUpdateNote = async (versionId, newNote) => {
    // Optimistic update
    const updated = versions.map(v => v.id === versionId ? { ...v, notes: newNote } : v);
    setVersions(updated);

    try {
      await fetch(`${API_BASE}/versions/${versionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote })
      });
    } catch (e) {
      alert("Note update failed");
      fetchDetails(); // Revert
    }
  };

  const handleSaveEdit = async () => {
    const success = await onUpdate(save.id, {
      game_name: editName,
      platform: editPlatform
    });
    if (success) setIsEditing(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={isEditing ? "Edit Game Details" : save.game_name}>
      <div className="space-y-6">

        {/* Game Details Header */}
        {isEditing ? (
          <div className="space-y-3 bg-black/20 p-4 rounded-lg">
            <div>
              <label className="text-xs text-gray-500 uppercase">Name</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Platform</label>
              <select
                value={editPlatform}
                onChange={e => setEditPlatform(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSaveEdit} className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><Check size={14} /> Save</button>
              <button onClick={() => setIsEditing(false)} className="bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><XIcon size={14} /> Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg">
            <div>
              <div className="text-sm text-gray-400">Platform</div>
              <div className="font-medium text-primary">{save.platform || "Unknown"}</div>
            </div>
            <div className="flex gap-2">
              <button title="Edit Details" onClick={() => setIsEditing(true)} className="p-2 hover:bg-white/10 rounded text-blue-400 transition-colors"><Edit2 size={18} /></button>
              <button title="Delete Game" onClick={() => onDelete(save.id)} className="p-2 hover:bg-white/10 rounded text-red-400 transition-colors"><Trash2 size={18} /></button>
            </div>
          </div>
        )}

        {/* Versions List */}
        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2 text-gray-300">
            <Calendar size={16} /> Version History
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? <div className="text-center text-sm py-4">Loading history...</div> :
              versions.length === 0 ? <div className="text-center text-sm py-4 text-gray-500">No versions uploaded yet.</div> :
                versions.map(v => (
                  <VersionItem key={v.id} version={v} onUpdateNote={handleUpdateNote} />
                ))}
          </div>
        </div>

        {/* Upload Form */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="font-bold mb-3 text-sm text-gray-300">Upload New Version</h3>
          <form onSubmit={handleCreateVersion} className="space-y-3">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary"
                placeholder="Version notes (e.g. Before Boss, Lvl 50...)"
                value={uploadNote}
                onChange={e => setUploadNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="file"
                  accept=".zip"
                  onChange={e => setUploadFile(e.target.files[0])}
                  className="hidden"
                  id="ver-upload"
                />
                <label htmlFor="ver-upload" className={`block w-full text-center border border-dashed rounded py-2 text-sm cursor-pointer transition-colors ${uploadFile ? 'border-primary text-primary bg-primary/10' : 'border-gray-600 text-gray-400 hover:border-gray-400'}`}>
                  {uploadFile ? uploadFile.name : "+ Select Zip"}
                </label>
              </div>
              <button disabled={!uploadFile || uploading} type="submit" className="bg-primary disabled:opacity-50 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium text-sm flex items-center gap-2">
                {uploading ? "Uploading..." : <><Upload size={14} /> Upload</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  )
}

function VersionItem({ version, onUpdateNote }) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [note, setNote] = useState(version.notes || '');

  const saveNote = () => {
    onUpdateNote(version.id, note);
    setIsEditingNote(false);
  };

  return (
    <div className="bg-surface border border-white/5 p-3 rounded hover:bg-white/5 transition-colors group">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span className="bg-primary/20 text-primary text-xs font-bold px-1.5 py-0.5 rounded">v{version.version_number}</span>
          <span className="text-xs text-gray-500">{version.created_at_formatted}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400">{version.formatted_size}</span>
          <a href={`${API_BASE}/versions/${version.id}/download`} className="text-gray-400 hover:text-white transition-colors" title="Download">
            <Download size={14} />
          </a>
        </div>
      </div>

      {/* Note Section */}
      <div className="mt-1">
        {isEditingNote ? (
          <div className="flex gap-2 mt-1">
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              className="flex-1 bg-black/40 text-xs border border-white/10 rounded px-2 py-1 text-white"
              autoFocus
            />
            <button onClick={saveNote} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
            <button onClick={() => { setNote(version.notes || ''); setIsEditingNote(false); }} className="text-red-400 hover:text-red-300"><XIcon size={14} /></button>
          </div>
        ) : (
          <div className="flex justify-between items-center group/note">
            <p className="text-sm text-gray-300 truncate pr-2 max-w-[250px]">{version.notes || <span className="text-gray-600 italic">No notes</span>}</p>
            <button onClick={() => setIsEditingNote(true)} className="opacity-0 group-hover/note:opacity-100 text-gray-500 hover:text-blue-400 transition-opacity">
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
