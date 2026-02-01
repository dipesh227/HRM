import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { InputField } from '../UI/InputField';
import { ImageUpload } from '../UI/ImageUpload';
import { dbService } from '../../services/mockDb';
import { Company } from '../../types';
import { Building, Mail, Phone, MapPin, Save } from 'lucide-react';

interface Props {
    showNotification: (type: 'success' | 'error', msg: string) => void;
}

export const CompanyProfile: React.FC<Props> = ({ showNotification }) => {
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

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
                logoUrl = await dbService.uploadSiteLogo(logoFile); 
            }
            await dbService.updateCompanyProfile(company.id, { ...company, logoUrl });
            showNotification('success', "Company profile updated successfully.");
            setLogoFile(null); 
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
            <form onSubmit={handleSave} className="space-y-8">
                
                {/* Logo & Header Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                    <div className="w-full sm:w-auto flex justify-center">
                        <ImageUpload 
                            currentImage={company.logoUrl}
                            onImageSelected={setLogoFile}
                            className="w-40"
                        />
                    </div>
                    
                    <div className="text-center sm:text-left flex-1">
                         <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{company.name}</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-2 bg-white dark:bg-white/5 inline-block px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10">
                            Client ID: {company.clientId}
                         </p>
                         <p className="text-sm text-slate-400 mt-4 max-w-sm">
                            Upload a high-quality logo (PNG/JPG) for official documents and payslips.
                         </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                    <Button type="submit" variant="primary" icon={Save} isLoading={saving} size="lg">Save Changes</Button>
                </div>
            </form>
        </Card>
    );
};