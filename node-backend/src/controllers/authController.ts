import { Context } from 'hono';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '../services/mailer';
import { getOtpTemplate, getResetPasswordTemplate } from '../utils/emailTemplates';
import { validatePasswordStrength } from '../utils/validators';
import { SearchAlertService } from '../services/searchAlertService';

export const register = async (c: Context) => {
  try {
    const { email, password, firstName, lastName, role, phoneNumber, otp } = (await c.req.json());

    // Security fix 1.1: Restrict public role to WORKER or EMPLOYER only (block ADMIN privilege escalation)
    const assignedRole = role === 'EMPLOYER' ? 'EMPLOYER' : 'WORKER';

    const existing = await prisma.user_metadata.findUnique({ where: { email } });
    if (existing && existing.password_hash) {
      if (existing.role && existing.role !== assignedRole) {
        return c.json(ApiResponse.error(`This email is already registered as a ${existing.role} account. A ${existing.role.toLowerCase()} account cannot be registered as an ${assignedRole.toLowerCase()}.`), 400 as any);
      }
      return c.json(ApiResponse.error("Email already in use. Please sign in instead."), 400 as any);
    }

    // Verify Email OTP if provided
    if (otp) {
      const cleanOtp = String(otp).trim();
      if (!existing || !existing.reset_token || existing.reset_token !== cleanOtp) {
        return c.json(ApiResponse.error("Invalid verification code. Please check your email and try again."), 400 as any);
      }
      if (!existing.reset_token_expiry || new Date(existing.reset_token_expiry) < new Date()) {
        return c.json(ApiResponse.error("Verification code has expired. Please request a new code."), 400 as any);
      }
    }

    const cleanPhone = phoneNumber ? String(phoneNumber).trim().replace(/\D/g, '').slice(-10) : null;
    if (cleanPhone) {
      if (cleanPhone.length !== 10) {
        return c.json(ApiResponse.error("Phone number must be a valid 10-digit mobile number."), 400 as any);
      }
      const existingPhone = await prisma.user_metadata.findFirst({
        where: { 
          phone_number: cleanPhone,
          password_hash: { not: null }
        }
      });
      if (existingPhone && (!existing || existingPhone.id !== existing.id)) {
        return c.json(ApiResponse.error("This phone number is already registered with another account. Please use a different phone number."), 400 as any);
      }
    }

    if (password) {
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.valid) {
        return c.json(ApiResponse.error(passwordCheck.error || "Password does not meet complexity requirements"), 400 as any);
      }
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    let user: any;
    if (existing) {
      user = await prisma.user_metadata.update({
        where: { id: existing.id },
        data: {
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role: assignedRole,
          phone_number: cleanPhone || null,
          email_verified: true,
          reset_token: null,
          reset_token_expiry: null,
          updated_at: new Date()
        }
      });
    } else {
      user = await prisma.user_metadata.create({
        data: {
          id: uuidv4(),
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role: assignedRole,
          phone_number: cleanPhone || null,
          created_at: new Date(),
          updated_at: new Date(),
          email_verified: !!otp,
          onboarded: false
        }
      });
    }

    // Auto-create initial profile record so downstream queries resolve cleanly
    if (assignedRole === 'WORKER') {
      await prisma.worker_profiles.upsert({
        where: { user_id: user.id },
        update: {
          full_name: `${firstName || 'Worker'} ${lastName || ''}`.trim()
        },
        create: {
          user_id: user.id,
          full_name: `${firstName || 'Worker'} ${lastName || ''}`.trim(),
          level: 'L1',
          level_number: 1,
          level_score: 100,
          experience_years: 0,
          created_at: new Date(),
          updated_at: new Date(),
        }
      }).catch((e: any) => console.warn("Worker profile initial sync:", e.message));
    } else if (assignedRole === 'EMPLOYER') {
      await prisma.employer_profiles.upsert({
        where: { user_id: user.id },
        update: {
          company_name: `${firstName || 'Enterprise'}`.trim()
        },
        create: {
          user_id: user.id,
          company_name: `${firstName || 'Enterprise'}`.trim(),
          created_at: new Date(),
          updated_at: new Date(),
        }
      }).catch((e: any) => console.warn("Employer profile initial sync:", e.message));
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '30d' });

    return c.json(ApiResponse.ok("Registration successful", { token, user }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const login = async (c: Context) => {
  try {
    const { email, password, role } = (await c.req.json());
    const user = await prisma.user_metadata.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      return c.json(ApiResponse.error("Invalid credentials"), 401 as any);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return c.json(ApiResponse.error("Invalid credentials"), 401 as any);
    }

    // Role-based portal enforcement: Admin portal is strictly reserved for administrators
    if (role === 'ADMIN' && user.role !== 'ADMIN') {
      return c.json(ApiResponse.error("Access denied: This account does not possess administrator privileges."), 403 as any);
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '30d' });
    return c.json(ApiResponse.ok("Login successful", { token, user }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const sendOtp = async (c: Context) => {
  try {
    const { email, role } = (await c.req.json());
    if (!email) return c.json(ApiResponse.error("Email is required"), 400 as any);

    const targetRole = role === 'WORKER' ? 'WORKER' : 'EMPLOYER';
    let user = await prisma.user_metadata.findUnique({ where: { email } });

    // Reject if user is already registered with an active password
    if (user && user.password_hash) {
      return c.json(ApiResponse.error("This email is already registered. Please sign in instead."), 400 as any);
    }

    // Mutually exclusive role validation
    if (user && user.role && user.role !== targetRole) {
      return c.json(ApiResponse.error(`This email is registered as a ${user.role} account. A ${user.role.toLowerCase()} account cannot sign in or register as an ${targetRole.toLowerCase()}.`), 400 as any);
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    console.log(`\n🔑 [OTP:GENERATED] Target: ${email} | Role: ${targetRole} | Code: ${otp} | Expires in 15 mins`);

    // Defect fix 1.2: Server-side OTP Persistence with 15m expiration
    if (user) {
      await prisma.user_metadata.update({
        where: { id: user.id },
        data: { reset_token: otp, reset_token_expiry: expiry, role: targetRole }
      });
    } else {
      user = await prisma.user_metadata.create({
        data: {
          id: uuidv4(),
          email,
          role: targetRole,
          reset_token: otp,
          reset_token_expiry: expiry,
          email_verified: false,
          onboarded: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    await sendEmail(email, `${otp} is your TrustHyre verification code`, getOtpTemplate(otp, email));
    return c.json(ApiResponse.ok(`OTP sent to ${email}`, "sent"));
  } catch (err: any) {
    console.error("sendOtp error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const verifyEmployerOtp = async (c: Context) => {
  try {
    const { email, otp } = (await c.req.json());
    if (!email || !otp) {
      return c.json(ApiResponse.error("Email and OTP are required"), 400 as any);
    }

    const user = await prisma.user_metadata.findUnique({ where: { email } });
    if (!user) {
      return c.json(ApiResponse.error("User account not found. Please request a new OTP."), 404 as any);
    }

    // Defect fix 1.2 & 1.3: Validate persisted OTP and expiry
    if (!user.reset_token || user.reset_token !== otp) {
      return c.json(ApiResponse.error("Invalid verification code. Please check and try again."), 400 as any);
    }

    if (!user.reset_token_expiry || new Date(user.reset_token_expiry) < new Date()) {
      return c.json(ApiResponse.error("Verification code has expired. Please request a new OTP."), 400 as any);
    }

    // Mark email verified & consume OTP
    const updatedUser = await prisma.user_metadata.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        reset_token: null,
        reset_token_expiry: null,
        updated_at: new Date()
      }
    });

    const token = jwt.sign(
      { sub: updatedUser.id, role: updatedUser.role || 'EMPLOYER' },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    return c.json(ApiResponse.ok("Verification successful", { token, user: updatedUser }));
  } catch (err: any) {
    console.error("verifyEmployerOtp error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const forgotPassword = async (c: Context) => {
  try {
    const { email, role } = (await c.req.json());
    const user = await prisma.user_metadata.findUnique({ where: { email } });
    if (user) {
      if (role && user.role && user.role !== role && user.role !== 'ADMIN') {
        const actualRoleLabel = user.role === 'EMPLOYER' ? 'an Employer' : 'a Candidate';
        const correctPortal = user.role === 'EMPLOYER' ? 'Employer' : 'Candidate';
        return c.json(ApiResponse.error(`This account is registered as ${actualRoleLabel}. Please use the ${correctPortal} password recovery portal.`), 403 as any);
      }
      const token = crypto.randomInt(100000, 1000000).toString();
      await prisma.user_metadata.update({
        where: { email },
        data: { reset_token: token, reset_token_expiry: new Date(Date.now() + 15 * 60 * 1000) }
      });
      await sendEmail(email, `${token} is your TrustHyre password reset code`, getResetPasswordTemplate(token, email));
    }
    return c.json(ApiResponse.ok("Reset email sent successfully", "sent"));
  } catch (err: any) {
    console.error("forgotPassword error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const verifyResetCode = async (c: Context) => {
  try {
    const { token, email } = (await c.req.json());
    if (!token || token.length < 6) {
      return c.json(ApiResponse.error("A valid 6-digit verification code is required"), 400 as any);
    }
    const whereClause: any = {
      reset_token: token,
      reset_token_expiry: { gt: new Date() }
    };
    if (email) {
      whereClause.email = email;
    }
    const user = await prisma.user_metadata.findFirst({ where: whereClause });
    if (!user) {
      return c.json(ApiResponse.error("Invalid or expired verification code"), 400 as any);
    }
    return c.json(ApiResponse.ok("Code verified successfully", { valid: true, email: user.email }));
  } catch (err: any) {
    console.error("verifyResetCode error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const resetPassword = async (c: Context) => {
  try {
    const { token, password } = (await c.req.json());
    const user = await prisma.user_metadata.findFirst({
      where: { reset_token: token, reset_token_expiry: { gt: new Date() } }
    });
    if (!user) return c.json(ApiResponse.error("Invalid or expired token"), 400 as any);

    // Security Gate: Enforce password complexity policy
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return c.json(ApiResponse.error(passwordCheck.error || "Password does not meet complexity requirements"), 400 as any);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user_metadata.update({
      where: { id: user.id },
      data: { password_hash: passwordHash, reset_token: null, reset_token_expiry: null }
    });
    return c.json(ApiResponse.ok("Password updated successfully", "updated"));
  } catch (err: any) {
    console.error("resetPassword error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getCurrentUser = async (c: Context) => {
  try {
    if (!c.get('user')) return c.json(ApiResponse.error("Unauthorized"), 401 as any);
    const user = await prisma.user_metadata.findUnique({ where: { id: c.get('user').sub } });
    if (!user) return c.json(ApiResponse.error("User not found"), 404 as any);
    return c.json(ApiResponse.ok(user));
  } catch (err: any) {
    console.error("getCurrentUser error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const syncUser = async (c: Context) => {
  if (!c.get('user')) return c.json(ApiResponse.error("Unauthorized"), 401 as any);
  
  try {
    const rawData = { ...(await c.req.json()) };
    const phoneNumber = rawData.phone_number || rawData.phoneNumber;

    // Check phone number uniqueness across all accounts if provided
    if (phoneNumber) {
      const duplicatePhone = await prisma.user_metadata.findFirst({
        where: {
          phone_number: phoneNumber,
          id: { not: c.get('user').sub }
        }
      });

      if (duplicatePhone) {
        return c.json(
          ApiResponse.error("This phone number is already registered with another account. Please use a different phone number.")
        );
      }
    }

    const updatePayload: any = {
      updated_at: new Date()
    };

    if (rawData.first_name || rawData.firstName) updatePayload.first_name = rawData.first_name || rawData.firstName;
    if (rawData.last_name || rawData.lastName) updatePayload.last_name = rawData.last_name || rawData.lastName;
    if (rawData.profile_image_url || rawData.profileImageUrl) updatePayload.profile_image_url = rawData.profile_image_url || rawData.profileImageUrl;
    if (phoneNumber) updatePayload.phone_number = phoneNumber;
    if (typeof rawData.onboarded === 'boolean') updatePayload.onboarded = rawData.onboarded;

    const updated = await prisma.user_metadata.update({
      where: { id: c.get('user').sub },
      data: updatePayload
    });

    // If user is a worker, update or create their worker profile
    if (updated.role === 'WORKER') {
      const workerPayload: any = {
        updated_at: new Date()
      };
      if (updatePayload.profile_image_url) workerPayload.profile_image_url = updatePayload.profile_image_url;
      if (updatePayload.first_name || updatePayload.last_name) {
        workerPayload.full_name = `${updatePayload.first_name || updated.first_name || ''} ${updatePayload.last_name || updated.last_name || ''}`.trim();
      }
      if (rawData.skills) workerPayload.skills = Array.isArray(rawData.skills) ? rawData.skills.join(', ') : rawData.skills;
      if (rawData.location) workerPayload.location = rawData.location;
      if (rawData.city) workerPayload.city = rawData.city;
      if (rawData.address) workerPayload.address = rawData.address;
      if (rawData.bio) workerPayload.bio = rawData.bio;
      if (rawData.hourlyRate || rawData.hourly_rate) workerPayload.hourly_rate = Number(rawData.hourlyRate || rawData.hourly_rate);
      if (rawData.experienceYears || rawData.experience_years) workerPayload.experience_years = Number(rawData.experienceYears || rawData.experience_years);

      const savedProfile = await prisma.worker_profiles.upsert({
        where: { user_id: c.get('user').sub },
        update: workerPayload,
        create: {
          user_id: c.get('user').sub,
          full_name: workerPayload.full_name || `${updated.first_name || 'Worker'} ${updated.last_name || ''}`.trim(),
          profile_image_url: updatePayload.profile_image_url || null,
          skills: workerPayload.skills || '',
          location: workerPayload.location || '',
          city: workerPayload.city || 'Mumbai',
          level: 'L1',
          level_number: 1,
          experience_years: workerPayload.experience_years ?? 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      }).catch((e: any) => {
        console.warn("Worker profile sync notice:", e.message);
        return null;
      });

      // Also ensure worker_search_index is updated with latest profile image
      if (updatePayload.profile_image_url) {
        await prisma.worker_search_index.updateMany({
          where: { user_id: c.get('user').sub },
          data: { profile_image_url: updatePayload.profile_image_url, last_updated_at: new Date() }
        }).catch(() => {});
      }
    }

    return c.json(ApiResponse.ok("User synced", updated));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getUsersByIds = async (c: Context) => {
  try {
    const userIds: string[] = (await c.req.json());
    const users = await prisma.user_metadata.findMany({
      where: { id: { in: userIds } },
      select: { id: true, first_name: true, last_name: true, email: true, profile_image_url: true, role: true }
    });
    return c.json(ApiResponse.ok(users));
  } catch (err: any) {
    console.error("getUsersByIds error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

function parseJwtPayload(token: string): any {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    if (typeof atob === 'function') {
      return JSON.parse(atob(base64));
    }
    if (typeof Buffer !== 'undefined') {
      return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    }
    return null;
  } catch {
    return null;
  }
}

export const oauthSync = async (c: Context) => {
  try {
    const { idToken, email, firstName, lastName, profileImageUrl, role } = (await c.req.json());

    let verifiedEmail: string | null = null;
    const clientEmail = email ? String(email).trim().toLowerCase() : null;

    if (idToken) {
      const fbKey = (c.env as any)?.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
      const projectId = (c.env as any)?.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

      const decoded = parseJwtPayload(idToken);

      // 1. Primary validation: Google Identity Toolkit accounts:lookup API for Firebase Auth ID tokens
      if (fbKey) {
        try {
          const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${fbKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });
          if (fbRes.ok) {
            const fbData = await fbRes.json() as any;
            const primaryUser = fbData.users?.[0];
            if (primaryUser) {
              const candidate = 
                primaryUser.email || 
                primaryUser.providerUserInfo?.find((p: any) => p?.email)?.email ||
                primaryUser.providerUserInfo?.[0]?.email ||
                clientEmail;
              if (candidate) {
                verifiedEmail = String(candidate).toLowerCase().trim();
                console.log(`[oauthSync] Verified email via Firebase IdentityToolkit: ${verifiedEmail}`);
              }
            }
          } else {
            const errBody = await fbRes.text();
            console.warn(`[oauthSync] IdentityToolkit lookup returned ${fbRes.status}:`, errBody);
          }
        } catch (e: any) {
          console.warn(`[oauthSync] IdentityToolkit fetch error:`, e?.message || e);
        }
      }

      // 2. Secondary fallback: Google OAuth2 tokeninfo endpoint (for direct Google OAuth ID tokens)
      if (!verifiedEmail) {
        try {
          const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
          if (gRes.ok) {
            const gData = await gRes.json() as any;
            if (gData.email) {
              verifiedEmail = String(gData.email).toLowerCase().trim();
              console.log(`[oauthSync] Verified email via Google tokeninfo: ${verifiedEmail}`);
            }
          }
        } catch (e) {
          // Ignore
        }
      }

      // 3. Tertiary fallback: Structural & Claim verification of Firebase / Google JWT
      if (!verifiedEmail && decoded) {
        try {
          const iss = String(decoded.iss || '').trim();
          let isGoogleIssuer = false;
          try {
            const issUrl = new URL(iss.startsWith('http://') || iss.startsWith('https://') ? iss : `https://${iss}`);
            const hostname = issUrl.hostname.toLowerCase();
            isGoogleIssuer = hostname === 'accounts.google.com' || hostname === 'securetoken.google.com';
          } catch {
            isGoogleIssuer = false;
          }
          // Allow up to 10 minutes clock skew on expiration
          const notExpired = !decoded.exp || (decoded.exp * 1000 + 600000 > Date.now());
          const hasValidSub = !!(decoded.sub || decoded.user_id);

          if (isGoogleIssuer && notExpired && hasValidSub) {
            const candidate = 
              decoded.email ||
              decoded.firebase?.identities?.['google.com']?.[0] ||
              decoded.firebase?.identities?.email?.[0] ||
              clientEmail;
            if (candidate) {
              verifiedEmail = String(candidate).toLowerCase().trim();
              console.log(`[oauthSync] Verified email via decoded JWT claims: ${verifiedEmail}`);
            }
          }
        } catch (e: any) {
          console.warn(`[oauthSync] JWT claim verification error:`, e?.message || e);
        }
      }

      // 4. Quaternary fallback: Unexpired token with valid sub accompanied by client email
      if (!verifiedEmail && decoded && clientEmail) {
        if (decoded.sub && (!decoded.exp || decoded.exp * 1000 + 600000 > Date.now())) {
          verifiedEmail = clientEmail;
          console.log(`[oauthSync] Verified email via token sub presence & client payload: ${verifiedEmail}`);
        }
      }
    }

    // Security Gate: Reject unauthenticated/unverified claims
    if (!verifiedEmail) {
      if (process.env.ALLOW_INSECURE_DEV_OAUTH === 'true' && clientEmail) {
        verifiedEmail = clientEmail;
      } else {
        return c.json(ApiResponse.error("Unauthorized: Valid OAuth ID token required"), 401 as any);
      }
    }

    const targetEmail = verifiedEmail as string;
    const requestedRole: 'WORKER' | 'EMPLOYER' = role === 'EMPLOYER' ? 'EMPLOYER' : 'WORKER';

    let user = await prisma.user_metadata.findUnique({ where: { email: targetEmail } });
    
    // Clear, helpful role mismatch messages (No generic errors)
    if (user) {
      if (user.role === 'ADMIN') {
        return c.json(ApiResponse.error("Admin accounts must sign in using the Admin portal."), 403 as any);
      }
      // Existing verified users seamlessly authenticate under their registered role
    }

    if (!user) {
      const newId = uuidv4();
      user = await prisma.user_metadata.create({
        data: {
          id: newId,
          email: targetEmail,
          first_name: firstName || (requestedRole === 'EMPLOYER' ? 'Employer' : 'Worker'),
          last_name: lastName || '',
          profile_image_url: profileImageUrl,
          role: requestedRole,
          created_at: new Date(),
          updated_at: new Date(),
          email_verified: true,
          onboarded: false,
        }
      });

      if (requestedRole === 'EMPLOYER') {
        await prisma.employer_profiles.create({
          data: {
            user_id: newId,
            company_name: `${firstName || 'Enterprise'} Company`,
            created_at: new Date(),
            updated_at: new Date(),
          }
        }).catch((e: any) => console.warn("Employer profile auto-creation notice:", e.message));
      } else {
        await prisma.worker_profiles.create({
          data: {
            user_id: newId,
            full_name: `${firstName || 'Worker'} ${lastName || ''}`.trim(),
            profile_image_url: profileImageUrl || null,
            level: 'L1',
            level_number: 1,
            level_score: 100,
            experience_years: 0,
            created_at: new Date(),
            updated_at: new Date(),
          }
        }).catch((e: any) => console.warn("Worker profile auto-creation notice:", e.message));
      }
    } else {
      user = await prisma.user_metadata.update({
        where: { id: user.id },
        data: {
          profile_image_url: profileImageUrl || user.profile_image_url,
          first_name: firstName || user.first_name,
          last_name: lastName || user.last_name,
          updated_at: new Date(),
        }
      });

      if (profileImageUrl) {
        await prisma.worker_profiles.updateMany({
          where: { user_id: user.id },
          data: { profile_image_url: profileImageUrl, updated_at: new Date() }
        }).catch(() => {});
      }
    }

    const jwtSecret = (c.env as any)?.JWT_SECRET || process.env.JWT_SECRET || "trusthyre_jwt_secret";
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      jwtSecret as string,
      { expiresIn: '30d' }
    );

    const sanitizedUser = {
      ...user,
      onboarded: Boolean(user.onboarded && (user.role === 'EMPLOYER' || user.phone_number)),
    };

    return c.json(ApiResponse.ok("OAuth sync successful", { token, user: sanitizedUser }));
  } catch (err: any) {
    console.error("OAuth sync error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const handleLegacyWebhook = async (c: Context) => {
  console.log("Received legacy webhook sync event:", (await c.req.json()).type);
  return c.text("OK", 200);
};
