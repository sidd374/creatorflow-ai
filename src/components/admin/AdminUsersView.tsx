import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Database, 
  AlertTriangle,
  UserCheck,
  Calendar,
  ExternalLink,
  Lock
} from 'lucide-react';
import { getRegisteredUsersOverview } from '../../lib/adminAnalyticsService';

export const AdminUsersView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const userOverview = getRegisteredUsersOverview();

  const filteredAccounts = userOverview.knownAccounts.filter((acc) => {
    const q = searchTerm.toLowerCase();
    return (
      acc.email.toLowerCase().includes(q) ||
      acc.displayName.toLowerCase().includes(q) ||
      acc.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Registered Users</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Audit user accounts, stable account identities, and device presence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
            Total Accounts: {userOverview.totalRegistered}
          </span>
        </div>
      </div>

      {/* Database Status Warning Banner */}
      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 flex items-start gap-3 text-xs">
        <Database className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-950">
            Database Connection: Disconnected
          </p>
          <p className="text-amber-800 leading-relaxed">
            The accounts listed below represent accounts currently stored or authenticated on this local workspace instance.
            To view multi-tenant production user tables across all devices, configure a relational database (Cloud SQL / PostgreSQL) and user synchronization API.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
        <Search className="w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by email, name, or account ID..."
          className="flex-1 bg-transparent text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs font-medium text-neutral-400 hover:text-neutral-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Account ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4">Identity Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 font-medium">
                      {acc.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {acc.displayName || 'Creator'}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {acc.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        acc.plan === 'max'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : acc.plan === 'creator'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : acc.plan === 'pro'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}>
                        {acc.plan || 'FREE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                      {acc.lastUsedAt ? new Date(acc.lastUsedAt).toLocaleString() : 'Unknown'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral-600">
                        <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                        Local / Google Verified
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="font-semibold text-neutral-700 text-xs">No accounts found</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {searchTerm ? 'Try a different search query' : 'No registered accounts stored on device'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
