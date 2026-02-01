import React, { useState, useEffect } from 'react';
import { Site, SiteStatus, Employee, User, EmployeeRole } from '../../types';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { InputField } from '../UI/InputField';
import { dbService } from '../../services/mockDb';
import { NewEmployeeForm } from '../Site/NewEmployeeForm';
import { Building2, Plus, ImageIcon, MapPin, Pencil, Trash2, Mail, Phone, User as UserIcon, UserPlus, ChevronDown } from 'lucide-react';

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

  // Fetch staff when editing a site
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
      if(!window.confirm("Are you sure you want to close this site? It will be hidden from operations.")) return;
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
              managerMobile: "Linked UAN: " + selectedEmp.uan // Or fetch mobile if available
          }));
      }
  };

  const handleInchargeCreated = () => {
      // Refresh the staff list if we are editing
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
    <div className="animate-fade-in">
         <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-slate-800 dark:text-white text-lg">Registered Sites</h3>
             <Button onClick={handleAdd} icon={Plus} size="lg" className="shadow-lg shadow-blue-500/20">Add New Site</Button>
         </div>
         
         <div className="grid gap-4">
             {sites.length === 0 ? <p className="text-slate-500 dark:text-slate-400 p-4">No sites found.</p> : sites.map(s => (
                 <Card key={s.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow relative overflow-hidden">
                     {/* Status indicator line */}
                     <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.status === SiteStatus.ACTIVE ? 'bg-green-500' : 'bg-red-500'}`} />
                     
                     <div className="flex items-start gap-4 flex-1">
                         {s.logoUrl ? (
                             <img src={s.logoUrl} alt={s.name} className="w-16 h-16 rounded-xl object-contain border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800" />
                         ) : (
                             <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
                                 <Building2 className="w-8 h-8" />
                             </div>
                         )}
                         <div>
                             <h4 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">{s.name}</h4>
                             <p className="text-xs font-mono text-slate-400 mt-0.5">{s.siteCode || 'NO CODE'}</p>
                             
                             <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.city}, {s.state}</span>
                                {s.managerName && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {s.managerName}</span>}
                             </div>
                         </div>
                     </div>

                     <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                         <Badge variant={s.status === SiteStatus.ACTIVE ? 'success' : 'danger'}>{s.status}</Badge>
                         <div className="flex gap-2 ml-auto">
                            <Button variant="secondary" size="sm" onClick={() => handleEdit(s)} icon={Pencil} className="h-9 w-9 p-0 md:w-auto md:px-3">
                                <span className="hidden md:inline">Edit</span>
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)} icon={Trash2} className="h-9 w-9 p-0 md:w-auto md:px-3">
                                <span className="hidden md:inline">Close</span>
                            </Button>
                         </div>
                     </div>
                 </Card>
             ))}
         </div>

         {/* Edit/Add Modal */}
         <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? "Edit Site Details" : "Add New Site"} maxWidth="max-w-2xl">
            <form onSubmit={handleSave} className="space-y-6">
                
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField 
                        label="Site Name" 
                        required 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        icon={Building2}
                        className="md:col-span-2"
                    />
                    <InputField 
                        label="Site Code" 
                        value={formData.siteCode || ''} 
                        onChange={e => setFormData({...formData, siteCode: e.target.value})} 
                        placeholder="e.g. PUN-001"
                    />
                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
                        <div className="h-10 w-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-600">
                            {siteLogo ? <ImageIcon className="w-5 h-5 text-blue-500" /> : <ImageIcon className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 overflow-hidden">
                             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">Site Logo</label>
                             <input type="file" accept="image/*" onChange={e => setSiteLogo(e.target.files?.[0] || null)} className="text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:bg-blue-50 file:text-blue-700 cursor-pointer" />
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><MapPin className="w-4 h-4"/> Location Details</h4>
                    <InputField 
                        label="Full Address" 
                        required 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                    />
                    <div className="grid grid-cols-3 gap-3">
                        <InputField label="City" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                        <InputField label="State" value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})} />
                        <InputField label="Pincode" value={formData.pincode || ''} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                    </div>
                </div>

                {/* Manager / Incharge Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                     <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><UserIcon className="w-4 h-4"/> Site In-Charge</h4>
                        {editingId && (
                            <Button type="button" size="sm" variant="ghost" icon={UserPlus} onClick={() => setShowInchargeForm(true)}>
                                Create New Incharge
                            </Button>
                        )}
                     </div>
                     
                     {/* Dropdown for Existing Staff */}
                     {editingId && (
                         <div className="relative">
                            <select 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                onChange={handleSelectManager}
                                defaultValue=""
                            >
                                <option value="" disabled>Select from existing site staff...</option>
                                {siteStaff.map(emp => (
                                    <option key={emp.uan} value={emp.uan}>{emp.name} ({emp.role}) - {emp.uan}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                         </div>
                     )}

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Manager Name" value={formData.managerName || ''} onChange={e => setFormData({...formData, managerName: e.target.value})} />
                        <InputField label="Manager Mobile" value={formData.managerMobile || ''} onChange={e => setFormData({...formData, managerMobile: e.target.value})} />
                    </div>
                </div>

                {/* Contact */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><Phone className="w-4 h-4"/> Contact Info</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Site Email" type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} icon={Mail} />
                        <InputField label="Site Mobile" type="tel" value={formData.mobile || ''} onChange={e => setFormData({...formData, mobile: e.target.value})} icon={Phone} />
                    </div>
                </div>

                {editingId && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.status === SiteStatus.ACTIVE} 
                                onChange={e => setFormData({...formData, status: e.target.checked ? SiteStatus.ACTIVE : SiteStatus.CLOSED})}
                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Site is Operational (Active)</span>
                        </label>
                    </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                    <Button type="submit" variant="primary" isLoading={isSaving} className="flex-1">{editingId ? 'Update Site' : 'Create Site'}</Button>
                </div>
            </form>
         </Modal>

         {/* Create Incharge Form Modal */}
         {editingId && (
            <NewEmployeeForm 
                isOpen={showInchargeForm}
                onClose={() => setShowInchargeForm(false)}
                user={user}
                onSuccess={() => {
                    handleInchargeCreated();
                    showNotification('success', "New Site Incharge Created");
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