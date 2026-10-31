# TrustHire Security & Privacy Guide

TrustHire implements multi-layered security across authentication, authorization, data protection, and privacy compliance. With the shift to a microservices architecture, security is distributed and coordinated, with **Clerk** serving as the central Identity Provider (IdP).

## 📱 Dual-App Architecture Security

**System Design**: TrustHire uses **two independent React PWAs** (Worker & Employer) interacting with a distributed **microservices backend**.

**Security Implications**:
- **Clerk Authentication**: Centralized user management and secure token-based access.
- **Service Isolation**: Each microservice manages its own security context.
- **Microservices Orchestration**: n8n manages secure cross-service workflows.
- **Clerk JWT Validation**: Every microservice validates the bearer token in the `Authorization` header.

---

## 🎯 Security Principles

1. **Defense in Depth** - Multiple security layers
2. **Least Privilege** - Minimum necessary access
3. **Privacy by Design** - Privacy built into architecture
4. **Zero Trust** - Verify everything, trust nothing
5. **Encryption Everywhere** - Data protected at rest and in transit

---

## 🔑 Authentication System

**Clerk (Unified Identity Provider)**
- **Authentication**: Secure, managed authentication for both Workers and Employers.
- **Email Verification**: Mandatory verification via Clerk/Brevo before platform access.
- **Session Management**: Handled by Clerk's advanced security infrastructure.
- **Profile Metadata**: Roles and verification status stored in Clerk metadata.

### Google OAuth Security Flow

```
1. User clicks "Sign in with Google" in mobile app
   ↓
2. App redirects to Google OAuth consent screen
   ↓
3. User approves permissions (email, profile)
   ↓
4. Google returns authorization code
   ↓
5. App exchanges code for Google ID token
   ↓
6. App sends ID token + role to Spring Boot backend
   ↓
7. Backend verifies token via Google tokeninfo endpoint
   ↓
8. Backend creates/updates user entity (JPA)
   ↓
9. Backend generates JWT access + refresh tokens (jjwt)
   ↓
10. App stores tokens securely (Keychain/Keystore)
```

**Security Benefits**:
- ✅ No password storage for Google users
- ✅ Automatic email verification
- ✅ Reduced phishing risk
- ✅ Google's 2FA/security features apply
- ✅ Faster, more secure onboarding

### JWT Token Architecture

**Access Tokens**:
- **Lifetime**: 15 minutes
- **Purpose**: API authorization
- **Storage**: Mobile secure storage (Keychain/Keystore)
- **Algorithm**: HMAC-SHA256 (HS256) via `jjwt`
- **Payload**:
  ```json
  {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "role": "WORKER",
    "authProvider": "GOOGLE",
    "iat": 1642521600,
    "exp": 1642522500
  }
  ```

**Refresh Tokens**:
- **Lifetime**: 30 days
- **Purpose**: Session persistence
- **Storage**: PostgreSQL `refresh_tokens` table + mobile secure storage
- **Rotation**: Automatic on each use
- **Revocation**: Admin can revoke all user tokens

### Authentication Implementation

```java
// com/trusthire/security/JwtService.java
@Service
public class JwtService {
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    public String generateAccessToken(User user) {
        return Jwts.builder()
            .subject(user.getId().toString())
            .claim("role", user.getRole().name())
            .claim("authProvider", user.getAuthProvider().name())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + 15 * 60 * 1000))
            .signWith(getSigningKey())
            .compact();
    }

    public boolean isTokenValid(String token) {
        try {
            Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}
```

### Password Security (Email/Password Users)

**Hashing** (BCryptPasswordEncoder):
```java
// com/trusthire/service/AuthService.java
@Service
public class AuthService {
    private final PasswordEncoder passwordEncoder =
        new BCryptPasswordEncoder(12); // 12 rounds

    // Hash password on registration
    String hashedPassword = passwordEncoder.encode(rawPassword);

    // Verify password on login
    boolean isValid = passwordEncoder.matches(rawPassword, hashedPassword);
}
```

**Password Requirements** (enforced via `@Pattern` validation):
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Password Reset Flow**:
```
1. User requests password reset
   ↓
2. Generate secure random token (SecureRandom)
   ↓
3. Store token hash in PostgreSQL with expiration (1 hour)
   ↓
4. Send reset link via email/SMS
   ↓
5. User clicks link with token
   ↓
6. Spring validates token (not expired, matches hash)
   ↓
7. Allow password change
   ↓
8. Invalidate reset token
   ↓
9. Invalidate all existing sessions (revoke refresh tokens)
```

## 🛡️ Authorization System

### Role-Based Access Control (RBAC)

**Roles** (Java enum):
- `ADMIN` - Platform administrators
- `OWNER` - Business owners/employers
- `WORKER` - Service providers

**Permission Matrix**:

| Resource | ADMIN | OWNER | WORKER |
|----------|-------|-------|--------|
| View all workers | ✅ | ✅ | ❌ |
| View worker details | ✅ | ✅ (after hire) | ❌ (own only) |
| Post jobs | ✅ | ✅ | ❌ |
| Apply to jobs | ❌ | ❌ | ✅ |
| Rate workers | ✅ | ✅ | ❌ |
| Rate employers | ❌ | ❌ | ✅ |
| Manage skill tests | ✅ | ❌ | ❌ |
| View Aadhaar docs | ✅ | ❌ | ❌ (own only) |
| Delete users | ✅ | ❌ | ❌ |

### Spring Security Configuration

```java
// com/trusthire/config/SecurityConfig.java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/workers/search").hasAnyRole("OWNER", "ADMIN")
                .requestMatchers("/api/v1/workers/**").hasAnyRole("WORKER", "ADMIN")
                .requestMatchers("/api/v1/employers/**").hasAnyRole("OWNER", "ADMIN")
                .requestMatchers("/api/v1/jobs/**").authenticated()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

### Method-Level Authorization

```java
// com/trusthire/controller/WorkerController.java
@RestController
@RequestMapping("/api/v1/workers")
public class WorkerController {

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public ResponseEntity<WorkerSearchResponse> searchWorkers(
            @Valid WorkerSearchRequest request) {
        return ResponseEntity.ok(workerService.search(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('WORKER') and @workerSecurity.isOwner(#id, authentication)")
    public ResponseEntity<WorkerDTO> updateProfile(
            @PathVariable UUID id,
            @Valid @RequestBody WorkerUpdateRequest request) {
        return ResponseEntity.ok(workerService.update(id, request));
    }
}
```

### Resource Ownership Validation

```java
// com/trusthire/security/WorkerSecurity.java
@Component("workerSecurity")
public class WorkerSecurity {

    public boolean isOwner(UUID workerId, Authentication auth) {
        String userId = auth.getName();
        Worker worker = workerRepository.findById(workerId)
            .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
        return worker.getUser().getId().toString().equals(userId)
            || hasAdminRole(auth);
    }
}
```

## 🔒 Data Protection

### Encryption at Rest

**Field-Level Encryption** (AES-256-GCM via Java Crypto):

```java
// com/trusthire/util/EncryptionUtil.java
@Component
public class EncryptionUtil {

    @Value("${app.encryption.key}") // 32-byte hex key
    private String encryptionKey;

    public String encrypt(String plainText) {
        try {
            SecretKeySpec key  = new SecretKeySpec(
                HexFormat.of().parseHex(encryptionKey), "AES");
            byte[] iv          = new byte[12];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] cipherText  = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            // combine iv + cipherText, base64 encode
            byte[] combined = ByteBuffer.allocate(iv.length + cipherText.length)
                .put(iv).put(cipherText).array();
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new EncryptionException("Encryption failed", e);
        }
    }

    public String decrypt(String encryptedText) {
        try {
            byte[] combined = Base64.getDecoder().decode(encryptedText);
            byte[] iv       = Arrays.copyOfRange(combined, 0, 12);
            byte[] cipher   = Arrays.copyOfRange(combined, 12, combined.length);
            SecretKeySpec key = new SecretKeySpec(
                HexFormat.of().parseHex(encryptionKey), "AES");
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(c.doFinal(cipher), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new EncryptionException("Decryption failed", e);
        }
    }
}
```

**Encrypted Fields** (via JPA `AttributeConverter`):
- Phone numbers
- Email addresses (optional)
- Aadhaar documents
- Payment information
- Reference contact details

```java
// com/trusthire/util/EncryptedStringConverter.java
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {
    @Autowired private EncryptionUtil encryptionUtil;

    @Override
    public String convertToDatabaseColumn(String attribute) {
        return attribute == null ? null : encryptionUtil.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return dbData == null ? null : encryptionUtil.decrypt(dbData);
    }
}

// Usage in entity:
@Convert(converter = EncryptedStringConverter.class)
@Column(name = "phone")
private String phone;
```

**Database Encryption**:
- **Neon DB** encryption at rest (AWS KMS)
- Encrypted automated backups

### Encryption in Transit

**TLS Configuration** (Spring Boot):
```properties
# application.properties
server.ssl.enabled=true
server.ssl.protocol=TLS
# Enforce HTTPS via Nginx in production
```

**Security Headers** (via Spring Security defaults + custom):
```java
// com/trusthire/config/SecurityHeadersConfig.java
http.headers(headers -> headers
    .frameOptions(FrameOptionsConfig::deny)
    .contentTypeOptions(Customizer.withDefaults())
    .httpStrictTransportSecurity(hsts -> hsts
        .maxAgeInSeconds(31536000)
        .includeSubDomains(true)
        .preload(true))
);
```

## 🔐 Identity Verification Security

### Aadhaar Data Protection

**Masking** (Spring Boot backend):
```java
// com/trusthire/service/VerificationService.java
@Service
public class VerificationService {

    public AadhaarVerificationResult processAadhaar(String aadhaarNumber, ...) {
        // Hash full number (for duplicate detection only)
        String aadhaarToken = hashSHA256(aadhaarNumber);

        // Mask number (only last 4 digits visible)
        String aadhaarMasked = "XXXX-XXXX-" + aadhaarNumber.substring(aadhaarNumber.length() - 4);

        // NEVER store the original number
        worker.setAadhaarToken(aadhaarToken);
        worker.setAadhaarMasked(aadhaarMasked);
        // aadhaarNumber is NOT saved
        ...
    }

    private String hashSHA256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}
```

**Database Storage**:
```
{
  aadhaarToken:   "a1b2c3d4e5f6..." // SHA-256 hash (irreversible)
  aadhaarMasked:  "XXXX-XXXX-9012" // Only last 4 digits visible
  aadhaarDocument:"https://cloudinary.com/..." // Encrypted, private
}
```

**Access Control**:
- Full Aadhaar number **NEVER** stored
- Only hashed token for duplicate detection
- Masked version shown to worker only
- Document accessible by admin only (`@PreAuthorize("hasRole('ADMIN')")`)

**Compliance**:
- UIDAI Aadhaar usage guidelines
- No public exposure of Aadhaar data
- Consent-based verification
- Secure storage and transmission

### Face Matching Security

**Process**:
1. Worker uploads Aadhaar document
2. Extract face from Aadhaar photo (FastAPI AI service)
3. Worker takes live selfie
4. Compare faces using facial recognition
5. Calculate similarity confidence score
6. Accept if confidence > 85%
7. **Delete biometric data after verification**

**Privacy Protection**:
- Biometric data NOT stored permanently
- Only match result saved (pass/fail + confidence %)
- Face data deleted after verification
- Liveness detection prevents photo spoofing

## 🛡️ API Security

### Input Validation

**Bean Validation** (`jakarta.validation`):
```java
// com/trusthire/dto/WorkerSearchRequest.java
public record WorkerSearchRequest(
    @NotNull
    @DecimalMin("-90.0") @DecimalMax("90.0")
    Double latitude,

    @NotNull
    @DecimalMin("-180.0") @DecimalMax("180.0")
    Double longitude,

    @NotNull @Min(1) @Max(50)
    Integer radius,

    @Min(1) @Max(4)
    Integer minLevel,

    List<@NotBlank String> skills
) {}

// Controller usage:
@GetMapping("/search")
public ResponseEntity<?> search(@Valid @ModelAttribute WorkerSearchRequest req) { ... }
```

### SQL Injection Prevention

Spring Data JPA uses parameterized queries by default:
```java
// com/trusthire/repository/WorkerRepository.java
@Repository
public interface WorkerRepository extends JpaRepository<Worker, UUID> {

    @Query(value = """
        SELECT w.* FROM workers w
        WHERE ST_DWithin(w.location::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            :radiusMeters)
        AND w.level >= :minLevel
        AND w.availability = 'AVAILABLE'
        ORDER BY w.trust_score DESC
        """, nativeQuery = true)
    List<Worker> searchNearby(@Param("lat") double lat,
                              @Param("lng") double lng,
                              @Param("radiusMeters") double radiusMeters,
                              @Param("minLevel") int minLevel);
}
```

### XSS Prevention

Input sanitization via Jsoup:
```java
// com/trusthire/util/SanitizationUtil.java
public class SanitizationUtil {
    public static String sanitize(String input) {
        return Jsoup.clean(input, Safelist.none());
    }
}
```

### Rate Limiting (Bucket4j)

```java
// com/trusthire/filter/RateLimitFilter.java
@Component
public class RateLimitFilter implements Filter {

    // General API: 100 requests / 15 minutes
    private final Bucket generalBucket = Bucket.builder()
        .addLimit(limit -> limit.capacity(100).refillGreedy(100, Duration.ofMinutes(15)))
        .build();

    // Auth endpoints: 5 requests / 15 minutes
    private final Bucket authBucket = Bucket.builder()
        .addLimit(limit -> limit.capacity(5).refillGreedy(5, Duration.ofMinutes(15)))
        .build();

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        Bucket bucket = request.getRequestURI().startsWith("/api/v1/auth")
            ? authBucket : generalBucket;
        if (!bucket.tryConsume(1)) {
            ((HttpServletResponse) res).setStatus(429);
            return;
        }
        chain.doFilter(req, res);
    }
}
```

### CORS Configuration

```java
// com/trusthire/config/CorsConfig.java
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "https://trusthire.in",
            "https://app.trusthire.in",
            "http://localhost:3000"   // development only
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

## 🔍 Security Monitoring

### Audit Logging

```java
// com/trusthire/service/AuditService.java
@Service
@Slf4j
public class AuditService {

    public void logAuthEvent(UUID userId, String event, boolean success,
                             HttpServletRequest request) {
        AuditLog log = AuditLog.builder()
            .userId(userId)
            .event(event)        // LOGIN, LOGOUT, PASSWORD_RESET, etc.
            .success(success)
            .timestamp(Instant.now())
            .ipAddress(request.getRemoteAddr())
            .userAgent(request.getHeader("User-Agent"))
            .build();
        auditLogRepository.save(log);
    }
}
```

### Suspicious Activity Detection

```java
// com/trusthire/service/SecurityMonitorService.java
@Service
public class SecurityMonitorService {

    private static final long MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(30);

    public void checkLoginAttempts(String email) {
        long failedAttempts = loginAttemptRepository
            .countByEmailAndSuccessAndTimestampAfter(
                email, false,
                Instant.now().minus(LOCKOUT_DURATION));

        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            throw new AccountLockedException(
                "Account temporarily locked due to multiple failed login attempts");
        }
    }
}
```

## 🔐 Media Security

### Cloudinary Signed Uploads (Java SDK)

```java
// com/trusthire/service/MediaService.java
@Service
public class MediaService {

    @Autowired
    private Cloudinary cloudinary;

    public UploadSignatureResponse generateUploadSignature(
            String folder, String publicId, User currentUser) {
        // Validate user can upload to this folder
        validateFolderAccess(currentUser, folder);

        long timestamp = Instant.now().getEpochSecond();
        Map<String, Object> params = Map.of(
            "timestamp", timestamp,
            "folder", folder,
            "public_id", publicId
        );

        String signature = cloudinary.apiSignRequest(params,
            cloudinary.config.apiSecret);

        return new UploadSignatureResponse(
            signature, timestamp,
            cloudinary.config.apiKey,
            cloudinary.config.cloudName);
    }

    public String getPrivateAssetUrl(String publicId, int expiresInSeconds) {
        return cloudinary.url()
            .type("private")
            .signed(true)
            .expireAt(Instant.now().plusSeconds(expiresInSeconds).getEpochSecond())
            .generate(publicId);
    }
}
```

## 🔒 Privacy Compliance

### Data Minimization

**Data Retention Policy** (scheduled via `@Scheduled`):
```java
// com/trusthire/scheduler/DataRetentionScheduler.java
@Component
public class DataRetentionScheduler {

    @Scheduled(cron = "0 0 2 * * ?") // Daily at 2 AM
    public void cleanUpOldData() {
        Instant thirtyDaysAgo = Instant.now().minus(Duration.ofDays(30));
        Instant ninetyDaysAgo = Instant.now().minus(Duration.ofDays(90));

        // Delete unverified accounts after 30 days
        userRepository.deleteByVerifiedFalseAndCreatedAtBefore(thirtyDaysAgo);

        // Delete old audit logs after 90 days
        auditLogRepository.deleteByTimestampBefore(ninetyDaysAgo);
    }
}
```

### User Data Rights

**Right to Access**:
```java
@GetMapping("/user/data-export")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<UserDataExport> exportData(Authentication auth) {
    UUID userId = UUID.fromString(auth.getName());
    return ResponseEntity.ok(userService.exportUserData(userId));
}
```

**Right to Deletion**:
```java
@DeleteMapping("/user/account")
@PreAuthorize("isAuthenticated()")
@Transactional
public ResponseEntity<Void> deleteAccount(Authentication auth) {
    UUID userId = UUID.fromString(auth.getName());
    userService.deleteAccount(userId); // Cascades via JPA + anonymizes ratings
    return ResponseEntity.noContent().build();
}
```

### DPDP Act 2023 Compliance (India)

**Requirements**:
- ✅ Clear consent for data processing
- ✅ Purpose limitation (data used only for stated purpose)
- ✅ Data minimization
- ✅ Storage limitation (scheduled cleanup)
- ✅ Right to access and correction
- ✅ Right to deletion
- ✅ Data breach notification (within 72 hours)
- ✅ Data localization (India-based storage - AWS Mumbai region)

## 🚨 Incident Response

### Security Breach Protocol

**Detection**:
- Spring Actuator metrics + CloudWatch alarms
- Monitoring dashboards
- User reports

**Response Steps**:
1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope and impact
3. **Notify**: Alert affected users within 24 hours
4. **Remediate**: Fix vulnerability
5. **Review**: Post-incident analysis

---

## ✅ Security Checklist

- [ ] HTTPS enabled on all endpoints
- [ ] Environment variables secured (AWS Secrets Manager)
- [ ] Database access restricted by VPC/security groups
- [ ] Rate limiting enabled (Bucket4j)
- [ ] Input validation on all endpoints (`@Valid`)
- [ ] CORS configured properly
- [ ] Spring Security headers enabled
- [ ] Regular dependency updates (Dependabot)
- [ ] Secrets rotation policy
- [ ] Backup strategy in place

---

**Security Version**: 2.0 (Spring Boot)  
**Last Updated**: February 2026
