import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mediaService } from '../../../services/media.service';

interface UploadedFile {
    id: string;
    name: string;
    size: number;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
    url?: string;
}

interface AdvancedFileUploadProps {
    onUploadSuccess: (urls: string[]) => void;
    maxFiles?: number;
    initialUrls?: string[];
    trigger?: (open: () => void) => React.ReactNode;
    label?: string;
    accept?: string;
}

export const AdvancedFileUpload: React.FC<AdvancedFileUploadProps> = ({ 
    onUploadSuccess, 
    maxFiles = 5,
    initialUrls = [],
    trigger,
    label
}) => {
    const [files, setFiles] = useState<UploadedFile[]>(() => 
        initialUrls.map(url => ({
            id: Math.random().toString(36).substr(2, 9),
            name: 'Existing Image',
            size: 0,
            progress: 100,
            status: 'completed',
            url
        }))
    );
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = async (newFiles: FileList | null) => {
        if (!newFiles) return;

        const incomingFiles = Array.from(newFiles).slice(0, maxFiles - files.length);
        
        const newUploads: UploadedFile[] = incomingFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'uploading'
        }));

        setFiles(prev => [...prev, ...newUploads]);

        for (let i = 0; i < incomingFiles.length; i++) {
            const file = incomingFiles[i];
            const uploadId = newUploads[i].id;

            try {
                const response = await mediaService.uploadFile(file, (progress) => {
                    setFiles(current => current.map(f => 
                        f.id === uploadId ? { ...f, progress } : f
                    ));
                });

                setFiles(current => {
                    const updated = current.map(f => 
                        f.id === uploadId ? { ...f, status: 'completed' as const, url: response.url, progress: 100 } : f
                    );
                    const completedUrls = updated.filter(f => f.status === 'completed').map(f => f.url!);
                    onUploadSuccess(completedUrls);
                    return updated;
                });
            } catch (err) {
                console.error('Upload error:', err);
                setFiles(current => current.map(f => 
                    f.id === uploadId ? { ...f, status: 'error' as const } : f
                ));
            }
        }
    };

    const removeFile = (id: string) => {
        setFiles(current => {
            const updated = current.filter(f => f.id !== id);
            const completedUrls = updated.filter(f => f.status === 'completed').map(f => f.url!);
            onUploadSuccess(completedUrls);
            return updated;
        });
    };

    useEffect(() => {
        if (initialUrls.length > 0 && files.length === 0) {
            setFiles(initialUrls.map(url => ({
                id: Math.random().toString(36).substr(2, 9),
                name: 'Existing Image',
                size: 0,
                progress: 100,
                status: 'completed',
                url
            })));
        }
    }, [initialUrls, files.length]);

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    if (trigger) {
        return (
            <div className="relative">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => handleFiles(e.target.files)} 
                    className="hidden" 
                    accept="image/*"
                />
                {/* eslint-disable-next-line @typescript-eslint/no-unsafe-call */}
                {(trigger as any)(openFilePicker)}
                
                <AnimatePresence>
                    {files.length > 0 && files[0].status === 'uploading' && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] rounded-full flex items-center justify-center z-20 pointer-events-none"
                        >
                            <div className="w-12 h-12 rounded-full border-4 border-primary-fixed border-t-transparent animate-spin" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className="relative group cursor-pointer"
        >
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => handleFiles(e.target.files)} 
                className="hidden" 
                accept="image/*"
            />
            
            <div className={`
                w-24 h-24 rounded-full bg-slate-100 dark:bg-[#121215] flex items-center justify-center border-2 border-dashed transition-all
                ${isDragging ? 'border-primary-fixed bg-primary-fixed/10' : 'border-slate-300 dark:border-zinc-700 group-hover:border-[#0f2f63] dark:group-hover:border-[#38BDF8]'}
                overflow-hidden
            `}>
                {files.length > 0 && files[0].url ? (
                    <img src={files[0].url} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                    <span className="material-symbols-outlined text-4xl text-outline">add_a_photo</span>
                )}
            </div>

            <div className="absolute -bottom-1 -right-1 bg-[#0f2f63] dark:bg-[#0066FF] text-white p-1.5 rounded-full shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-sm font-bold">edit</span>
            </div>

            <AnimatePresence>
                {files.length > 0 && (files[0].status === 'uploading' || files[0].status === 'error') && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-xl bottom-0 bg-surface/90 flex flex-col items-center justify-center p-1 text-center"
                        onClick={(e) => { e.stopPropagation(); removeFile(files[0].id); }}
                    >
                        {files[0].status === 'uploading' ? (
                            <>
                                <div className="w-16 h-1 bg-primary/10 rounded-full overflow-hidden mb-1">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${files[0].progress}%` }}
                                        className="h-full bg-primary-fixed"
                                    />
                                </div>
                                <span className="text-[7px] font-black uppercase text-primary leading-none">{files[0].progress}%</span>
                            </>
                        ) : (
                            <span className="text-[7px] font-black uppercase text-error leading-none">Retry</span>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
