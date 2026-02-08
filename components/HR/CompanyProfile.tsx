import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { InputField } from '../UI/InputField';
import { ImageUpload } from '../UI/ImageUpload';
import { dbService } from '../../services/mockDb';
import { Company } from '../../types';
import { Building, Mail, Phone, MapPin, Save, Globe, LayoutTemplate } from 'lucide-react';

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
    const [faviconFile, setFaviconFile] = useState<File | null>(null);

    const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            // Corrected method name from getCompanyProfile to getCompanyDetails
            const data = await dbService.getCompanyDetails(COMPANY_ID);
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
            let faviconUrl = company.faviconUrl;

            // Upload files if new ones are selected
            const upload = async (file: File | null) => file ? await dbService.uploadSiteLogo(file) : undefined;

            const [newLogo, newSig, newStamp, newFavicon] = await Promise.all([
                upload(logoFile),
                upload(signatureFile),
                upload(stampFile),
                upload(faviconFile)
            ]);

            await dbService.updateCompanyProfile(company.id, { 
                ...company, 
                logoUrl: newLogo || logoUrl,
                signatureUrl: newSig || signatureUrl,
                stampUrl: newStamp || stampUrl,
                faviconUrl: newFavicon || faviconUrl
            });
            
            showNotification('success', "Company profile updated successfully.");
            
            // Reload page to reflect branding changes
            if (newFavicon || company.metaTitle !== document.title) {
                setTimeout(() => window.location.reload(), 1500);
            }

            // Reset file inputs
            setLogoFile(null); 
            setSignatureFile(null);
            setStampFile(null);
            setFaviconFile(null);

        } catch (e: any) {
            showNotification('error', e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!company) return <div>Company profile not found.</div>;

    return (
        <Card title="Company Profile & Branding" className="max-w-4xl mx-auto animate-fade-in">
            <form onSubmit={handleSave} className="space-y-8">
                
                {/* Branding Section */}
                <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-6">
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Building className="w-5 h-5 text-ios-blue" />
                        Brand Assets
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                         {/* Logo */}
                         <div className="flex flex-col items-center">
                            <ImageUpload 
                                label="Portal Logo"
                                currentImage={company.logoUrl}
                                onImageSelected={setLogoFile}
                                className="w-full"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 text-center">Login & Header</p>
                         </div>

                         {/* Favicon */}
                         <div className="flex flex-col items-center">
                            <ImageUpload 
                                label="Browser Favicon"
                                currentImage={company.faviconUrl}
                                onImageSelected={setFaviconFile}
                                className="w-full"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 text-center">Browser Tab Icon</p>
                         </div>

                         {/* Signature */}
                         <div className="flex flex-col items-center">
                            <ImageUpload 
                                label="Authorized Signature"
                                currentImage={company.signatureUrl}
                                onImageSelected={setSignatureFile}
                                className="w-full"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 text-center">Payslip Footer</p>
                         </div>

                         {/* Stamp */}
                         <div className="flex flex-col items-center">
                            <ImageUpload 
                                label="Company Stamp"
                                currentImage={company.stampUrl}
                                onImageSelected={setStampFile}
                                className="w-full"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 text-center">Payslip Footer</p>
                         </div>
                    </div>
                </div>

                {/* Portal Metadata */}
                <div className="space-y-6">
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <Globe className="w-5 h-5 text-ios-blue" />
                        Portal Metadata
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField 
                            label="Browser Tab Title" 
                            value={company.metaTitle || ''} 
                            onChange={e => setCompany({...company, metaTitle: e.target.value})}
                            icon={LayoutTemplate}
                            placeholder="e.g. Acme HR Portal"
                        />
                        <InputField 
                            label="Meta Description" 
                            value={company.metaDescription || ''} 
                            onChange={e => setCompany({...company, metaDescription: e.target.value})}
                            icon={LayoutTemplate}
                            placeholder="e.g. Employee Management System"
                        />
                    </div>
                </div>

                {/* Details Section */}
                <div className="space-y-6">
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <MapPin className="w-5 h-5 text-ios-blue" />
                        Contact Details
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