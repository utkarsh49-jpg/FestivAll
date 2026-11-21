import React, { useState, useMemo } from 'react';
import { AdminUserItem, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { Search, AlertCircle, CheckCircle2, Ticket, Calendar } from 'lucide-react';

interface UserManagementTabProps {
  users: AdminUserItem[];
  onUpdateRole: (userId: string, newRole: UserRole) => Promise<void>;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({ users, onUpdateRole }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [users, search, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setActionError(null);
    setActionSuccess(null);
    setUpdatingUserId(userId);
    try {
      await onUpdateRole(userId, newRole);
      setActionSuccess(`Role updated to ${newRole} successfully.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user role.';
      setActionError(msg);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'amber';
      case 'ORGANIZER':
        return 'purple';
      case 'STUDENT':
        return 'blue';
      default:
        return 'purple';
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

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search users by name or campus email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 self-start sm:self-auto overflow-x-auto">
          {(['ALL', 'STUDENT', 'ORGANIZER', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                roleFilter === r
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 font-bold">User</th>
                <th className="py-3.5 px-4 font-bold">Current Role</th>
                <th className="py-3.5 px-4 font-bold">Activity</th>
                <th className="py-3.5 px-4 font-bold">Joined</th>
                <th className="py-3.5 px-4 font-bold text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isUpdating = updatingUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{u.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={getRoleBadgeVariant(u.role)} size="sm">
                          {u.role}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-cyan-300">
                            <Ticket className="w-3 h-3" />
                            {u.reservations_count} passes
                          </span>
                          <span className="flex items-center gap-1 text-purple-300">
                            <Calendar className="w-3 h-3" />
                            {u.events_count} events
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <select
                          disabled={isUpdating}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="px-2.5 py-1 rounded-xl bg-black/60 border border-white/20 text-xs font-bold uppercase text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        >
                          <option value="STUDENT" className="bg-[#120a2e]">STUDENT</option>
                          <option value="ORGANIZER" className="bg-[#120a2e]">ORGANIZER</option>
                          <option value="ADMIN" className="bg-[#120a2e]">ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
