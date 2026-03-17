import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { log } from "../../utils/logger.js";
import { settingsStore, aiSettingsStore } from "../stores.js";

export const settingsCommand = new Command("settings")
  .description("View and manage app settings");

// ─── Show all settings ───

settingsCommand
  .command("show")
  .alias("view")
  .description("Show current settings")
  .action(async () => {
    const sStore = await settingsStore();
    const aiStore = await aiSettingsStore();
    const settings = sStore.getSettings();
    const aiSettings = aiStore.getAISettings();

    console.log();
    console.log(chalk.bold("  App Settings"));
    console.log(chalk.gray("  " + "\u2500".repeat(50)));
    console.log(chalk.bold("  Model:          ") + (settings.anthropicModel || "default"));
    console.log(chalk.bold("  Temperature:    ") + (settings.temperature ?? 0.7));
    console.log(chalk.bold("  From email:     ") + (settings.fromEmail || chalk.gray("not set")));
    console.log(chalk.bold("  Notifications:  ") + (settings.notificationsEnabled ? chalk.green("on") : chalk.gray("off")));

    if (settings.agentModes) {
      console.log();
      console.log(chalk.bold("  Agent Modes"));
      console.log(chalk.gray("  " + "\u2500".repeat(50)));
      for (const [tool, mode] of Object.entries(settings.agentModes)) {
        const modeColor = mode === "auto" ? chalk.green(mode) : mode === "draft" ? chalk.yellow(mode) : chalk.gray(mode as string);
        console.log(`  ${chalk.white(tool.padEnd(20))} ${modeColor}`);
      }
    }

    console.log();
    console.log(chalk.bold("  AI Email Settings"));
    console.log(chalk.gray("  " + "\u2500".repeat(50)));
    console.log(chalk.bold("  Auto-tag:       ") + (aiSettings.autoTagEnabled ? chalk.green("on") : chalk.gray("off")));
    console.log(chalk.bold("  Auto-respond:   ") + (aiSettings.autoRespondEnabled ? chalk.green("on") : chalk.gray("off")));
    console.log(chalk.bold("  Auto-summarize: ") + (aiSettings.autoSummarizeEnabled ? chalk.green("on") : chalk.gray("off")));
    if (aiSettings.customSystemPrompt) {
      console.log(chalk.bold("  System prompt:  ") + chalk.gray(aiSettings.customSystemPrompt.slice(0, 80) + "..."));
    }
    if (aiSettings.tags?.length > 0) {
      console.log(chalk.bold("  Tags:           ") + aiSettings.tags.map((t: any) => chalk.cyan(t.name)).join(", "));
    }
    console.log();
  });

// ─── Set agent mode ───

settingsCommand
  .command("mode <tool> <mode>")
  .description("Set agent mode for a tool (auto, draft, manual)")
  .action(async (tool: string, mode: string) => {
    if (!["auto", "draft", "manual"].includes(mode)) {
      log.error(`Invalid mode "${mode}". Use: auto, draft, manual`);
      return;
    }

    const sStore = await settingsStore();
    const current = sStore.getSettings();
    const agentModes = { ...current.agentModes, [tool]: mode };
    sStore.updateSettings({ agentModes });
    log.success(`${tool} mode set to ${mode}`);
  });

// ─── Set key-value setting ───

settingsCommand
  .command("set <key> <value>")
  .description("Set a setting (model, temperature, fromEmail, notifications)")
  .action(async (key: string, value: string) => {
    const sStore = await settingsStore();

    const updates: Record<string, any> = {};
    switch (key) {
      case "model":
        updates.anthropicModel = value;
        break;
      case "temperature":
        updates.temperature = parseFloat(value);
        break;
      case "fromEmail":
      case "from-email":
        updates.fromEmail = value;
        break;
      case "notifications":
        updates.notificationsEnabled = value === "true" || value === "on";
        break;
      default:
        log.error(`Unknown setting "${key}". Use: model, temperature, fromEmail, notifications`);
        return;
    }

    sStore.updateSettings(updates);
    log.success(`${key} = ${value}`);
  });

// ─── AI settings ───

settingsCommand
  .command("ai")
  .description("Configure AI email processing settings interactively")
  .action(async () => {
    const aiStore = await aiSettingsStore();
    const current = aiStore.getAISettings();

    const answers = await inquirer.prompt([
      {
        type: "confirm",
        name: "autoTagEnabled",
        message: "Auto-tag incoming emails?",
        default: current.autoTagEnabled ?? false,
      },
      {
        type: "confirm",
        name: "autoRespondEnabled",
        message: "Auto-respond to emails?",
        default: current.autoRespondEnabled ?? false,
      },
      {
        type: "confirm",
        name: "autoSummarizeEnabled",
        message: "Auto-summarize emails?",
        default: current.autoSummarizeEnabled ?? false,
      },
      {
        type: "input",
        name: "customSystemPrompt",
        message: "Custom system prompt (enter to keep current):",
        default: current.customSystemPrompt || "",
      },
    ]);

    aiStore.updateAISettings(answers);
    log.success("AI settings updated.");
  });

// ─── Default action: show settings ───

settingsCommand
  .action(async () => {
    // If no subcommand, show settings
    const sStore = await settingsStore();
    const settings = sStore.getSettings();
    console.log();
    console.log(chalk.bold("  Settings") + chalk.gray(" (use 'comms settings show' for full view)"));
    console.log(chalk.gray("  " + "\u2500".repeat(50)));
    console.log(chalk.bold("  Model:          ") + (settings.anthropicModel || "default"));
    console.log(chalk.bold("  From email:     ") + (settings.fromEmail || chalk.gray("not set")));
    if (settings.agentModes) {
      for (const [tool, mode] of Object.entries(settings.agentModes)) {
        const modeColor = mode === "auto" ? chalk.green(mode) : mode === "draft" ? chalk.yellow(mode) : chalk.gray(mode as string);
        console.log(`  ${chalk.white(tool.padEnd(20))} ${modeColor}`);
      }
    }
    console.log();
  });
