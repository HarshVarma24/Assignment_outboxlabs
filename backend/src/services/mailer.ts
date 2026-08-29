import nodemailer from 'nodemailer';

interface SendMailOptions {
  fromName?: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
}

let testAccount: nodemailer.TestAccount | null = null;

async function getOrCreateTestAccount() {
  if (!testAccount) {
    testAccount = await nodemailer.createTestAccount();
    console.log('📧 Created new Ethereal Email test account:', testAccount.user);
  }
  return testAccount;
}

export async function sendMailViaEthereal(options: SendMailOptions): Promise<{ messageId: string; etherealPreviewUrl: string }> {
  const account = await getOrCreateTestAccount();

  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  const mailOptions = {
    from: `"${options.fromName || 'ReachInbox Sender'}" <${options.fromEmail}>`,
    to: options.to,
    subject: options.subject,
    text: options.body,
    html: `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">
            <div style="background-color: #4f46e5; padding: 15px; color: white; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 20px;">ReachInbox Outreach</h2>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; white-space: pre-wrap;">${options.body}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 12px; color: #6b7280;">Sent securely via ReachInbox Production Email Scheduler Engine</p>
            </div>
          </div>`,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info) || `https://ethereal.email/message/${info.messageId}`;

  return {
    messageId: info.messageId,
    etherealPreviewUrl: typeof previewUrl === 'string' ? previewUrl : String(previewUrl),
  };
}
