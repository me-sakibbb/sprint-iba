import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useStorage() {
    const [uploading, setUploading] = useState(false);

    /**
     * Upload a file to a Supabase Storage bucket
     * @param bucket - The storage bucket name
     * @param file - The file to upload
     * @param path - Optional custom path (defaults to timestamp + filename)
     * @returns The uploaded file path or null if failed
     */
    const uploadFile = async (
        bucket: string,
        file: File,
        path?: string
    ): Promise<string | null> => {
        setUploading(true);
        try {
            const fileName = path || `${Date.now()}-${file.name}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return fileName;
        } catch (error: any) {
            console.error('Error uploading file:', error);
            toast.error(error.message || 'Failed to upload file');
            return null;
        } finally {
            setUploading(false);
        }
    };

    /**
     * Delete a file from a Supabase Storage bucket
     * @param bucket - The storage bucket name
     * @param path - The file path to delete
     */
    const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .remove([path]);

            if (error) throw error;
            return true;
        } catch (error: any) {
            console.error('Error deleting file:', error);
            toast.error(error.message || 'Failed to delete file');
            return false;
        }
    };

    /**
     * Get public URL for a file in a storage bucket
     * @param bucket - The storage bucket name
     * @param path - The file path
     */
    const getPublicUrl = (bucket: string, path: string): string => {
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return data.publicUrl;
    };

    return {
        uploadFile,
        deleteFile,
        getPublicUrl,
        uploading,
    };
}
