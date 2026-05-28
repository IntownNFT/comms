import { NextResponse } from "next/server";
import { loadCommsEnv } from "@/lib/env";
import { requireAuth, getCurrentUser } from "@/lib/api-auth";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  loadCommsEnv(true);

  // Per-user number (cloud) or global fallback (local)
  const user = await getCurrentUser();
  const smsNumber = user?.smsNumber || process.env.TWILIO_SMS_NUMBER;
  const verificationSid = user?.smsVerificationSid || process.env.TWILIO_TF_VERIFICATION_SID;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!smsNumber) {
    return NextResponse.json({ smsNumber: null, verificationStatus: null });
  }

  let verificationStatus = user?.smsVerificationStatus || null;
  let verificationDetails = null;

  // Fetch live status + details from Twilio if we have a verification SID
  if (verificationSid && accountSid && authToken) {
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      const v = await client.messaging.v1.tollfreeVerifications(verificationSid).fetch();
      verificationStatus = v.status;
      verificationDetails = {
        businessName: v.businessName,
        businessWebsite: v.businessWebsite,
        businessType: v.businessType,
        businessStreetAddress: v.businessStreetAddress,
        businessCity: v.businessCity,
        businessStateProvinceRegion: v.businessStateProvinceRegion,
        businessPostalCode: v.businessPostalCode,
        businessCountry: v.businessCountry,
        businessContactFirstName: v.businessContactFirstName,
        businessContactLastName: v.businessContactLastName,
        businessContactEmail: v.businessContactEmail,
        notificationEmail: v.notificationEmail,
        useCaseSummary: v.useCaseSummary,
        productionMessageSample: v.productionMessageSample,
        messageVolume: v.messageVolume,
        optInType: v.optInType,
        rejectionReason: v.rejectionReason,
        dateCreated: v.dateCreated,
        dateUpdated: v.dateUpdated,
      };
    } catch { /* silent */ }
  }

  return NextResponse.json({ smsNumber, verificationStatus, verificationDetails });
}
