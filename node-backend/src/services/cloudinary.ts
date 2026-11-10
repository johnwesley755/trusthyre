import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadMedia = async (mediaInput: string | Buffer, folder: string = 'trusthyre', mimeType: string = 'image/jpeg') => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.warn("Cloudinary credentials not configured in environment, returning direct reference");
      if (typeof mediaInput === 'string' && (mediaInput.startsWith('http') || mediaInput.startsWith('data:'))) {
        return { secure_url: mediaInput, public_id: `mock_${Date.now()}` };
      }
      return { secure_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60", public_id: `mock_${Date.now()}` };
    }

    if (Buffer.isBuffer(mediaInput)) {
      const base64Data = `data:${mimeType};base64,${mediaInput.toString('base64')}`;
      const result = await cloudinary.uploader.upload(base64Data, { folder, resource_type: 'auto' });
      return result;
    }

    const result = await cloudinary.uploader.upload(mediaInput, { folder, resource_type: 'auto' });
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

export const deleteMedia = async (publicId: string) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      return { result: 'ok' };
    }
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

export default cloudinary;
