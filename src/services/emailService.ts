import { Resend } from 'resend';
import nodemailer from 'nodemailer';

/**
 * Email message interface
 */
export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
    from?: string;
}

/**
 * Email provider interface
 */
export interface IEmailProvider {
    sendEmail(message: EmailMessage): Promise<void>;
    isConfigured(): boolean;
    getName(): string;
}

/**
 * Resend email provider (recommended for Railway production)
 * Free tier: 3,000 emails/month, 100 emails/day
 */
export class ResendEmailProvider implements IEmailProvider {
    private resend: Resend | null = null;
    private fromEmail: string;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        this.fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

        if (apiKey) {
            this.resend = new Resend(apiKey);
            console.log(`[Email] Resend provider initialized with from: ${this.fromEmail}`);
        } else {
            console.warn('[Email] Resend API key not provided');
        }
    }

    async sendEmail(message: EmailMessage): Promise<void> {
        if (!this.resend) {
            throw new Error('Resend provider not configured');
        }

        try {
            const { error } = await this.resend.emails.send({
                from: message.from || this.fromEmail,
                to: message.to,
                subject: message.subject,
                html: message.html
            });

            if (error) {
                throw new Error(`Resend error: ${error.message}`);
            }

            console.log(`[Email] Resend email sent successfully to ${message.to}`);
        } catch (error) {
            console.error('[Email] Resend send error:', error);
            throw error;
        }
    }

    isConfigured(): boolean {
        return this.resend !== null;
    }

    getName(): string {
        return 'Resend';
    }
}

/**
 * SMTP email provider (fallback for development/self-hosted)
 * Supports both SSL (port 465) and STARTTLS (port 587)
 */
export class SMTPEmailProvider implements IEmailProvider {
    private transporter: nodemailer.Transporter | null = null;
    private fromEmail: string;

    constructor() {
        this.fromEmail = process.env.EMAIL_FROM || 'noreply@localhost';

        const host = process.env.EMAIL_HOST;
        const user = process.env.EMAIL_USER;

        if (host && user) {
            const port = parseInt(process.env.EMAIL_PORT || '587');
            const isSecure = process.env.EMAIL_SECURE === 'true';

            const emailConfig = {
                host: host,
                port: port,
                secure: isSecure, // true for SSL (port 465), false for STARTTLS (port 587)
                auth: {
                    user: user,
                    pass: process.env.EMAIL_PASS
                },
                // Connection and timeout settings to prevent hanging
                connectionTimeout: 10000, // 10 seconds
                greetingTimeout: 10000,
                socketTimeout: 20000, // 20 seconds
                // TLS configuration for SSL and STARTTLS
                tls: {
                    // Reject unauthorized certificates in production for security
                    rejectUnauthorized: process.env.NODE_ENV === 'production',
                    // Minimum TLS version for security
                    minVersion: 'TLSv1.2' as const
                },
                // Enable debug output in development
                debug: process.env.NODE_ENV === 'development',
                logger: process.env.NODE_ENV === 'development'
            };

            this.transporter = nodemailer.createTransport(emailConfig);
            console.log(`[Email] SMTP provider initialized (${host}:${port}, secure=${isSecure})`);
        } else {
            console.warn('[Email] SMTP configuration not provided');
        }
    }

    async sendEmail(message: EmailMessage): Promise<void> {
        if (!this.transporter) {
            throw new Error('SMTP provider not configured');
        }

        try {
            await this.transporter.sendMail({
                from: message.from || this.fromEmail,
                to: message.to,
                subject: message.subject,
                html: message.html
            });

            console.log(`[Email] SMTP email sent successfully to ${message.to}`);
        } catch (error) {
            console.error('[Email] SMTP send error:', error);
            throw error;
        }
    }

    isConfigured(): boolean {
        return this.transporter !== null;
    }

    getName(): string {
        return 'SMTP';
    }
}

/**
 * Email service with automatic provider selection
 * Priority: Resend (production) > SMTP (development/fallback)
 */
export class EmailService {
    private providers: IEmailProvider[] = [];
    private activeProvider: IEmailProvider | null = null;

    constructor() {
        // Initialize providers based on environment and configuration
        const resendProvider = new ResendEmailProvider();
        const smtpProvider = new SMTPEmailProvider();

        // Add configured providers to the list
        if (resendProvider.isConfigured()) {
            this.providers.push(resendProvider);
        }

        if (smtpProvider.isConfigured()) {
            this.providers.push(smtpProvider);
        }

        // Select the first configured provider
        this.activeProvider = this.providers[0] || null;

        if (this.activeProvider) {
            console.log(`[Email] Active email provider: ${this.activeProvider.getName()}`);
        } else {
            console.warn('[Email] No email provider configured. Email functionality will be disabled.');
        }
    }

    /**
     * Send an email using the active provider
     */
    async sendEmail(message: EmailMessage): Promise<void> {
        if (!this.activeProvider) {
            console.warn('[Email] No email provider configured. Email not sent.');
            return;
        }

        try {
            await this.activeProvider.sendEmail(message);
        } catch (error) {
            console.error(`[Email] Failed to send email with ${this.activeProvider.getName()}:`, error);
            throw error;
        }
    }

    /**
     * Check if email service is configured and ready
     */
    isConfigured(): boolean {
        return this.activeProvider !== null;
    }

    /**
     * Get the name of the active email provider
     */
    getActiveProviderName(): string {
        return this.activeProvider?.getName() || 'None';
    }
}
