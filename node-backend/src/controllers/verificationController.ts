import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { v4 as uuidv4 } from 'uuid';
import { uploadMedia } from '../services/cloudinary';
import { NotificationDispatcher } from '../services/notificationDispatcher';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_LIVE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateMediaPayload(input: any, allowedTypes: string[]): { valid: boolean; error?: string } {
  if (Buffer.isBuffer(input)) {
    if (input.length > MAX_FILE_SIZE) {
      return { valid: false, error: "File size exceeds the 5MB limit." };
    }
    // Check magic bytes to prevent MIME-spoofing
    const isJpeg = input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
    const isPng = input.length >= 4 && input[0] === 0x89 && input[1] === 0x50 && input[2] === 0x4e && input[3] === 0x47;
    const isPdf = input.length >= 4 && input[0] === 0x25 && input[1] === 0x50 && input[2] === 0x44 && input[3] === 0x46;
    const isWebp = input.length >= 12 && input.slice(0, 4).toString('ascii') === 'RIFF' && input.slice(8, 12).toString('ascii') === 'WEBP';

    let detectedMime = '';
    if (isJpeg) detectedMime = 'image/jpeg';
    else if (isPng) detectedMime = 'image/png';
    else if (isWebp) detectedMime = 'image/webp';
    else if (isPdf) detectedMime = 'application/pdf';

    if (!detectedMime || !allowedTypes.includes(detectedMime)) {
      return { valid: false, error: `Invalid file format. Allowed formats: ${allowedTypes.join(', ')}` };
    }
    return { valid: true };
  }

  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      const match = input.match(/^data:([a-zA-Z0-9\/+-]+);base64,(.+)$/);
      if (!match) {
        return { valid: false, error: "Invalid base64 Data URL format." };
      }
      const mime = match[1].toLowerCase();
      if (!allowedTypes.includes(mime)) {
        return { valid: false, error: `Invalid file format (${mime}). Allowed formats: ${allowedTypes.join(', ')}` };
      }
      const base64Data = match[2];
      const approxSizeBytes = Math.ceil((base64Data.length * 3) / 4);
      if (approxSizeBytes > MAX_FILE_SIZE) {
        return { valid: false, error: "File size exceeds the 5MB limit." };
      }
      return { valid: true };
    }

    if (input.startsWith('http://') || input.startsWith('https://')) {
      return { valid: true };
    }

    return { valid: false, error: "Unsupported media format." };
  }

  return { valid: false, error: "Unsupported media payload." };
}

export const uploadDoc = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const contentType = c.req.header('content-type') || '';
    let mediaInput: any = null;

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['file'] || body['document'] || body['doc'];
      if (file && typeof file === 'object' && 'arrayBuffer' in (file as any)) {
        const fileObj = file as any;
        if (fileObj.size && fileObj.size > MAX_FILE_SIZE) {
          return c.json(ApiResponse.error("File size exceeds 5MB limit"), 400 as any);
        }
        if (fileObj.type && !ALLOWED_DOC_TYPES.includes(fileObj.type.toLowerCase())) {
          return c.json(ApiResponse.error(`Invalid file type: ${fileObj.type}. Allowed: ${ALLOWED_DOC_TYPES.join(', ')}`), 400 as any);
        }
        const arrayBuf = await fileObj.arrayBuffer();
        mediaInput = Buffer.from(arrayBuf);
      } else if (typeof file === 'string') {
        mediaInput = file;
      }
    } else {
      const jsonBody = await c.req.json().catch(() => ({}));
      mediaInput = jsonBody.image || jsonBody.file || jsonBody.docImageUrl || jsonBody.doc_image_url || jsonBody.dataUrl || jsonBody.base64;
    }

    if (!mediaInput) {
      return c.json(ApiResponse.error("No document image provided"), 400 as any);
    }

    // Security Gate: Strict MIME & payload validation
    const validation = validateMediaPayload(mediaInput, ALLOWED_DOC_TYPES);
    if (!validation.valid) {
      return c.json(ApiResponse.error(validation.error || "Invalid document format"), 400 as any);
    }

    const result = await uploadMedia(mediaInput, 'verifications/docs');
    const docUrl = result.secure_url;

    let record = await prisma.verification_records.findFirst({ where: { user_id: userId } });
    if (!record) {
      record = await prisma.verification_records.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          doc_image_url: docUrl,
          status: 'PENDING',
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    } else {
      record = await prisma.verification_records.update({
        where: { id: record.id },
        data: { doc_image_url: docUrl, updated_at: new Date() }
      });
    }

    return c.json(ApiResponse.ok("Document uploaded", record));
  } catch (err: any) {
    console.error("uploadDoc error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const captureLive = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const contentType = c.req.header('content-type') || '';
    let mediaInput: any = null;

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['file'] || body['live'] || body['image'];
      if (file && typeof file === 'object' && 'arrayBuffer' in (file as any)) {
        const fileObj = file as any;
        if (fileObj.size && fileObj.size > MAX_FILE_SIZE) {
          return c.json(ApiResponse.error("File size exceeds 5MB limit"), 400 as any);
        }
        if (fileObj.type && !ALLOWED_LIVE_TYPES.includes(fileObj.type.toLowerCase())) {
          return c.json(ApiResponse.error(`Invalid image type: ${fileObj.type}. Allowed: ${ALLOWED_LIVE_TYPES.join(', ')}`), 400 as any);
        }
        const arrayBuf = await fileObj.arrayBuffer();
        mediaInput = Buffer.from(arrayBuf);
      } else if (typeof file === 'string') {
        mediaInput = file;
      }
    } else {
      const jsonBody = await c.req.json().catch(() => ({}));
      mediaInput = jsonBody.image || jsonBody.liveImageUrl || jsonBody.live_image_url || jsonBody.dataUrl || jsonBody.base64;
    }

    if (!mediaInput) {
      return c.json(ApiResponse.error("No live capture image provided"), 400 as any);
    }

    // Security Gate: Strict MIME & payload validation for live photo
    const validation = validateMediaPayload(mediaInput, ALLOWED_LIVE_TYPES);
    if (!validation.valid) {
      return c.json(ApiResponse.error(validation.error || "Invalid live photo format"), 400 as any);
    }

    const result = await uploadMedia(mediaInput, 'verifications/live');
    const liveUrl = result.secure_url;

    let record = await prisma.verification_records.findFirst({ where: { user_id: userId } });
    if (!record) {
       return c.json(ApiResponse.error("Please upload document before live photo verification"), 400 as any);
    }

    record = await prisma.verification_records.update({
      where: { id: record.id },
      data: {
        live_image_url: liveUrl,
        status: 'PENDING', // Awaits administrative / KYC validation
        updated_at: new Date()
      }
    });

    // Dispatch Synchronized Notification for submission
    await NotificationDispatcher.dispatch({
      userId,
      title: "Verification Submitted For Review ⏳",
      message: "Your document and live selfie have been securely received. Our compliance team will review your credentials within 24 hours.",
      type: "KYC_PENDING",
      link: "/profile",
      data: { verificationId: String(record.id) }
    }).catch(() => {});

    return c.json(ApiResponse.ok("Live capture submitted for verification review", record));
  } catch (err: any) {
    console.error("captureLive error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getStatus = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const record = await prisma.verification_records.findFirst({ where: { user_id: userId } });
    return c.json(ApiResponse.ok(record || { status: 'NOT_SUBMITTED' }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
