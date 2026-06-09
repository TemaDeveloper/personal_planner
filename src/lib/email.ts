import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendShareInvite(
  ownerName: string,
  inviteeEmail: string,
  sectionName: string,
  magicLinkUrl: string
): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured, skipping email");
    return false;
  }

  try {
    await resend.emails.send({
      from: "Lifora <noreply@resend.dev>",
      to: inviteeEmail,
      subject: `${ownerName} shared their ${sectionName} with you`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">
            ${ownerName} shared their ${sectionName} data with you
          </h2>
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
            You have view-only access. Click the link below to see their data.
          </p>
          <a href="${magicLinkUrl}"
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
            View Shared Data
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Or copy this link: ${magicLinkUrl}
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send invite:", err);
    return false;
  }
}
