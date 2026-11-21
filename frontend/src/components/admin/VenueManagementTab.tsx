import React, { useState } from 'react';
import { Venue, VenuePayload } from '../../types';
import { MapPin, Plus, Edit2, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface VenueManagementTabProps {
  venues: Venue[];
  onCreateVenue: (payload: VenuePayload) => Promise<void>;
  onUpdateVenue: (id: string, payload: Partial<VenuePayload>) => Promise<void>;
  onDeleteVenue: (id: string) => Promise<void>;
}

export const VenueManagementTab: React.FC<VenueManagementTabProps> = ({
  venues,
  onCreateVenue,
  onUpdateVenue,
  onDeleteVenue,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState<number>(200);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const openCreateModal = () => {
    setName('');
    setLocation('');
    setCapacity(200);
    setActionError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (venue: Venue) => {
    setEditingVenue(venue);
    setName(venue.name);
    setLocation(venue.location);
    setCapacity(venue.capacity);
    setActionError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!name.trim() || !location.trim() || capacity <= 0) {
      setActionError('Please fill in all venue fields with a positive capacity.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateVenue({
        name: name.trim(),
        location: location.trim(),
        capacity: Number(capacity),
      });
      setActionSuccess(`Venue '${name}' created successfully!`);
      setIsCreateOpen(false);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create venue.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenue) return;
    setActionError(null);

    setIsSubmitting(true);
    try {
      await onUpdateVenue(editingVenue.id, {
        name: name.trim(),
        location: location.trim(),
        capacity: Number(capacity),
      });
      setActionSuccess(`Venue '${name}' updated successfully!`);
      setEditingVenue(null);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update venue.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (venue: Venue) => {
    if (!window.confirm(`Are you sure you want to delete venue "${venue.name}"?`)) {
      return;
    }
    setActionError(null);
    try {
      await onDeleteVenue(venue.id);
      setActionSuccess(`Venue "${venue.name}" deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cannot delete venue.';
      setActionError(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header action */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Manage campus auditoriums, seminar halls, and seating capacity configurations.
        </p>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-pink-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Venue</span>
        </button>
      </div>

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.map((venue) => (
          <div
            key={venue.id}
            className="p-5 glass-card rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                  Venue #{venue.id}
                </span>
                <span className="text-xs font-bold text-white bg-black/40 px-2.5 py-1 rounded-xl border border-white/5">
                  {venue.capacity} Seats
                </span>
              </div>

              <h4 className="text-base font-bold text-white font-['Outfit']">
                {venue.name}
              </h4>

              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>{venue.location}</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
              <button
                onClick={() => openEditModal(venue)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Edit Venue"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(venue)}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                title="Delete Venue"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Venue Modal */}
      {(isCreateOpen || editingVenue) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md glass-panel rounded-3xl border border-purple-500/30 p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => {
                setIsCreateOpen(false);
                setEditingVenue(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white font-['Outfit'] mb-4">
              {editingVenue ? 'Edit Venue' : 'Add New Campus Venue'}
            </h3>

            <form onSubmit={editingVenue ? handleEditSubmit : handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Venue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Auditorium 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Campus Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Academic Block, 2nd Floor"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Maximum Capacity *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
                {editingVenue && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cannot be reduced below the configured seat count of existing events at this venue.
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-600/30 hover:opacity-95 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Saving...' : editingVenue ? 'Update Venue' : 'Create Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
