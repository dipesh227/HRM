import React, { useState, useEffect } from 'react';
import { Site, SiteStatus, Employee, User, EmployeeRole } from '../../types';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { InputField } from '../UI/InputField';
import { ImageUpload } from '../UI/ImageUpload';
import { dbService } from '../../services/mockDb';
import { NewEmployeeForm } from '../Site/NewEmployeeForm';
import { Building2, Plus, MapPin, Pencil, Trash2, User as UserIcon, ChevronDown } from 'lucide-react';

interface SiteManagementProps {
  sites: Site[];
  onUpdate: () => void;
  showNotification: (type: 'success' | 'error', msg: string) => void;
  user: User;
}

export const SiteManagement: React.FC<SiteManagementProps> = ({ sites, onUpdate, showNotification, user }) => {
  const [showModal, setShowModal] = useState(false);
  const [showInchargeForm, setShowInchargeForm] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Site Incharge Dropdown Data
  const [siteStaff, setSiteStaff] = useState<Employee[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  const initialSiteState: Partial<Site> = { 
      name: '', siteCode: '', address: '', city: '', state: '', pincode: '',
      email: '', mobile: '', managerName: '', managerMobile: '',
      status: SiteStatus.ACTIVE 
  };
  
  const [formData, setFormData] = useState<Partial<Site>>(initialSiteState);
  const [siteLogo, setSiteLogo] = useState<File | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
        if (editingId) {
            setIsLoadingStaff(true);
            try {
                const staff = await dbService.getSiteEmployees(editingId);
                setSiteStaff(staff);
            } catch (error) {
                console.error("Failed to load site staff", error);
            } finally {
                setIsLoadingStaff(false);
            }
        } else {
            setSiteStaff([]);
        }
    };
    fetchStaff();
  }, [editingId]);

  const handleEdit = (site: Site) => {
      setEditingId(site.id);
      setFormData(site);
      setSiteLogo(null);
      setShowModal(true);
  };

  const handleAdd = () => {
      setEditingId(null);
      setFormData(initialSiteState);
      setSiteLogo(null);
      setShowModal(true);
  };

  const handleDelete = async (siteId: string) => {
      if(!window.confirm("Are you sure you want to close this site?")) return;
      try {
          await dbService.deleteSite(siteId);
          showNotification('success', "Site closed successfully.");
          onUpdate();
      } catch (e: any) {
          showNotification('error', e.message);
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          let logoUrl = formData.logoUrl;
          if (siteLogo) {
             logoUrl = await dbService.uploadSiteLogo(siteLogo);
          }
          
          const payload = { ...formData, logoUrl, companyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' };

          if (editingId) {
              await dbService.updateSite(editingId, payload);
              showNotification('success', "Site updated successfully.");
          } else {
              await dbService.createSite(payload);
              showNotification('success', "Site created successfully.");
          }
          
          setShowModal(false);
          onUpdate();
      } catch (e: any) {
          showNotification('error', e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleSelectManager = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const uan = e.target.value;
      if (!uan) return;
      const selectedEmp = siteStaff.find(emp => emp.uan === uan);
      if (selectedEmp) {
          setFormData(prev => ({
              ...prev,
              managerName: selectedEmp.name,
              managerMobile: "Linked UAN: " + selectedEmp.uan
          }));
      }
  };

  const handleInchargeCreated = () => {
      if (editingId) {
          const fetchStaff = async () => {
            const staff = await dbService.getSiteEmployees(editingId);
            setSiteStaff(staff);
          };
          fetchStaff();
      }
      onUpdate();
  };

  return (
    <div className="animate-fade-in space-y-4">
         <div className="flex justify-between items-center mb-2">
             <h3 className="font-bold text-slate-800 dark:text-white text-lg">Site Operations</h3>
             <Button onClick={handleAdd} icon={Plus} size="sm" className="shadow-lg shadow-blue-500/20">Add Site</Button>
         </div>
         
         <div className="grid gap-3">
             {sites.length === 0 ? <p className="text-slate-500 text-center py-8">No sites found.</p> : sites.map(s => (
                 <Card key={s.id} className="p-0 overflow-hidden relative" noPadding>
                     <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${s.status === SiteStatus.ACTIVE ? 'bg-green-500' : 'bg-red-500'}`} />
                     
                     <div className="p-4 flex flex-col sm:flex-row gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            {s.logoUrl ? (
                                <img src={s.logoUrl} alt={s.name} className="w-14 h-14 rounded-xl object-cover border border-slate-100 dark:border-slate-700 bg-slate-50" />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                    <Building2 className="w-7 h-7" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate pr-2">{s.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="neutral" className="text-[10px]">{s.siteCode || 'N/A'}</Badge>
                                    <Badge variant={s.status === SiteStatus.ACTIVE ? 'success' : 'danger'} className="text-[10px]">{s.status}</Badge>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.city}</span>
                                    {s.managerName && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {s.managerName}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex sm:flex-col justify-end gap-2 pt-2 sm:pt-0 sm:border-l border-slate-100 dark:border-slate-800 sm:pl-4">
                             <Button variant="secondary" size="sm" onClick={() => handleEdit(s)} icon={Pencil} className="flex-1 sm:w-full justify-center">Edit</Button>
                             {s.status === SiteStatus.ACTIVE && (
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} icon={Trash2} className="flex-1 sm:w-full justify-center text-red-500 hover:bg-red-50">Close</Button>
                             )}
                        </div>
                     </div>
                 </Card>
             ))}
         </div>

         <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? "Edit Site" : "Add Site"} maxWidth="max-w-xl">
            <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-4">
                    <InputField label="Site Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} icon={Building2} />
                    
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                        <ImageUpload 
                            label="Site Logo (Optional)"
                            currentImage={formData.logoUrl}
                            onImageSelected={setSiteLogo}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Site Code" value={formData.siteCode || ''} onChange={e => setFormData({...formData, siteCode: e.target.value})} placeholder="CODE" />
                        <InputField label="City" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                    </div>

                    <InputField label="Address" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} icon={MapPin} />
                    
                    {/* Manager Selection */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                         <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><UserIcon className="w-3 h-3" /> Site Incharge</label>
                            {editingId && (
                                <button type="button" onClick={() => setShowInchargeForm(true)} className="text-xs font-bold text-ios-blue flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                                    <Plus className="w-3 h-3" /> Create New
                                </button>
                            )}
                         </div>
                         
                         {editingId && (
                             <div className="relative mb-3">
                                <select 
                                    className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                    onChange={handleSelectManager}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select existing staff member...</option>
                                    {siteStaff.map(emp => (
                                        <option key={emp.uan} value={emp.uan}>{emp.name} ({emp.role})</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                             </div>
                         )}

                         <div className="grid grid-cols-2 gap-3">
                            <InputField label="Name" value={formData.managerName || ''} onChange={e => setFormData({...formData, managerName: e.target.value})} placeholder="Manager Name" />
                            <InputField label="Mobile" value={formData.managerMobile || ''} onChange={e => setFormData({...formData, managerMobile: e.target.value})} placeholder="Phone" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                    <Button type="submit" variant="primary" isLoading={isSaving} className="flex-1">Save</Button>
                </div>
            </form>
         </Modal>

         {editingId && (
            <NewEmployeeForm 
                isOpen={showInchargeForm}
                onClose={() => setShowInchargeForm(false)}
                user={user}
                onSuccess={() => {
                    handleInchargeCreated();
                    showNotification('success', "Site Incharge Created & Approved");
                }}
                showNotification={showNotification}
                overrideSiteId={editingId}
                overrideCompanyId={formData.companyId}
                defaultRole={EmployeeRole.SUPERVISOR}
            />
         )}
    </div>
  );
};