import { Context } from 'hono';
import prisma from '../config/prisma';
import { uploadMedia, deleteMedia } from '../services/cloudinary';
import { ApiResponse } from '../utils/ApiResponse';
import { validateFileSignature, sanitizeFileName } from '../utils/fileSignature';
import { isAppAdmin } from '../utils/roles';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf',
  'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'
];
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
    let detectedMime = 'image/jpeg';

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['file'] || body['image'] || body['document'] || body['audio'];
      if (file && typeof file === 'object' && 'arrayBuffer' in (file as any)) {
        const fileObj = file as any;
        const mimeType = fileObj.type || '';
        const fileName = (fileObj.name || '').toLowerCase();
        detectedMime = mimeType;

        // Security Gate: Reject unapproved MIME types and dangerous executable extensions
        if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
          return c.json(ApiResponse.error(`Unsupported file type: ${mimeType}. Allowed formats: Images, PDF, Audio`), 400 as any);
        }

        if (DANGEROUS_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
          return c.json(ApiResponse.error("Executable and script files are not allowed"), 400 as any);
        }

        const arrayBuf = await fileObj.arrayBuffer();
        if (arrayBuf.byteLength > 15 * 1024 * 1024) {
          return c.json(ApiResponse.error("File size exceeds 15MB limit"), 400 as any);
        }
        const fileBuffer = Buffer.from(arrayBuf);

        // Security Gate: Binary Magic-Bytes & Malware Signature Inspection
        const signatureCheck = validateFileSignature(fileBuffer, mimeType);
        if (!signatureCheck.valid) {
          return c.json(ApiResponse.error(signatureCheck.error || "File signature mismatch or potentially malicious payload"), 400 as any);
        }

        mediaInput = fileBuffer;
      } else if (typeof file === 'string') {
        mediaInput = file;
      }
    } else {
      const jsonBody = await c.req.json().catch(() => ({}));
      mediaInput = jsonBody.image || jsonBody.file || jsonBody.dataUrl || jsonBody.base64 || jsonBody.url || jsonBody.audio;

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

      // Security Gate: Data-URL MIME check and binary signature inspection
      if (typeof mediaInput === 'string' && mediaInput.startsWith('data:')) {
        const header = mediaInput.split(';')[0].toLowerCase();
        detectedMime = header.replace('data:', '');
        const isAllowedDataUrl = ALLOWED_MIME_TYPES.some(m => header.includes(m));
        if (!isAllowedDataUrl) {
          return c.json(ApiResponse.error("Unsupported data-URL format. Allowed formats: Images, PDF, Audio"), 400 as any);
        }

        const base64Content = mediaInput.split(',')[1];
        if (base64Content) {
          const decodedBuffer = Buffer.from(base64Content, 'base64');
          const signatureCheck = validateFileSignature(decodedBuffer, detectedMime);
          if (!signatureCheck.valid) {
            return c.json(ApiResponse.error(signatureCheck.error || "Data URL binary signature mismatch"), 400 as any);
          }
        }
      }
    }

    if (!mediaInput) {
      return c.json(ApiResponse.error("No file or image provided for upload"), 400 as any);
    }

    const result = await uploadMedia(mediaInput, 'media', detectedMime);

    // Security & Audit: Persist asset record with owner_id for deterministic RLS ownership
    const authUser = c.get('user');
    if (authUser?.sub && result?.public_id) {
      const rawFileName = (result as any).original_filename || '';
      const safeName = rawFileName ? sanitizeFileName(rawFileName) : null;
      await prisma.media_assets.create({
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          file_name: safeName,
          file_type: detectedMime,
          file_size: (result as any).bytes ? BigInt((result as any).bytes) : null,
          owner_id: authUser.sub,
          created_at: new Date()
        }
      }).catch((e: any) => console.warn("[MediaController] DB record note:", e?.message));
    }

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

    // Security Gate: Validate asset ownership via direct RLS-backed media_assets or legacy profile links
    if (!isAppAdmin(authUser.role)) {
      const ownedAsset = await prisma.media_assets.findFirst({
        where: {
          public_id: id,
          owner_id: authUser.sub
        }
      });

      if (!ownedAsset) {
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
    }

    const result = await deleteMedia(id);
    await prisma.media_assets.deleteMany({
      where: { public_id: id }
    }).catch(() => {});

    return c.json(ApiResponse.ok("File deleted", result));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
