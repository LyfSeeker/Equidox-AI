import { readAiFile } from "./files.js";
import { detectTechnologies } from "./skillLoader.js";

/**
 * Load prompt modules from backend/ai/prompts.
 */
export function loadPromptBundle() {
  return {
    system: readAiFile("prompts", "system.md"),
    reviewer: readAiFile("prompts", "reviewer.md"),
    scoring: readAiFile("prompts", "scoring.md"),
    decisionRules: readAiFile("prompts", "decision_rules.md"),
    outputSchema: readAiFile("prompts", "output_schema.md"),
  };
}

/**
 * Load only detected skill markdown bodies.
 */
export function loadSkillsForContext(context) {
  const ids = detectTechnologies(context);
  const skills = [];
  for (const id of ids) {
    try {
      skills.push({
        id,
        body: readAiFile("skills", `${id}.md`),
      });
    } catch {
      // skip missing
    }
  }
  return { ids, skills };
}

/**
 * Few-shot examples teaching scoring style.
 */
export function loadFewShotExamples() {
  const names = ["approved.json", "manual_review.json", "rejected.json"];
  return names.map((name) => {
    const raw = readAiFile("examples", name);
    return { name, json: JSON.parse(raw) };
  });
}

/**
 * Assemble system + reviewer prompts + skills into a system message.
 */
export function assembleSystemPrompt(context) {
  const prompts = loadPromptBundle();
  const { ids, skills } = loadSkillsForContext(context);
  const skillBlock = skills
    .map((s) => `\n----- SKILL: ${s.id} -----\n${s.body}`)
    .join("\n");

  return {
    skillIds: ids,
    systemMessage: [
      prompts.system,
      "",
      prompts.reviewer,
      "",
      prompts.scoring,
      "",
      prompts.decisionRules,
      "",
      prompts.outputSchema,
      "",
      "## Dynamically loaded skills (only technologies detected in evidence)",
      `Loaded: ${ids.join(", ") || "(none)"}`,
      skillBlock,
    ].join("\n"),
  };
}
