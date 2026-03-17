import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { log } from "../../utils/logger.js";
import { contactsStore, callsStore } from "../stores.js";

export const callCommand = new Command("call")
  .description("Place an AI voice call")
  .argument("[number]", "Phone number to call (or pick from contacts)")
  .option("-n, --name <name>", "Contact name for the call")
  .option("-p, --purpose <purpose>", "Purpose of the call")
  .action(async (number?: string, opts?: any) => {
    let phoneNumber = number;
    let contactName = opts?.name || "";

    // If no number, pick from contacts
    if (!phoneNumber) {
      const cStore = await contactsStore();
      const contacts = cStore.getAllContacts();
      const withPhone = contacts.filter((c: any) => c.phone);

      if (withPhone.length === 0) {
        const { manual } = await inquirer.prompt([{
          type: "input",
          name: "manual",
          message: "Phone number to call:",
          validate: (v: string) => v.length > 5 || "Enter a valid phone number",
        }]);
        phoneNumber = manual;
      } else {
        const { choice } = await inquirer.prompt([{
          type: "list",
          name: "choice",
          message: "Who do you want to call?",
          choices: [
            ...withPhone.map((c: any) => ({
              name: `${c.name} (${c.phone})`,
              value: { phone: c.phone, name: c.name },
            })),
            { name: chalk.gray("Enter number manually..."), value: null },
          ],
        }]);

        if (choice) {
          phoneNumber = choice.phone;
          contactName = contactName || choice.name;
        } else {
          const { manual } = await inquirer.prompt([{
            type: "input",
            name: "manual",
            message: "Phone number:",
          }]);
          phoneNumber = manual;
        }
      }
    }

    if (!phoneNumber) {
      log.error("No phone number provided.");
      return;
    }

    // Get the app URL from env
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      log.error("NEXT_PUBLIC_APP_URL not set. Start the UI and tunnels first.");
      return;
    }

    log.info(`Placing AI voice call to ${contactName || phoneNumber}...`);

    try {
      const res = await fetch(`${appUrl}/api/twilio/voice-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          contactName: contactName || undefined,
          purpose: opts?.purpose || undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        log.error(data.error);
        return;
      }

      log.success(`Call placed! SID: ${data.callSid}`);
      if (contactName) {
        console.log(`  ${chalk.gray("To:")} ${contactName} (${phoneNumber})`);
      }
    } catch (err) {
      log.error(`Failed to place call: ${(err as Error).message}`);
      log.info("Make sure the UI (npm run dev) and tunnels are running.");
    }
  });
