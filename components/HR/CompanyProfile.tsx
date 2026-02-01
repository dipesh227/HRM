import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { InputField } from '../UI/InputField';
import { dbService } from '../../services/mockDb';
import { Company } from '../../types';
import { Building, Mail, Phone, MapPin, ImageIcon, Save } from 'lucide-react';

interface Props {
    showNotification: (type: 'success' | 'error', msg: string) => void;
}

export const CompanyProfile: React.FC<Props> = ({ showNotification }) => {
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    // Assuming single company for now as per previous mock (ID: c1 or from DB)
    // In a real multi-tenant scenario, we'd get this from the user's companyId
    const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Default seeded ID

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await dbService.getCompanyProfile(COMPANY_ID);
            if (data) setCompany(data);
        } catch (e) {
            console.error(e);
            showNotification('error', "Failed to load company profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;
        setSaving(true);
        try {
            let logoUrl = company.logoUrl;
            if (logoFile) {
                logoUrl = await dbService.uploadSiteLogo(logoFile); // Reusing site logo upload for company
            }
            await dbService.updateCompanyProfile(company.id, { ...company, logoUrl });
            showNotification('success', "Company profile updated successfully.");
        } catch (e: any) {
            showNotification('error', e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!company) return <div>Company profile not found.</div>;

    return (
        <Card title="Company Profile" className="max-w-3xl mx-auto animate-fade-in">
            <form onSubmit={handleSave} className="space-y-6">
                
                {/* Header Section */}
                <div className="flex items-start gap-6">
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative group">
                        {logoFile ? (
                            <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-cover" alt="Preview" />
                        ) : company.logoUrl ? (
                            <img src={company.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                            <Building className="w-10 h-10 text-slate-400" />
                        )}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <ImageIcon className="w-6 h-6 text-white" />
                            <input type="file" accept="image/*" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                        </label>
                    </div>
                    <div className="flex-1">
                         <h3 className="text-xl font-bold text-slate-900 dark:text-white">{company.name}</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">Client ID: {company.clientId}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField 
                        label="Company Name" 
                        value={company.name} 
                        onChange={e => setCompany({...company, name: e.target.value})}
                        icon={Building}
                        required
                    />
                    <InputField 
                        label="Email Address" 
                        value={company.email || ''} 
                        onChange={e => setCompany({...company, email: e.target.value})}
                        icon={Mail}
                        type="email"
                    />
                    <InputField 
                        label="Contact Number" 
                        value={company.mobile || ''} 
                        onChange={e => setCompany({...company, mobile: e.target.value})}
                        icon={Phone}
                    />
                    <InputField 
                        label="Headquarters Address" 
                        value={company.address || ''} 
                        onChange={e => setCompany({...company, address: e.target.value})}
                        icon={MapPin}
                    />
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button type="submit" variant="primary" icon={Save} isLoading={saving}>Save Changes</Button>
                </div>
            </form>
        </Card>
    );
};