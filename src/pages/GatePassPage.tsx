import React, { useState } from 'react';
import { useAssets } from '../hooks/useAssets';
import { Card } from '../components/UI/Card';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { FileText, Search, Download, Filter, Calendar, User, Building, ArrowRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generateGatePassDoc } from '../lib/gatePassGenerator';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { useAuth } from '../hooks/useAuth';

import { LoadingSpinner } from '../components/UI/LoadingSpinner';

export const GatePassPage: React.FC = () => {
  const { gatePasses, settings, updateGatePass, deleteGatePass, isLoading } = useAssets();
  const { user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Loading gate passes..." />;
  }
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Returned'>('All');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [gpToDelete, setGpToDelete] = useState<{ assetId: string, id: string, no: string } | null>(null);

  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';

  const handleReturnGatePass = async (assetId: string, gpId: string) => {
    const actualReturnDate = format(new Date(), 'yyyy-MM-dd');
    try {
      await updateGatePass(assetId, gpId, { 
        status: 'Returned',
        actualReturnDate 
      });
      toast.success('Gate pass marked as returned');
    } catch (error) {
      toast.error('Failed to update gate pass');
    }
  };

  const filteredPasses = gatePasses
    .filter(gp => {
      const matchesSearch = 
        gp.gatePassNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gp.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gp.receiverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gp.plantName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || gp.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

  const getHeader = (key: string, defaultLabel: string) => {
    return settings?.gatePassHeaders?.[key] || defaultLabel;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gate Pass Register</h2>
          <p className="text-slate-500">View and manage all gate pass entries</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-white dark:bg-slate-800">
            Total: {gatePasses.length}
          </Badge>
          <Badge variant="warning" className="bg-white dark:bg-slate-800">
            Pending: {gatePasses.filter(gp => gp.status === 'Pending').length}
          </Badge>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by GP No, Asset, or Receiver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {filteredPasses.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Gate Passes Found</h3>
            <p className="text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredPasses.map((gp) => (
            <Card key={gp.id} className="p-5 hover:shadow-lg transition-all border-l-4 border-l-indigo-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                    <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">#{gp.gatePassNo}</span>
                      <Badge variant={gp.status === 'Returned' ? 'success' : 'warning'}>
                        {gp.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm text-slate-500">
                      <div className="flex items-center">
                        <Package className="h-3.5 w-3.5 mr-1.5" />
                        {gp.assetName}
                      </div>
                      <div className="flex items-center">
                        <User className="h-3.5 w-3.5 mr-1.5" />
                        {gp.receiverName}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        {gp.createDate}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end md:self-center">
                  <div className="text-right hidden md:block mr-4">
                    <p className="text-xs text-slate-400 uppercase font-bold">Created By</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{gp.createdBy?.name || 'Admin'}</p>
                  </div>
                  <Button variant="outline" onClick={() => generateGatePassDoc(gp)}>
                    <Download className="h-4 w-4 mr-2" /> DOCX
                  </Button>
                  {gp.status === 'Pending' && (
                    <Button 
                      variant="outline" 
                      className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleReturnGatePass(gp.assetId, gp.id)}
                    >
                      Mark Returned
                    </Button>
                  )}
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-slate-400 hover:text-red-500"
                      onClick={() => {
                        setGpToDelete({ assetId: gp.assetId, id: gp.id, no: gp.gatePassNo });
                        setIsDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {gp.remark && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">{getHeader('remark', 'Remark')}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{gp.remark}"</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={async () => {
          if (gpToDelete) {
            try {
              await deleteGatePass(gpToDelete.assetId, gpToDelete.id);
              toast.success('Gate pass deleted successfully');
            } catch (error) {
              toast.error('Failed to delete gate pass');
            }
          }
          setIsDeleteConfirmOpen(false);
        }}
        title="Delete Gate Pass"
        message={`Are you sure you want to delete Gate Pass ${gpToDelete?.no}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

const Package = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/>
    <path d="M12 22V12"/>
  </svg>
);
