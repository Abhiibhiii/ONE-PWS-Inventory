import React, { useState, useRef, useEffect } from 'react';
import { useUsers } from '../../hooks/useUsers';
import { Search, User as UserIcon, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserSelectProps {
  selectedUserId?: string;
  onSelect: (user: { userId: string, name: string, email?: string } | null) => void;
  placeholder?: string;
}

export const UserSelect: React.FC<UserSelectProps> = ({ selectedUserId, onSelect, placeholder = "Search user..." }) => {
  const { users } = useUsers();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedUser = users.find(u => u.id === selectedUserId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = users.filter(u => {
    const searchLower = (search || '').toLowerCase();
    return (u.name || '').toLowerCase().includes(searchLower) || 
           (u.email || '').toLowerCase().includes(searchLower);
  });

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2 overflow-hidden">
          <UserIcon className="h-4 w-4 text-slate-400 shrink-0" />
          {selectedUser ? (
            <span className="truncate text-slate-900 dark:text-white font-medium">{selectedUser.name}</span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>
        {selectedUser && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
            }}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
          >
            <X className="h-3 w-3 text-slate-400" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors"
                    onClick={() => {
                      onSelect({ userId: u.id, name: u.name, email: u.email });
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 dark:text-white">{u.name}</span>
                      <span className="text-xs text-slate-500">{u.email}</span>
                    </div>
                    {selectedUserId === u.id && <Check className="h-4 w-4 text-indigo-500" />}
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-slate-500 italic">
                  No users found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
