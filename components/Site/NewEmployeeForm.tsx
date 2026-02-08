import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { Employee, EmployeeRole, EmployeeStatus, User, UserRole, JobRole } from '../../types';
import { dbService } from '../../services/mockDb';
import { UserPlus, BadgeCheck, User as UserIcon, Building, CreditCard, FileText, Phone, Camera } from 'lucide-react';
import { InputField } from '../UI/InputField';
import { ImageUpload } from '../UI/ImageUpload';

interface NewEmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
  showNotification: (type: 'success' | 'error', msg: string) => void;
  overrideSiteId?: string;
  overrideCompanyId?: string;
  defaultRole?: string;
  initialData?: Employee; // For Editing Mode
}

export const NewEmployeeForm: React.FC<NewEmployeeFormProps> = ({ 
    isOpen, onClose, user, onSuccess, showNotification, 
    overrideSiteId, overrideCompanyId, defaultRole = 'Helper', initialData
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'official' | 'banking' | 'docs'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dynamic Roles
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({
      name: '', uan: '', role: defaultRole, mobile: '',
      joinedDate: new Date().toISOString().split('T')[0],
      esicNo: '', pfNo: '',
      bankAccountNo: '', ifscCode: '', bankName: '',
  });

  // File States
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [panCard, setPanCard] = useState<File | null>(null);
  const [passbook, setPassbook] = useState<File | null>(null);

  useEffect(() => {
      if(isOpen) {
          fetchRoles();
          if (initialData) {
              setFormData(initialData);
          } else {
              setFormData({ 
                  name: '', uan: '', role: defaultRole, mobile: '',
                  joinedDate: new Date().toISOString().split('T')[0],
                  esicNo: '', pfNo: '', bankAccountNo: '', ifscCode: '', bankName: ''
              });
              setProfilePhoto(null); setAadhaarFront(null); setAadhaarBack(null); setPanCard(null); setPassbook(null);
          }
          setActiveTab('basic');
      }
  }, [isOpen, defaultRole, initialData]);

  const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
          const roles = await dbService.getJobRoles();
          setJobRoles(roles);
          // If no initial role set or defaultRole is generic, maybe set to first available? 
          // But keeping defaultRole prop is safer for context (e.g. creating Manager)
      } catch (error) {
          console.error("Failed to load roles", error);
      } finally {
          setLoadingRoles(false);
      }
  };

  const updateField = (key: keyof Employee, value: string) => {
      setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For editing, we might use existing ID. For new, we use user context.
    const targetCompanyId = overrideCompanyId || (initialData ? initialData.companyId : user.companyId);
    const targetSiteId = overrideSiteId || (initialData ? initialData.siteId : user.siteId);

    if (!targetCompanyId || !targetSiteId) {
        showNotification('error', "System Error: Target Site ID missing.");
        return;
    }

    if (!formData.name || !formData.uan) {
        showNotification('error', "Name and UAN are required.");
        return;
    }

    setIsSubmitting(true);

    try {
        // Upload Files
        const upload = async (file: File | null) => file ? await dbService.uploadSiteLogo(file) : undefined;
        
        const [pPhoto, aFront, aBack, pCard, pBook] = await Promise.all([
            upload(profilePhoto),
            upload(aadhaarFront),
            upload(aadhaarBack),
            upload(panCard),
            upload(passbook)
        ]);

        const finalData: Partial<Employee> = {
            ...formData,
            companyId: targetCompanyId,
            siteId: targetSiteId,
            status: initialData ? initialData.status : EmployeeStatus.PENDING,
            addedBy: user.id,
            // Only update URLs if new file uploaded, else keep existing (or undefined)
            profilePhotoUrl: pPhoto || formData.profilePhotoUrl,
            aadhaarFrontUrl: aFront || formData.aadhaarFrontUrl,
            aadhaarBackUrl: aBack || formData.aadhaarBackUrl,
            panUrl: pCard || formData.panUrl,
            bankPassbookUrl: pBook || formData.bankPassbookUrl,
        };

        if (initialData) {
            // Update Mode
            await dbService.updateEmployeeProfile(initialData.uan, finalData);
            showNotification('success', "Employee profile updated.");
        } else {
            // Create Mode
            await dbService.addEmployee(finalData as Employee);
            if (user.role === UserRole.HR) {
                await dbService.approveEmployee(finalData.uan!, true, user.id);
                showNotification('success', `${finalData.role} created and approved.`);
            } else {
                showNotification('success', "Employee added. Waiting for HR approval.");
            }
        }
        
        onSuccess();
        onClose();
    } catch (err: any) {
      showNotification('error', err.message || "Failed to save employee.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const tabs = [
      { id: 'basic', label: 'Basic Info', icon: UserIcon },
      { id: 'official', label: 'Official', icon: Building },
      { id: 'banking', label: 'Banking', icon: CreditCard },
      { id: 'docs', label: 'Documents', icon: FileText },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Employee Profile" : "Add New Employee"} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all
                            ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 shadow-sm text-ios-blue' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/50'}
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto px-1 pb-4 space-y-6">
                
                {/* 1. Basic Info */}
                {activeTab === 'basic' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-center mb-4">
                            <div className="w-32">
                                <ImageUpload 
                                    label="Profile Photo" 
                                    currentImage={formData.profilePhotoUrl} 
                                    onImageSelected={setProfilePhoto} 
                                    className="h-32 rounded-full"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField 
                                label="Full Name" 
                                required 
                                value={formData.name} 
                                onChange={e => updateField('name', e.target.value)} 
                                icon={UserIcon} 
                            />
                            <InputField 
                                label="Mobile Number" 
                                value={formData.mobile || ''} 
                                onChange={e => updateField('mobile', e.target.value)} 
                                icon={Phone}
                                placeholder="10-digit mobile"
                            />
                        </div>

                        <InputField 
                            label="UAN (12-Digit ID)" 
                            required 
                            value={formData.uan} 
                            onChange={e => updateField('uan', e.target.value)} 
                            icon={BadgeCheck}
                            placeholder="0000 0000 0000"
                            maxLength={12}
                            disabled={!!initialData} // Lock UAN on edit
                            className="font-mono tracking-widest"
                        />
                    </div>
                )}

                {/* 2. Official Info */}
                {activeTab === 'official' && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Job Role</label>
                            <div className="relative">
                                <select 
                                    value={formData.role}
                                    onChange={e => updateField('role', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-base"
                                    disabled={loadingRoles}
                                >
                                    {loadingRoles && <option>Loading roles...</option>}
                                    {!loadingRoles && jobRoles.map(r => (
                                        <option key={r.id} value={r.title}>{r.title}</option>
                                    ))}
                                    {!loadingRoles && jobRoles.length === 0 && <option value="Helper">Helper (Default)</option>}
                                </select>
                            </div>
                        </div>

                        <InputField 
                            label="Date of Joining" 
                            type="date"
                            value={formData.joinedDate} 
                            onChange={e => updateField('joinedDate', e.target.value)} 
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField 
                                label="ESIC Number" 
                                value={formData.esicNo || ''} 
                                onChange={e => updateField('esicNo', e.target.value)} 
                                placeholder="Optional"
                            />
                            <InputField 
                                label="PF Number" 
                                value={formData.pfNo || ''} 
                                onChange={e => updateField('pfNo', e.target.value)} 
                                placeholder="Optional"
                            />
                        </div>
                    </div>
                )}

                {/* 3. Banking Info */}
                {activeTab === 'banking' && (
                    <div className="space-y-4 animate-fade-in">
                         <InputField 
                            label="Bank Account Number" 
                            value={formData.bankAccountNo || ''} 
                            onChange={e => updateField('bankAccountNo', e.target.value)} 
                            icon={CreditCard}
                            type="tel"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField 
                                label="IFSC Code" 
                                value={formData.ifscCode || ''} 
                                onChange={e => updateField('ifscCode', e.target.value.toUpperCase())} 
                                placeholder="SBIN000...."
                            />
                             <InputField 
                                label="Bank Name" 
                                value={formData.bankName || ''} 
                                onChange={e => updateField('bankName', e.target.value)} 
                                placeholder="e.g. SBI"
                            />
                        </div>
                    </div>
                )}

                {/* 4. Documents */}
                {activeTab === 'docs' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <ImageUpload 
                                label="Aadhaar Front"
                                currentImage={formData.aadhaarFrontUrl}
                                onImageSelected={setAadhaarFront}
                            />
                            <ImageUpload 
                                label="Aadhaar Back"
                                currentImage={formData.aadhaarBackUrl}
                                onImageSelected={setAadhaarBack}
                            />
                            <ImageUpload 
                                label="PAN Card"
                                currentImage={formData.panUrl}
                                onImageSelected={setPanCard}
                            />
                             <ImageUpload 
                                label="Bank Passbook"
                                currentImage={formData.bankPassbookUrl}
                                onImageSelected={setPassbook}
                            />
                        </div>
                    </div>
                )}
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} icon={UserPlus} className="flex-1">
                    {initialData ? 'Update Profile' : 'Register Employee'}
                </Button>
            </div>
        </form>
    </Modal>
  );
};
