import { useState, useEffect } from 'react';
import { getPersons, updatePerson, assignFace, createPersonFromFace } from '../api/client';
import { getFaceThumbnailUrl } from '../api/client';
import type { Face, Person } from '../types';

interface Props {
  face: Face;
  onClose: () => void;
  onSaved: () => void;
}

export default function LabelDialog({ face, onClose, onSaved }: Props) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [newName, setNewName] = useState('');
  const [mode, setMode] = useState<'select' | 'create'>('select');

  useEffect(() => {
    getPersons().then(setPersons).catch(console.error);
  }, []);

  const handleAssign = async (personId: number) => {
    await assignFace(face.id, personId);
    onSaved();
  };

  const handleCreate = async () => {
    await createPersonFromFace(face.id, newName || undefined);
    onSaved();
  };

  const handleRename = async (personId: number, name: string) => {
    await updatePerson(personId, name);
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-80 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <img
            src={getFaceThumbnailUrl(face.id)}
            alt=""
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <p className="font-medium text-gray-900">
              {face.person_name || 'Unknown person'}
            </p>
            <p className="text-xs text-gray-400">
              Confidence: {(face.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="p-4">
          {mode === 'select' ? (
            <>
              <p className="text-sm text-gray-500 mb-3">Assign to existing person:</p>
              <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                {persons.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                    onClick={() => handleAssign(p.id)}
                  >
                    {p.representative_face_id && (
                      <img
                        src={getFaceThumbnailUrl(p.representative_face_id)}
                        className="w-8 h-8 rounded-full object-cover"
                        alt=""
                      />
                    )}
                    <span>{p.name || `Person #${p.id}`}</span>
                    <span className="ml-auto text-xs text-gray-400">{p.face_count}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMode('create')}
                className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                + Create new person
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-2">Name (optional):</p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter name..."
                className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('select')}
                  className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
