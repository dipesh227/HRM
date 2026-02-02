import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { InputField } from '../UI/InputField';
import { ImageUpload } from '../UI/ImageUpload';
import { dbService } from '../../services/mockDb';
import { User, Employee, Company, Site } from '../../types';
import { UserCircle, MapPin, Calendar, Briefcase, BadgeCheck, Building2, Loader2, Phone, Mail, Home, Edit, Save, X } from 'lucide-react';

interface Props {
    user: User;
}

export const StaffProfile: React.FC<Props> = ({ user }) => {
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Context Names (instead of IDs)
    const [companyName, setCompanyName] = useState<string>('Loading...');
    const [siteName, setSiteName] = useState<string>('Loading...');
    
    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        mobile: '',
        personalEmail: '',
        address: ''
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadProfile();
    }, [user.id]);

    const loadProfile = async () => {
        try {
            // Fetch full details using UAN (user.id is UAN for staff)
            const data = await dbService.getEmployeeByUAN(user.id);
            setEmployee(data || null);

            if (data) {
                // Initialize Edit Form
                setEditForm({
                    mobile: data.mobile || '',
                    personalEmail: data.personalEmail || '',
                    address: data.address || ''
                });

                // Fetch Context Names
                const [comp, site] = await Promise.all([
                    dbService.getCompanyDetails(data.companyId),
                    dbService.getSiteDetails(data.siteId)
                ]);
                setCompanyName(comp?.name || 'Unknown Company');
                setSiteName(site?.name || 'Unknown Site');
            }
        } catch (e) {
            console.error("Failed to load profile", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;
        setIsSaving(true);
        try {
            let photoUrl = employee.profilePhotoUrl;
            if (photoFile) {
                // Reuse existing upload logic (it creates a base64 string or url)
                photoUrl = await dbService.uploadSiteLogo(photoFile); 
            }

            const updates: Partial<Employee> = {
                mobile: editForm.mobile,
                personalEmail: editForm.personalEmail,
                address: editForm.address,
                profilePhotoUrl: photoUrl
            };

            await dbService.updateEmployeeProfile(employee.uan, updates);
            
            // Refresh Data
            setEmployee(prev => prev ? { ...prev, ...updates } : null);
            setIsEditing(false);
            setPhotoFile(null);
        } catch (error) {
            console.error(error);
            alert("Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>;
    if (!employee) return <div className="text-center p-8 text-slate-500">Profile not found.</div>;

    return (
        <Card className="max-w-2xl mx-auto animate-fade-in" noPadding>
            
            {/* Header / Banner */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 md:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                
                <div className="relative z-10 flex flex-col items-center sm:items-start gap-4">
                    <div className="flex justify-between w-full items-start">
                         <div className="h-24 w-24 rounded-full border-4 border-white/20 bg-white shadow-xl overflow-hidden relative">
                             {employee.profilePhotoUrl ? (
                                 <img src={employee.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                                     <UserCircle className="w-12 h-12" />
                                 </div>
                             )}
                         </div>
                         {!isEditing && (
                             <button 
                                onClick={() => setIsEditing(true)}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md transition-colors flex items-center gap-2"
                             >
                                <Edit className="w-3 h-3" /> Edit Profile
                             </button>
                         )}
                    </div>
                    
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{employee.name}</h2>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium backdrop-blur-sm">{employee.role}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold backdrop-blur-sm ${employee.status === 'APPROVED' ? 'bg-green-500/20 text-green-100' : 'bg-orange-500/20 text-orange-100'}`}>
                                {employee.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-6">
                {isEditing ? (
                    <form onSubmit={handleSave} className="space-y-5 animate-fade-in">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-4">
                            <ImageUpload 
                                label="Update Profile Photo"
                                currentImage={employee.profilePhotoUrl}
                                onImageSelected={setPhotoFile}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField 
                                label="Mobile Number" 
                                value={editForm.mobile} 
                                onChange={e => setEditForm({...editForm, mobile: e.target.value})}
                                icon={Phone}
                                placeholder="+91"
                            />
                            <InputField 
                                label="Personal Email" 
                                value={editForm.personalEmail} 
                                onChange={e => setEditForm({...editForm, personalEmail: e.target.value})}
                                icon={Mail}
                                type="email"
                                placeholder="name@example.com"
                            />
                        </div>
                        <InputField 
                            label="Current Address" 
                            value={editForm.address} 
                            onChange={e => setEditForm({...editForm, address: e.target.value})}
                            icon={Home}
                            placeholder="Full Address"
                        />

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                            <Button type="submit" variant="primary" icon={Save} isLoading={isSaving}>Save Changes</Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        {/* Personal Contact Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                                    <Phone className="w-3 h-3" /> Mobile
                                </label>
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {employee.mobile || <span className="text-slate-400 italic text-sm">Not Provided</span>}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                                    <Mail className="w-3 h-3" /> Email
                                </label>
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {employee.personalEmail || <span className="text-slate-400 italic text-sm">Not Provided</span>}
                                </p>
                            </div>
                            <div className="md:col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                                    <Home className="w-3 h-3" /> Address
                                </label>
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {employee.address || <span className="text-slate-400 italic text-sm">Not Provided</span>}
                                </p>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                        {/* Official Details */}
                        <div>
                             <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-sm">Official Employment Details</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                        <BadgeCheck className="w-3.5 h-3.5" /> UAN (ID)
                                    </label>
                                    <p className="font-mono text-base font-bold text-slate-800 dark:text-slate-200 tracking-wider">{employee.uan}</p>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" /> Date of Joining
                                    </label>
                                    <p className="font-medium text-base text-slate-800 dark:text-slate-200">{employee.joinedDate}</p>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5" /> Company
                                    </label>
                                    <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{companyName}</p>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5" /> Work Site
                                    </label>
                                    <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{siteName}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};