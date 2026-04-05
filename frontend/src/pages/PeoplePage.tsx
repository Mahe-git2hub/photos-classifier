import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersons } from '../hooks/usePersons';
import { getFaceThumbnailUrl, updatePerson, mergePersons } from '../api/client';

export default function PeoplePage() {
  const { persons, loading, refresh } = usePersons();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedForMerge, setSelectedForMerge] = useState<Set<number>>(new Set());
  const [mergeMode, setMergeMode] = useState(false);

  const handleRename = async (personId: number) => {
    if (editName.trim()) {
      await updatePerson(personId, editName.trim());
      setEditingId(null);
      refresh();
    }
  };

  const handleMerge = async () => {
    if (selectedForMerge.size >= 2) {
      await mergePersons(Array.from(selectedForMerge));
      setSelectedForMerge(new Set());
      setMergeMode(false);
      refresh();
    }
  };

  const toggleMergeSelect = (id: number) => {
    setSelectedForMerge((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-10 px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">People</h2>
        <div className="flex gap-2">
          {mergeMode ? (
            <>
              <button
                onClick={() => { setMergeMode(false); setSelectedForMerge(new Set()); }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={selectedForMerge.size < 2}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Merge ({selectedForMerge.size})
              </button>
            </>
          ) : (
            <button
              onClick={() => setMergeMode(true)}
              className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              Merge people
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : persons.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p>No people detected yet. Scan photos first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-6">
          {persons.map((person) => (
            <div
              key={person.id}
              className={`relative group cursor-pointer ${
                mergeMode && selectedForMerge.has(person.id)
                  ? 'ring-2 ring-blue-500 rounded-xl'
                  : ''
              }`}
              onClick={() => {
                if (mergeMode) {
                  toggleMergeSelect(person.id);
                } else {
                  navigate(`/person/${person.id}`);
                }
              }}
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-2">
                {person.representative_face_id ? (
                  <img
                    src={getFaceThumbnailUrl(person.representative_face_id)}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>

              {editingId === person.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(person.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(person.id)}
                  className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p
                  className="text-sm font-medium text-gray-700 truncate text-center"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(person.id);
                    setEditName(person.name || '');
                  }}
                >
                  {person.name || `Unknown #${person.id}`}
                </p>
              )}
              <p className="text-xs text-gray-400 text-center">{person.face_count} photos</p>

              {mergeMode && (
                <div className="absolute top-2 right-2">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedForMerge.has(person.id)
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-white bg-white/50'
                    }`}
                  >
                    {selectedForMerge.has(person.id) && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
