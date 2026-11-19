import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldCheck, 
  Shield, 
  UserCheck, 
  Calendar,
  Layers,
  Compass,
  Film
} from 'lucide-react';
import { OwnerUserRecord } from '../../types/ownerAnalytics';

interface OwnerUsersTabProps {
  users: OwnerUserRecord[];
}

export const OwnerUsersTab: React.FC<OwnerUsersTabProps> = ({ users }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = searchQuery.trim() === '' || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlan = planFilter === 'all' || u.plan.toLowerCase() === planFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [users, searchQuery, planFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">
            Authenticated Accounts Directory
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Minimal, secure product registry. Zero sensitive credentials, secrets, or creator video bodies exposed.
          </p>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 self-start sm:self-auto">
          {filteredUsers.length} of {users.length} accounts
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email, name, account ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-neutral-200 text-xs focus:outline-none focus:border-neutral-900 bg-neutral-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="text-xs bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Plan</option>
            <option value="pro">Pro Plan</option>
            <option value="creator">Creator Plan</option>
            <option value="max">MAX Plan</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700 focus:outline-none"
          >
            <option value="all">All Activity</option>
            <option value="active">Active Recently</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            {users.length === 0 ? 'No accounts registered yet.' : 'No accounts match the current filter criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-3 text-center">Projects</th>
                  <th className="py-3 px-3 text-center">Ideas</th>
                  <th className="py-3 px-3 text-center">Kits</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredUsers.map((u) => {
                  const isOwner = u.role === 'owner';
                  const isAdmin = u.role === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.displayName)}`}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-neutral-200 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-neutral-900 block truncate max-w-[160px]">
                              {u.displayName}
                            </span>
                            <span className="text-[11px] text-neutral-500 font-mono block truncate max-w-[180px]">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {isOwner ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                            Owner
                          </span>
                        ) : isAdmin ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-neutral-900 text-white">
                            Admin
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-[11px]">User</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          u.plan.toLowerCase() === 'max'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : u.plan.toLowerCase() === 'creator'
                            ? 'bg-purple-50 text-purple-900 border border-purple-200'
                            : u.plan.toLowerCase() === 'pro'
                            ? 'bg-blue-50 text-blue-900 border border-blue-200'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {u.plan}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {new Date(u.lastActive).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-neutral-800">
                        {u.projectsCount}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-neutral-800">
                        {u.ideasCount}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-neutral-800">
                        {u.creationKitsCount}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-400'
                          }`}></span>
                          {u.status === 'active' ? 'Active' : 'Dormant'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
