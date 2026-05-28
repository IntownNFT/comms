import { NextResponse } from "next/server";
import { loadCommsEnv, saveCommsEnvVar } from "@/lib/env";
import { requireAuth, getCurrentUser } from "@/lib/api-auth";
import { updateUser } from "@/lib/stores/auth-store";

export async function POST(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  loadCommsEnv(true);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return NextResponse.json(
      { error: "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN first." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const selectedNumber = body.phoneNumber as string | undefined;
  const biz = body.business as {
    name: string;
    website: string;
    email: string;
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
    type?: string;
    registrationNumber?: string;
    useCaseSummary?: string;
    messageSample?: string;
    messageVolume?: string;
  } | undefined;

  if (!biz?.name || !biz?.email || !biz?.street || !biz?.city || !biz?.state || !biz?.zip || !biz?.firstName || !biz?.lastName) {
    return NextResponse.json(
      { error: "Business details are required. Please fill in all required fields." },
      { status: 400 }
    );
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    // Use selected number or auto-pick first available
    let numberToBuy = selectedNumber;
    if (!numberToBuy) {
      const available = await client.availablePhoneNumbers("US").tollFree.list({
        smsEnabled: true,
        voiceEnabled: true,
        limit: 1,
      });
      if (available.length === 0) {
        return NextResponse.json({ error: "No toll-free numbers available. Try again later." }, { status: 404 });
      }
      numberToBuy = available[0].phoneNumber;
    }

    // Purchase the number with SMS webhook
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: numberToBuy,
      ...(appUrl ? {
        smsUrl: `${appUrl}/api/twilio/sms-webhook`,
        smsMethod: "POST",
      } : {}),
    });

    // Save as SMS number — per-user in cloud mode, global fallback
    const user = await getCurrentUser();
    if (user) {
      updateUser(user.id, {
        smsNumber: purchased.phoneNumber,
        smsNumberSid: purchased.sid,
      });
    }
    saveCommsEnvVar("TWILIO_SMS_NUMBER", purchased.phoneNumber);
    process.env.TWILIO_SMS_NUMBER = purchased.phoneNumber;

    // Submit toll-free verification with user-provided business details
    let verificationStatus = "NOT_SUBMITTED";
    try {
      const bizWebsite = biz.website || appUrl || "https://example.com";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const verificationParams: any = {
        tollfreePhoneNumberSid: purchased.sid,
        businessName: biz.name,
        businessWebsite: bizWebsite,
        notificationEmail: biz.email,
        useCaseCategories: ["ACCOUNT_NOTIFICATIONS", "CUSTOMER_CARE"],
        useCaseSummary: biz.useCaseSummary || "Business communications platform for outreach, follow-ups, scheduling, and notifications.",
        productionMessageSample: biz.messageSample || "Hi, just following up on our conversation. Let me know if you are free to chat. Reply STOP to opt out.",
        additionalInformation: "Users add contacts and initiate SMS from our platform. All messages include opt-out instructions.",
        optInType: "VERBAL",
        optInImageUrls: [bizWebsite],
        messageVolume: biz.messageVolume || "1,000",
        businessType: biz.type || "SOLE_PROPRIETOR",
        businessStreetAddress: biz.street,
        businessCity: biz.city,
        businessStateProvinceRegion: biz.state,
        businessPostalCode: biz.zip,
        businessCountry: biz.country || "US",
        businessContactFirstName: biz.firstName,
        businessContactLastName: biz.lastName,
        businessContactEmail: biz.email,
        businessContactPhone: purchased.phoneNumber,
      };

      if (biz.registrationNumber) {
        verificationParams.businessRegistrationNumber = biz.registrationNumber;
      }

      const verification = await client.messaging.v1.tollfreeVerifications.create(verificationParams);

      verificationStatus = verification.status;
      if (user) {
        updateUser(user.id, {
          smsVerificationSid: verification.sid,
          smsVerificationStatus: verification.status,
        });
      }
      saveCommsEnvVar("TWILIO_TF_VERIFICATION_SID", verification.sid);
    } catch (vErr) {
      console.error("Toll-free verification submission failed:", vErr);
      verificationStatus = "SUBMISSION_FAILED";
    }

    return NextResponse.json({
      phoneNumber: purchased.phoneNumber,
      phoneNumberSid: purchased.sid,
      verificationStatus,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `SMS setup failed: ${msg}` }, { status: 500 });
  }
}
