import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { InputField } from '../UI/InputField';
import { ImageUpload } from '../UI/ImageUpload';
import { dbService } from '../../services/mockDb';
import { Company } from '../../types';
import { Building, Mail, Phone, MapPin, Save, Stamp, PenTool } from 'lucide-react';

interface Props {
    showNotification: (type: 'success' | 'error', msg: string) => void;
}

export const CompanyProfile: React.FC<Props> = ({ showNotification }) => {
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // File states
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [stampFile, setStampFile] = useState<File | null>(null);

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
            let signatureUrl = company.signatureUrl;
            let stampUrl = company.stampUrl;

            // Upload files if new ones are selected
            if (logoFile) logoUrl = await dbService.uploadSiteLogo(logoFile); 
            if (signatureFile) signatureUrl = await dbService.uploadSiteLogo(signatureFile);
            if (stampFile) stampUrl = await dbService.uploadSiteLogo(stampFile);

            await dbService.updateCompanyProfile(company.id, { 
                ...company, 
                logoUrl,
                signatureUrl,
                stampUrl
            });
            
            showNotification('success', "Company profile updated successfully.");
            
            // Reset file inputs
            setLogoFile(null); 
            setSignatureFile(null);
            setStampFile(null);

        } catch (e: any) {
            showNotification('error', e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!company) return <div>Company profile not found.</div>;

    return (
        <Card title="Company Profile" className="max-w-4xl mx-auto animate-fade-in">
            <form onSubmit={handleSave} className="space-y-8">
                
                {/* Branding Section */}
                <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-6">
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Building className="w-5 h-5 text-ios-blue" />
                        Brand Assets
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         {/* Logo */}
                         <div className="flex flex-col items-center">
                            <ImageUpload 
                                label="Company Logo"
                                currentImage={company.logoUrl}
                                onImageSelected={setLogoFile}
                                className="w-full max-w-[200px]"
                            />
                            <p className="text-xs text-slate-400 mt-2 text-center">Appears on Header</p>
                         </div>

                         {/* Signature */}
                         <div className="flex flex-col items-center">
                            <ImageUpload 
                                label="Authorized Signature"
                                currentImage={company.signatureUrl}
                                onImageSelected={setSignatureFile}
                                className="w-full max-w-[200px]"
                            />
                            <p className="text-xs text-slate-400 mt-2 text-center">Appears on Payslip Footer</p>
                         </div>

                         {/* Stamp */}
                         <div className="flex flex-col items-center">
                            <ImageUpload 
                                label="Company Stamp / Seal"
                                currentImage={company.stampUrl}
                                onImageSelected={setStampFile}
                                className="w-full max-w-[200px]"
                            />
                            <p className="text-xs text-slate-400 mt-2 text-center">Appears on Payslip Footer</p>
                         </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="space-y-6">
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <MapPin className="w-5 h-5 text-ios-blue" />
                        Details
                    </h4>
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
                </div>

                <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                    <Button type="submit" variant="primary" icon={Save} isLoading={saving} size="lg">Save Changes</Button>
                </div>
            </form>
        </Card>
    );
};