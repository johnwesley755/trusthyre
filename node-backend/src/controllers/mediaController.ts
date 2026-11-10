import { Context } from 'hono';
import prisma from '../config/prisma';
import { uploadMedia, deleteMedia } from '../services/cloudinary';
import { ApiResponse } from '../utils/ApiResponse';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
const DANGEROUS_EXTENSIONS = ['.html', '.htm', '.svg', '.exe', '.sh', '.bat', '.cmd', '.php', '.js', '.vbs', '.py'];

const isPrivateIp = (host: string): boolean => {
  const clean = host.toLowerCase().trim();
  if (clean === 'localhost' || clean === '127.0.0.1' || clean === '0.0.0.0' || clean === '::1') return true;
  if (clean === '169.254.169.254') return true; // Cloud metadata service
  if (/^10\./.test(clean)) return true;
  if (/^192\.168\./.test(clean)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  return false;
};

export const upload = async (c: Context) => {
  try {
    const contentType = c.req.header('content-type') || '';
    let mediaInput: any = null;

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['file'] || body['image'] || body['document'];
      if (file && typeof file === 'object' && 'arrayBuffer' in (file as any)) {
        const fileObj = file as any;
        const mimeType = fileObj.type || '';
        const fileName = (fileObj.name || '').toLowerCase();

        // Security Gate: Reject unapproved MIME types and dangerous executable extensions
        if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
          return c.json(ApiResponse.error(`Unsupported file type: ${mimeType}. Allowed formats: JPEG, PNG, WebP, PDF`), 400 as any);
        }

        if (DANGEROUS_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
          return c.json(ApiResponse.error("Executable and script files are not allowed"), 400 as any);
        }

        const arrayBuf = await fileObj.arrayBuffer();
        if (arrayBuf.byteLength > 10 * 1024 * 1024) {
          return c.json(ApiResponse.error("File size exceeds 10MB limit"), 400 as any);
        }
        mediaInput = Buffer.from(arrayBuf);
      } else if (typeof file === 'string') {
        mediaInput = file;
      }
    } else {
      const jsonBody = await c.req.json().catch(() => ({}));
      mediaInput = jsonBody.image || jsonBody.file || jsonBody.dataUrl || jsonBody.base64 || jsonBody.url;

      // Security Gate: SSRF Protection for URL-based uploads
      if (typeof mediaInput === 'string' && (mediaInput.startsWith('http://') || mediaInput.startsWith('https://'))) {
        try {
          const parsed = new URL(mediaInput);
          if (isPrivateIp(parsed.hostname)) {
            return c.json(ApiResponse.error("Forbidden: Cannot upload from internal or private network addresses"), 403 as any);
          }
        } catch {
          return c.json(ApiResponse.error("Invalid upload URL provided"), 400 as any);
        }
      }

      // Security Gate: Data-URL MIME check
      if (typeof mediaInput === 'string' && mediaInput.startsWith('data:')) {
        const header = mediaInput.split(';')[0].toLowerCase();
        const isAllowedDataUrl = ALLOWED_MIME_TYPES.some(m => header.includes(m));
        if (!isAllowedDataUrl) {
          return c.json(ApiResponse.error("Unsupported data-URL format. Allowed formats: JPEG, PNG, WebP, PDF"), 400 as any);
        }
      }
    }

    if (!mediaInput) {
      return c.json(ApiResponse.error("No file or image provided for upload"), 400 as any);
    }

    const result = await uploadMedia(mediaInput, 'media');
    return c.json(ApiResponse.ok("File uploaded successfully", {
      url: result.secure_url,
      publicId: result.public_id,
      format: (result as any).format || 'jpg',
      width: (result as any).width || 800,
      height: (result as any).height || 600
    }));
  } catch (err: any) {
    console.error("Upload error in mediaController:", err);
    return c.json(ApiResponse.error(err.message || "Upload failed"), 500 as any);
  }
};

export const remove = async (c: Context) => {
  try {
    const authUser = c.get('user');
    if (!authUser?.sub) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const id = c.req.param('id') as string;
    if (!id) return c.json(ApiResponse.error("Media ID required"), 400 as any);

    // Security Gate: Validate asset ownership
    if (authUser.role !== 'ADMIN') {
      const [userWithMedia, workerWithMedia, verificationWithMedia] = await Promise.all([
        prisma.user_metadata.findFirst({
          where: {
            id: authUser.sub,
            profile_image_url: { contains: id }
          }
        }),
        prisma.worker_profiles.findFirst({
          where: {
            user_id: authUser.sub,
            OR: [
              { profile_image_url: { contains: id } },
              { resume_url: { contains: id } }
            ]
          }
        }),
        prisma.verification_records.findFirst({
          where: {
            user_id: authUser.sub,
            OR: [
              { doc_image_url: { contains: id } },
              { live_image_url: { contains: id } }
            ]
          }
        })
      ]);

      const isOwner = Boolean(userWithMedia || workerWithMedia || verificationWithMedia);
      if (!isOwner) {
        return c.json(ApiResponse.error("Forbidden: You do not own this media asset."), 403 as any);
      }
    }

    const result = await deleteMedia(id);
    return c.json(ApiResponse.ok("File deleted", result));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
