import React, { useState } from 'react';
import { Site, SiteStatus } from '../../types';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { dbService } from '../../services/mockDb';
import { Building2, Plus, ImageIcon, MapPin } from 'lucide-react';

interface SiteManagementProps {
  sites: Site[];
  onUpdate: () => void;
  showNotification: (type: 'success' | 'error', msg: string) => void;
}

export const SiteManagement: React.FC<SiteManagementProps> = ({ sites, onUpdate, showNotification }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New Site State
  const [newSite, setNewSite] = useState<Partial<Site>>({ name: '', address: '', city: '', status: SiteStatus.ACTIVE });
  const [siteLogo, setSiteLogo] = useState<File | null>(null);

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          let logoUrl = newSite.logoUrl;
          if (siteLogo) {
             logoUrl = await dbService.uploadSiteLogo(siteLogo);
          }
          // Hardcoded Company ID for this version as per spec
          await dbService.createSite({ ...newSite, logoUrl, companyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
          showNotification('success', "Site created successfully.");
          setShowAddModal(false);
          setNewSite({ name: '', address: '', city: '', status: SiteStatus.ACTIVE });
          setSiteLogo(null);
          onUpdate();
      } catch (e: any) {
          showNotification('error', e.message);
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="animate-fade-in">
         <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-slate-800 dark:text-white text-lg">Registered Sites</h3>
             <Button onClick={() => setShowAddModal(true)} icon={Plus}>Add New Site</Button>
         </div>
         
         <div className="grid gap-4">
             {sites.length === 0 ? <p className="text-slate-500 dark:text-slate-400 p-4">No sites found.</p> : sites.map(s => (
                 <Card key={s.id} className="p-4 flex justify-between items-center hover:shadow-md transition-shadow">
                     <div className="flex items-center gap-4">
                         {s.logoUrl ? (
                             <img src={s.logoUrl} alt={s.name} className="w-16 h-16 rounded-lg object-contain border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                         ) : (
                             <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                                 <Building2 className="w-8 h-8" />
                             </div>
                         )}
                         <div>
                             <h4 className="font-bold text-lg text-slate-800 dark:text-white">{s.name}</h4>
                             <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {s.address}
                             </p>
                             <div className="flex gap-2 mt-2">
                                <Badge variant="neutral">{s.city || 'Unknown City'}</Badge>
                                <Badge variant={s.status === SiteStatus.ACTIVE ? 'success' : 'danger'}>{s.status}</Badge>
                             </div>
                         </div>
                     </div>
                 </Card>
             ))}
         </div>

         <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Site">
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Site Name</label>
                    <input required className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newSite.name} onChange={e => setNewSite({...newSite, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                    <input required className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newSite.address} onChange={e => setNewSite({...newSite, address: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                    <input required className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newSite.city} onChange={e => setNewSite({...newSite, city: e.target.value})} />
                </div>
                
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Site Logo (Optional)
                    </label>
                    <input type="file" accept="image/*" onChange={e => setSiteLogo(e.target.files?.[0] || null)} className="text-sm w-full text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white dark:file:bg-slate-700 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-50 dark:hover:file:bg-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer" />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
                    <Button type="submit" variant="primary" isLoading={isSaving} className="flex-1">Create Site</Button>
                </div>
            </form>
         </Modal>
    </div>
  );
};