import React, { useState } from 'react';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { User, UserRole } from '../../types';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { ConfirmModal } from '../UI/ConfirmModal';
import { 
  Users, 
  Shield, 
  UserCheck, 
  UserX, 
  Trash2, 
  Mail, 
  Calendar, 
  Clock,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { safeFormat } from '../../utils/dateUtils';
import { toast } from 'sonner';

export const UserManagement: React.FC = () => {
  const { users, loading, updateUserRole, updateUserStatus, deleteUser } = useUsers();
  const { user: currentUser } = useAuth();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole | null>(null);
  const [newStatus, setNewStatus] = useState<'Active' | 'Inactive' | 'Pending' | null>(null);

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="mx-auto h-12 w-12 text-slate-300" />
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="mt-2 text-slate-500">Only Super Admins can manage user access.</p>
      </div>
    );
  }

  const handleRoleChange = async () => {
    if (selectedUser && newRole) {
      try {
        await updateUserRole(selectedUser.id, newRole);
        toast.success(`Updated ${selectedUser.name}'s role to ${newRole}`);
      } catch (error) {
        toast.error('Failed to update user role');
      }
    }
    setIsRoleModalOpen(false);
  };

  const handleStatusChange = async () => {
    if (selectedUser && newStatus) {
      try {
        await updateUserStatus(selectedUser.id, newStatus);
        toast.success(`Updated ${selectedUser.name}'s status to ${newStatus}`);
      } catch (error) {
        toast.error('Failed to update user status');
      }
    }
    setIsStatusModalOpen(false);
  };

  const handleDeleteUser = async () => {
    if (selectedUser) {
      try {
        await deleteUser(selectedUser.id);
        toast.success(`Removed access for ${selectedUser.name}`);
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
    setIsDeleteModalOpen(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">User Access Management</h2>
          <p className="text-sm text-slate-500">Manage user roles, permissions, and account status.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          <span>{users.length} Total Users</span>
        </div>
      </div>

      <div className="grid gap-4">
        {users.map((u) => (
          <Card key={u.id} className="overflow-hidden">
            <div className="flex flex-col p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <img 
                    src={u.avatar} 
                    alt={u.name} 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">{u.name}</h3>
                    {u.id === currentUser?.id && (
                      <Badge variant="outline" className="text-[10px]">You</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span className="flex items-center">
                      <Mail className="mr-1 h-3 w-3" />
                      {u.email}
                    </span>
                    <span className="flex items-center">
                      <Shield className="mr-1 h-3 w-3" />
                      {u.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-0">
                <div className="flex flex-col items-end text-right">
                  <Badge 
                    variant={u.status === 'Active' ? 'success' : u.status === 'Pending' ? 'warning' : 'secondary'}
                  >
                    {u.status}
                  </Badge>
                  <span className="mt-1 flex items-center text-[10px] text-slate-400">
                    <Clock className="mr-1 h-2.5 w-2.5" />
                    Joined: {safeFormat(u.joinedAt, 'MMM d, yyyy')}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative group">
                    <Button variant="outline" size="sm" className="h-8">
                      Role <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                    <div className="absolute right-0 top-full z-10 mt-1 hidden w-32 rounded-md border border-slate-200 bg-white p-1 shadow-lg group-hover:block dark:border-slate-800 dark:bg-slate-900">
                      {(['Super Admin', 'Admin', 'Viewer'] as UserRole[]).map((role) => (
                        <button
                          key={role}
                          onClick={() => {
                            setSelectedUser(u);
                            setNewRole(role);
                            setIsRoleModalOpen(true);
                          }}
                          className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${u.role === role ? 'bg-slate-50 font-bold text-indigo-600 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative group">
                    <Button variant="outline" size="sm" className="h-8">
                      Status <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                    <div className="absolute right-0 top-full z-10 mt-1 hidden w-32 rounded-md border border-slate-200 bg-white p-1 shadow-lg group-hover:block dark:border-slate-800 dark:bg-slate-900">
                      {(['Active', 'Inactive', 'Pending'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setSelectedUser(u);
                            setNewStatus(status);
                            setIsStatusModalOpen(true);
                          }}
                          className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${u.status === status ? 'bg-slate-50 font-bold text-indigo-600 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {u.id !== currentUser?.id && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                      onClick={() => {
                        setSelectedUser(u);
                        setIsDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onConfirm={handleRoleChange}
        title="Change User Role"
        message={`Are you sure you want to change ${selectedUser?.name}'s role to ${newRole}?`}
        confirmText="Update Role"
      />

      <ConfirmModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleStatusChange}
        title="Change User Status"
        message={`Are you sure you want to change ${selectedUser?.name}'s status to ${newStatus}?`}
        confirmText="Update Status"
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Remove User Access"
        message={`Are you sure you want to remove access for ${selectedUser?.name}? This will delete their user record.`}
        confirmText="Remove Access"
        variant="danger"
      />
    </div>
  );
};
