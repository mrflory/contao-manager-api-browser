import * as crypto from 'crypto';
import { EncryptedToken } from '../types';

class TokenEncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 16; // 128 bits
    private readonly masterKey: Buffer;

    constructor() {
        this.masterKey = this.getMasterKey();
    }

    private getMasterKey(): Buffer {
        const masterKey = process.env.TOKEN_MASTER_KEY;
        if (!masterKey) {
            throw new Error('TOKEN_MASTER_KEY environment variable is required');
        }
        
        // Ensure the master key is exactly 32 bytes
        if (masterKey.length !== 64) { // 64 hex characters = 32 bytes
            throw new Error('TOKEN_MASTER_KEY must be exactly 64 hex characters (32 bytes)');
        }
        
        return Buffer.from(masterKey, 'hex');
    }

    private deriveSiteKey(siteUrl: string): Buffer {
        // Use PBKDF2 to derive a site-specific key from master key + site URL
        const salt = crypto.createHash('sha256').update(siteUrl).digest();
        return crypto.pbkdf2Sync(this.masterKey, salt, 10000, this.keyLength, 'sha256');
    }

    public encryptToken(token: string, siteUrl: string): EncryptedToken {
        try {
            const siteKey = this.deriveSiteKey(siteUrl);
            const iv = crypto.randomBytes(this.ivLength);
            
            const cipher = crypto.createCipheriv(this.algorithm, siteKey, iv);
            cipher.setAAD(Buffer.from(siteUrl)); // Additional authenticated data
            
            let encrypted = cipher.update(token, 'utf8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            const tag = cipher.getAuthTag();
            
            return {
                encrypted: encrypted.toString('base64'),
                iv: iv.toString('base64'),
                tag: tag.toString('base64')
            };
        } catch (error) {
            throw new Error(`Token encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public decryptToken(encryptedData: EncryptedToken, siteUrl: string): string {
        try {
            const { encrypted, iv, tag } = encryptedData;
            
            if (!encrypted || !iv || !tag) {
                throw new Error('Invalid encrypted token format');
            }
            
            const siteKey = this.deriveSiteKey(siteUrl);
            const ivBuffer = Buffer.from(iv, 'base64');
            
            const decipher = crypto.createDecipheriv(this.algorithm, siteKey, ivBuffer);
            decipher.setAuthTag(Buffer.from(tag, 'base64'));
            decipher.setAAD(Buffer.from(siteUrl));
            
            let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            return decrypted.toString('utf8');
        } catch (error) {
            throw new Error(`Token decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public isTokenEncrypted(token: any): token is EncryptedToken {
        return typeof token === 'object' && 
               token !== null &&
               typeof token.encrypted === 'string' &&
               typeof token.iv === 'string' &&
               typeof token.tag === 'string';
    }

    public static generateMasterKey(): string {
        return crypto.randomBytes(32).toString('hex');
    }
}

export { TokenEncryptionService };
export default TokenEncryptionService;