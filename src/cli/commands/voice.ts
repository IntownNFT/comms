import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "../../utils/logger.js";
import { voiceAgentStore } from "../stores.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const voiceCommand = new Command("voice")
  .description("Voice agent management");

// ─── List agents ───

voiceCommand
  .command("agents")
  .description("List all voice agents")
  .action(async () => {
    const store = await voiceAgentStore();
    const agents = store.getAllAgents();
    const defaultAgent = store.getDefaultAgent();

    if (agents.length === 0) {
      log.info("No voice agents configured.");
      return;
    }

    console.log();
    console.log(chalk.bold(`  Voice Agents (${agents.length})`));
    console.log(chalk.gray("  " + "\u2500".repeat(80)));
    for (const agent of agents) {
      const isDefault = agent.id === defaultAgent.id;
      const marker = isDefault ? chalk.green("\u2713") : " ";
      const id = chalk.gray(agent.id.slice(0, 8));
      const name = chalk.white(agent.agentName.padEnd(14));
      const engine = chalk.yellow((agent.voiceEngine || "gemini").padEnd(8));
      const voice = chalk.gray(agent.voice.padEnd(14));
      const template = chalk.cyan(agent.activeTemplate.padEnd(18));
      const phone = agent.phoneNumber ? chalk.magenta(agent.phoneNumber) : chalk.gray("no number");
      console.log(`  ${marker} ${id}  ${name}  ${engine}  ${voice}  ${template}  ${phone}`);
    }
    console.log();
    console.log(chalk.gray("  \u2713 = default agent"));
    console.log();
  });

// ─── Show agent details ───

voiceCommand
  .command("show <id>")
  .description("Show voice agent details by ID (prefix match)")
  .action(async (id: string) => {
    const store = await voiceAgentStore();
    const agents = store.getAllAgents();
    const match = agents.find((a: any) => a.id.startsWith(id));
    if (!match) {
      log.error(`Agent not found: ${id}`);
      return;
    }
    console.log();
    console.log(chalk.bold("Agent:       ") + match.agentName);
    console.log(chalk.bold("Company:     ") + match.companyName);
    console.log(chalk.bold("Template:    ") + match.activeTemplate);
    console.log(chalk.bold("Engine:      ") + (match.voiceEngine || "gemini"));
    console.log(chalk.bold("Voice:       ") + match.voice);
    console.log(chalk.bold("Phone:       ") + (match.phoneNumber || chalk.gray("not assigned")));
    console.log(chalk.bold("Callback:    ") + (match.callbackNumber || chalk.gray("not set")));
    console.log(chalk.bold("Transfer:    ") + (match.transferNumber || chalk.gray("not set")));
    console.log(chalk.bold("Max tries:   ") + match.maxAttempts);
    console.log(chalk.bold("Tools:       ") + (match.enableTools ? chalk.green("enabled") : chalk.gray("disabled")));
    const w = match.callWindows;
    console.log(chalk.bold("Call window: ") + `${w.startHour}:00-${w.endHour}:00, days ${w.daysOfWeek.join(",")}, ${w.timezone}`);
    if (match.customPrompt) {
      console.log();
      console.log(chalk.bold("Prompt:"));
      console.log(chalk.gray("\u2500".repeat(60)));
      console.log(match.customPrompt.slice(0, 500) + (match.customPrompt.length > 500 ? chalk.gray("...") : ""));
    }
    console.log();
  });

// ─── Create agent ───

voiceCommand
  .command("create")
  .description("Create a new voice agent")
  .action(async () => {
    const store = await voiceAgentStore();
    const templates = store.getTemplatePresets();

    const { templateKey } = await inquirer.prompt([{
      type: "list",
      name: "templateKey",
      message: "Choose a template:",
      choices: templates.map((t: any) => ({ name: `${t.label} — ${t.description}`, value: t.key })),
    }]);

    const agent = store.createAgent(templateKey);
    log.success(`Agent created: ${agent.agentName} (${agent.id.slice(0, 8)})`);

    const { customize } = await inquirer.prompt([{
      type: "confirm",
      name: "customize",
      message: "Customize this agent now?",
      default: true,
    }]);

    if (customize) {
      await editAgent(store, agent.id);
    }
  });

// ─── Edit agent ───

async function editAgent(store: any, agentId: string) {
  const agent = store.getAgentById(agentId);
  if (!agent) { log.error("Agent not found"); return; }

  const geminiVoices = store.GEMINI_VOICES;
  const openaiVoices = store.OPENAI_VOICES;

  const answers = await inquirer.prompt([
    { type: "input", name: "agentName", message: "Agent name:", default: agent.agentName },
    { type: "input", name: "companyName", message: "Company name:", default: agent.companyName },
    {
      type: "list",
      name: "voiceEngine",
      message: "Voice engine:",
      choices: [
        { name: "OpenAI Realtime (~230ms latency)", value: "openai" },
        { name: "Gemini Live (20 voices, native audio)", value: "gemini" },
      ],
      default: agent.voiceEngine || "gemini",
    },
    {
      type: "list",
      name: "voice",
      message: "Voice:",
      choices: (answers: any) => {
        const voices = answers.voiceEngine === "openai" ? openaiVoices : geminiVoices;
        return voices.map((v: any) => ({ name: `${v.label} (${v.description})`, value: v.id }));
      },
      default: agent.voice,
    },
    { type: "input", name: "phoneNumber", message: "Assigned phone number:", default: agent.phoneNumber || "" },
    { type: "input", name: "callbackNumber", message: "Callback number:", default: agent.callbackNumber || "" },
    { type: "input", name: "transferNumber", message: "Transfer number:", default: agent.transferNumber || "" },
    {
      type: "number",
      name: "maxAttempts",
      message: "Max call attempts:",
      default: agent.maxAttempts,
    },
  ]);

  const updated = store.updateAgent(agentId, {
    agentName: answers.agentName,
    companyName: answers.companyName,
    voiceEngine: answers.voiceEngine,
    voice: answers.voice,
    phoneNumber: answers.phoneNumber || "",
    callbackNumber: answers.callbackNumber || "",
    transferNumber: answers.transferNumber || "",
    maxAttempts: answers.maxAttempts,
  });

  if (updated) {
    log.success(`Agent updated: ${updated.agentName}`);
  } else {
    log.error("Failed to update agent.");
  }
}

voiceCommand
  .command("edit <id>")
  .description("Edit a voice agent interactively (prefix match)")
  .action(async (id: string) => {
    const store = await voiceAgentStore();
    const agents = store.getAllAgents();
    const match = agents.find((a: any) => a.id.startsWith(id));
    if (!match) {
      log.error(`Agent not found: ${id}`);
      return;
    }
    await editAgent(store, match.id);
  });

// ─── Set field directly ───

voiceCommand
  .command("set <id> <field> <value>")
  .description("Set a voice agent field (engine, voice, template, name, phone, company)")
  .action(async (id: string, field: string, value: string) => {
    const store = await voiceAgentStore();
    const agents = store.getAllAgents();
    const match = agents.find((a: any) => a.id.startsWith(id));
    if (!match) {
      log.error(`Agent not found: ${id}`);
      return;
    }

    const validFields: Record<string, string> = {
      engine: "voiceEngine",
      voice: "voice",
      name: "agentName",
      company: "companyName",
      phone: "phoneNumber",
      callback: "callbackNumber",
      transfer: "transferNumber",
    };

    const storeField = validFields[field] || field;

    // Validate engine
    if (storeField === "voiceEngine" && !["openai", "gemini"].includes(value)) {
      log.error(`Invalid engine "${value}". Use "openai" or "gemini".`);
      return;
    }

    // Validate voice against engine
    if (storeField === "voice") {
      const engine = match.voiceEngine || "gemini";
      const voices = engine === "openai" ? store.OPENAI_VOICES : store.GEMINI_VOICES;
      if (!voices.some((v: any) => v.id === value)) {
        log.error(`Invalid voice "${value}" for ${engine} engine. Available: ${voices.map((v: any) => v.id).join(", ")}`);
        return;
      }
    }

    const updated = store.updateAgent(match.id, { [storeField]: value });
    if (updated) {
      log.success(`${match.agentName}: ${field} = ${value}`);
    } else {
      log.error("Failed to update.");
    }
  });

// ─── Apply template ───

voiceCommand
  .command("template <id> [templateKey]")
  .description("Apply a template to an agent (prefix match)")
  .action(async (id: string, templateKey?: string) => {
    const store = await voiceAgentStore();
    const agents = store.getAllAgents();
    const match = agents.find((a: any) => a.id.startsWith(id));
    if (!match) {
      log.error(`Agent not found: ${id}`);
      return;
    }

    if (!templateKey) {
      const templates = store.getTemplatePresets();
      const answer = await inquirer.prompt([{
        type: "list",
        name: "key",
        message: "Choose template:",
        choices: templates.map((t: any) => ({ name: `${t.label} — ${t.description}`, value: t.key })),
      }]);
      templateKey = answer.key;
    }

    const result = store.applyTemplateToAgent(match.id, templateKey!);
    if (result) {
      log.success(`Template "${templateKey}" applied to ${result.agentName}`);
    } else {
      log.error(`Template "${templateKey}" not found.`);
    }
  });

// ─── Delete agent ───

voiceCommand
  .command("delete <id>")
  .description("Delete a voice agent (prefix match)")
  .action(async (id: string) => {
    const store = await voiceAgentStore();
    const agents = store.getAllAgents();
    const match = agents.find((a: any) => a.id.startsWith(id));
    if (!match) {
      log.error(`Agent not found: ${id}`);
      return;
    }

    const { confirm } = await inquirer.prompt([{
      type: "confirm",
      name: "confirm",
      message: `Delete agent "${match.agentName}" (${match.id.slice(0, 8)})?`,
      default: false,
    }]);

    if (!confirm) return;

    if (store.deleteAgent(match.id)) {
      log.success(`Deleted: ${match.agentName}`);
    } else {
      log.error("Failed to delete.");
    }
  });

// ─── Set default agent ───

voiceCommand
  .command("default <id>")
  .description("Set the default voice agent (prefix match)")
  .action(async (id: string) => {
    const store = await voiceAgentStore();
    const agents = store.getAllAgents();
    const match = agents.find((a: any) => a.id.startsWith(id));
    if (!match) {
      log.error(`Agent not found: ${id}`);
      return;
    }
    store.setDefaultAgent(match.id);
    log.success(`Default agent: ${match.agentName}`);
  });

// ─── List voices ───

voiceCommand
  .command("voices")
  .description("List available voices for each engine")
  .action(async () => {
    const store = await voiceAgentStore();

    console.log();
    console.log(chalk.bold("  OpenAI Realtime voices:"));
    for (const v of store.OPENAI_VOICES) {
      console.log(`    ${chalk.white(v.id.padEnd(12))} ${chalk.gray(v.description)}`);
    }
    console.log();
    console.log(chalk.bold("  Gemini Live voices:"));
    for (const v of store.GEMINI_VOICES) {
      console.log(`    ${chalk.white(v.id.padEnd(16))} ${chalk.gray(v.description)}`);
    }
    console.log();
  });

// ─── List templates ───

voiceCommand
  .command("templates")
  .description("List available agent templates")
  .action(async () => {
    const store = await voiceAgentStore();
    const templates = store.getTemplatePresets();

    console.log();
    console.log(chalk.bold("  Agent Templates"));
    console.log(chalk.gray("  " + "\u2500".repeat(60)));
    for (const t of templates) {
      console.log(`  ${chalk.cyan(t.key.padEnd(22))} ${chalk.white(t.label.padEnd(22))} ${chalk.gray(t.description)}`);
    }
    console.log();
  });

// ─── Start voice server ───

voiceCommand
  .command("start")
  .description("Start the voice server")
  .action(async () => {
    const store = await voiceAgentStore();
    const uiDir = path.resolve(__dirname, "../../../../ui");
    const agent = store.getDefaultAgent();

    log.info(`Starting voice server — agent "${agent.agentName}" (${agent.voiceEngine || "gemini"})...`);

    const child = spawn("npx", ["tsx", "voice-server.ts"], {
      cwd: uiDir,
      stdio: "inherit",
      shell: true,
      env: { ...process.env },
    });

    child.on("error", (err) => {
      log.error(`Failed to start voice server: ${err.message}`);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        log.warn(`Voice server exited with code ${code}`);
      }
    });
  });
