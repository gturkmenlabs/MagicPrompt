import { Project } from "ts-morph";
import fs from "fs";
import path from "path";

console.log("Starting refactor script via ts-morph...");

const project = new Project({
    compilerOptions: {
        paths: { "@/*": ["./*"] },
        jsx: 2 // React JSX
    }
});

function addFilesFromDir(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            addFilesFromDir(fullPath);
        } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
            project.addSourceFileAtPath(fullPath);
        }
    }
}

try { addFilesFromDir(path.join(process.cwd(), "components")); } catch (e) { console.error("Error components:", e); }
try { addFilesFromDir(path.join(process.cwd(), "services")); } catch (e) { console.error("Error services:", e); }
try { addFilesFromDir(path.join(process.cwd(), "hooks")); } catch (e) { console.error("Error hooks:", e); }
try { addFilesFromDir(path.join(process.cwd(), "utils")); } catch (e) { console.error("Error utils:", e); }
try { addFilesFromDir(path.join(process.cwd(), "types")); } catch (e) { console.error("Error types:", e); }
try { project.addSourceFileAtPath(path.join(process.cwd(), "App.tsx")); } catch (e) { console.error("Error app:", e); }
try { project.addSourceFileAtPath(path.join(process.cwd(), "index.tsx")); } catch (e) { console.error("Error index:", e); }
try { project.addSourceFileAtPath(path.join(process.cwd(), "types.ts")); } catch (e) { console.error("Error types file:", e); }
try { project.addSourceFileAtPath(path.join(process.cwd(), "data.ts")); } catch (e) { console.error("Error data file:", e); }

console.log("Loaded source files:", project.getSourceFiles().length);

function moveExactFiles(filesPathMap) {
    for (const [oldPath, newDir] of Object.entries(filesPathMap)) {
        // The path in ts-morph is typically absolute, so we get by suffix
        const matchingPath = project.getSourceFiles().find(sf => sf.getFilePath().includes(path.normalize(oldPath)));
        if (matchingPath) {
            console.log(`Moving ${oldPath} to ${newDir}`);
            // create dir if not exists
            fs.mkdirSync(path.resolve(process.cwd(), newDir), { recursive: true });
            matchingPath.moveToDirectory(path.resolve(process.cwd(), newDir));
        } else {
            console.warn(`Could not find AST for ${oldPath}`);
        }
    }
}

// 1. Files
const filesToMove = {
    // src/features/prompt-builder/components
    "components/DomainSelector.tsx": "src/features/prompt-builder/components",
    "components/FrameworkSelector.tsx": "src/features/prompt-builder/components",
    "components/TemplateSelector.tsx": "src/features/prompt-builder/components",
    "components/EnhancePanel.tsx": "src/features/prompt-builder/components",
    "components/EnrichmentPanel.tsx": "src/features/prompt-builder/components",
    "components/PromptTransformPanel.tsx": "src/features/prompt-builder/components",
    "components/PromptAnalysisPanel.tsx": "src/features/prompt-builder/components",
    "components/CodeDiffView.tsx": "src/features/prompt-builder/components",

    // src/features/ailab/components
    "components/AILabWorkbench.tsx": "src/features/ailab/components",
    "components/AgentPipeline.tsx": "src/features/ailab/components",
    "components/AgentStreamingUI.tsx": "src/features/ailab/components",
    "components/ailab/AgentFlowBuilder.tsx": "src/features/ailab/components",

    // src/features/optimizer/components
    "components/OptimizerPanel.tsx": "src/features/optimizer/components",
    "components/OptimizationMetrics.tsx": "src/features/optimizer/components",
    "components/OptimizationRoundCard.tsx": "src/features/optimizer/components",
    "components/optimizer/OptimizerSplitView.tsx": "src/features/optimizer/components",
    "components/OptimizerPasswordGate.tsx": "src/features/optimizer/components",
    "components/PromptEvolutionEngine.tsx": "src/features/optimizer/components",

    // src/features/testing/components
    "components/RegressionPanel.tsx": "src/features/testing/components",
    "components/TestCaseManager.tsx": "src/features/testing/components",
    "components/JudgePanel.tsx": "src/features/testing/components",
    "components/PromptLintPanel.tsx": "src/features/testing/components",
    "components/BudgetPanel.tsx": "src/features/testing/components",
    "components/BenchmarkPanel.tsx": "src/features/testing/components",

    // src/features/rag/components
    "components/RAGFlowDashboard.tsx": "src/features/rag/components",
    "components/RAGTechniquesDashboard.tsx": "src/features/rag/components",

    // src/features/templates/components
    "components/TemplateMarketplace.tsx": "src/features/templates/components",
    "components/PromptTemplateMarketplace.tsx": "src/features/templates/components",
    "components/CustomTemplateBuilder.tsx": "src/features/templates/components",
    "components/CustomBuilderPanel.tsx": "src/features/templates/components",

    // Command Palette
    "components/CommandPalette.tsx": "src/features/command-palette/components",

    // Domains
    "components/VibeCodingPanel.tsx": "src/features/vibe-coding/components",
    "components/ChatbotWidget.tsx": "src/shared/components",
    "components/AnalyticsDashboard.tsx": "src/features/analytics/components",
    "components/AdvancedAnalytics.tsx": "src/features/analytics/components",
    "components/PricingPage.tsx": "src/features/navigation/components",
    "components/AuthPage.tsx": "src/features/navigation/components",
    "components/DocumentationPage.tsx": "src/features/navigation/components",
    "components/DashboardHeader.tsx": "src/shared/layouts",
    "components/StatusFooter.tsx": "src/shared/layouts",
    "components/SmartSidebar.tsx": "src/features/navigation/components",
    "components/Sidebar.tsx": "src/features/navigation/components",
};

moveExactFiles(filesToMove);

// Moving Services
const serviceMoves = {
    // Providers
    "services/openaiService.ts": "src/services/providers",
    "services/claudeService.ts": "src/services/providers",
    "services/geminiService.ts": "src/services/providers",
    "services/groqService.ts": "src/services/providers",
    "services/deepseekService.ts": "src/services/providers",
    "services/huggingFaceService.ts": "src/services/providers",
    "services/openRouterService.ts": "src/services/providers",
    "services/ollamaProxyService.ts": "src/services/providers",
    "services/unifiedProviderService.ts": "src/services/providers",

    // Generation
    "services/irExtractor.ts": "src/services/generation",
    "services/judgeEnsemble.ts": "src/services/generation",
    "services/promptLint.ts": "src/services/generation",
    "services/styleProfiles.ts": "src/services/generation",
    "services/promptParser.ts": "src/services/generation",

    // Agents
    "services/orchestrator.ts": "src/services/agents",
    "services/multiAgentOrchestrator.ts": "src/services/agents",
    "services/agentTools.ts": "src/services/agents",
    "services/agentRecorder.ts": "src/services/agents",
    "services/agentService.ts": "src/services/agents",
    "services/qwenAgentService.ts": "src/services/agents",
    "services/autonomousTasks.ts": "src/services/agents",

    // Optimizer
    "services/optimizerService.ts": "src/services/optimizer",
    "services/optimizerPrompts.ts": "src/services/optimizer",
    "services/geneticAlgorithm.ts": "src/services/optimizer",
    "services/geneticPrompts.ts": "src/services/optimizer",
    "services/budgetOptimizer.ts": "src/services/optimizer",

    // Quality
    "services/testHarness.ts": "src/services/quality",
    "services/regressionRunner.ts": "src/services/quality",
    "services/regressionRunnerLocal.ts": "src/services/quality",
    "services/riskDiffAnalyzer.ts": "src/services/quality",
    "services/standardsComplianceService.ts": "src/services/quality",
    "services/godModeValidator.ts": "src/services/quality",
    "services/contractValidator.ts": "src/services/quality",

    // Platform
    "services/apiClient.ts": "src/services/platform",
    "services/telemetry.ts": "src/services/platform",
    "services/semanticCache.ts": "src/services/platform",
    "services/brainClient.ts": "src/services/platform",
    "services/supabaseClient.ts": "src/services/platform",
    "services/promptVersioning.ts": "src/services/platform",
    "services/promptLifecycle.ts": "src/services/platform",
    "services/promptLifecycleLocal.ts": "src/services/platform"
};

moveExactFiles(serviceMoves);

// Root files
const rootFilesMoves = {
    "App.tsx": "src/app",
    "index.tsx": "src/app",
    "types.ts": "src/shared/types",
    "data.ts": "src/shared/types"
};
moveExactFiles(rootFilesMoves);

// Safe batch moving: iterate individual files
const allFiles = project.getSourceFiles();
for (const f of allFiles) {
    const p = f.getFilePath();
    // Filter out files already moved to src/ this run, and ignore test files or node_modules
    if (p.includes("node_modules") || p.includes("/src/")) continue;

    if (p.includes("/components/")) {
        const dest = path.resolve(process.cwd(), "src/shared/components");
        fs.mkdirSync(dest, { recursive: true });
        try {
            f.moveToDirectory(dest);
        } catch (e) { }
    } else if (p.includes("/services/")) {
        const dest = path.resolve(process.cwd(), "src/services/shared");
        fs.mkdirSync(dest, { recursive: true });
        try {
            f.moveToDirectory(dest);
        } catch (e) { }
    } else if (p.includes("/utils/")) {
        const dest = path.resolve(process.cwd(), "src/shared/utils");
        fs.mkdirSync(dest, { recursive: true });
        try {
            f.moveToDirectory(dest);
        } catch (e) { }
    } else if (p.includes("/hooks/")) {
        const dest = path.resolve(process.cwd(), "src/shared/hooks");
        fs.mkdirSync(dest, { recursive: true });
        try {
            f.moveToDirectory(dest);
        } catch (e) { }
    } else if (p.includes("/types/")) {
        const dest = path.resolve(process.cwd(), "src/shared/types");
        fs.mkdirSync(dest, { recursive: true });
        try {
            f.moveToDirectory(dest);
        } catch (e) { }
    }
}

console.log("Saving TS-Morph AST Changes...");
project.saveSync();
console.log("Done refactoring imports & moving files.");
