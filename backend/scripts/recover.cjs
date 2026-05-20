const fs = require('fs');
const path = require('path');
const os = require('os');

const cwd = process.cwd();
const historyDir = path.join(os.homedir(), "Library/Application Support/Cursor/User/History");

const fileMap = {
    "components/DomainSelector.tsx": "src/features/prompt-builder/components/DomainSelector.tsx",
    "components/FrameworkSelector.tsx": "src/features/prompt-builder/components/FrameworkSelector.tsx",
    "components/TemplateSelector.tsx": "src/features/prompt-builder/components/TemplateSelector.tsx",
    "components/EnhancePanel.tsx": "src/features/prompt-builder/components/EnhancePanel.tsx",
    "components/EnrichmentPanel.tsx": "src/features/prompt-builder/components/EnrichmentPanel.tsx",
    "components/PromptTransformPanel.tsx": "src/features/prompt-builder/components/PromptTransformPanel.tsx",
    "components/PromptAnalysisPanel.tsx": "src/features/prompt-builder/components/PromptAnalysisPanel.tsx",
    "components/CodeDiffView.tsx": "src/features/prompt-builder/components/CodeDiffView.tsx",

    "components/AILabWorkbench.tsx": "src/features/ailab/components/AILabWorkbench.tsx",
    "components/AgentPipeline.tsx": "src/features/ailab/components/AgentPipeline.tsx",
    "components/AgentStreamingUI.tsx": "src/features/ailab/components/AgentStreamingUI.tsx",
    "components/ailab/AgentFlowBuilder.tsx": "src/features/ailab/components/AgentFlowBuilder.tsx",

    "components/OptimizerPanel.tsx": "src/features/optimizer/components/OptimizerPanel.tsx",
    "components/OptimizationMetrics.tsx": "src/features/optimizer/components/OptimizationMetrics.tsx",
    "components/OptimizationRoundCard.tsx": "src/features/optimizer/components/OptimizationRoundCard.tsx",
    "components/optimizer/OptimizerSplitView.tsx": "src/features/optimizer/components/OptimizerSplitView.tsx",
    "components/OptimizerPasswordGate.tsx": "src/features/optimizer/components/OptimizerPasswordGate.tsx",
    "components/PromptEvolutionEngine.tsx": "src/features/optimizer/components/PromptEvolutionEngine.tsx",

    "components/RegressionPanel.tsx": "src/features/testing/components/RegressionPanel.tsx",
    "components/TestCaseManager.tsx": "src/features/testing/components/TestCaseManager.tsx",
    "components/JudgePanel.tsx": "src/features/testing/components/JudgePanel.tsx",
    "components/PromptLintPanel.tsx": "src/features/testing/components/PromptLintPanel.tsx",
    "components/BudgetPanel.tsx": "src/features/testing/components/BudgetPanel.tsx",
    "components/BenchmarkPanel.tsx": "src/features/testing/components/BenchmarkPanel.tsx",

    "components/RAGFlowDashboard.tsx": "src/features/rag/components/RAGFlowDashboard.tsx",
    "components/RAGTechniquesDashboard.tsx": "src/features/rag/components/RAGTechniquesDashboard.tsx",

    "components/TemplateMarketplace.tsx": "src/features/templates/components/TemplateMarketplace.tsx",
    "components/PromptTemplateMarketplace.tsx": "src/features/templates/components/PromptTemplateMarketplace.tsx",
    "components/CustomTemplateBuilder.tsx": "src/features/templates/components/CustomTemplateBuilder.tsx",
    "components/CustomBuilderPanel.tsx": "src/features/templates/components/CustomBuilderPanel.tsx",

    "components/CommandPalette.tsx": "src/features/command-palette/components/CommandPalette.tsx",
    "components/VibeCodingPanel.tsx": "src/features/vibe-coding/components/VibeCodingPanel.tsx",

    "components/ChatbotWidget.tsx": "src/shared/components/ChatbotWidget.tsx",
    "components/AnalyticsDashboard.tsx": "src/features/analytics/components/AnalyticsDashboard.tsx",
    "components/AdvancedAnalytics.tsx": "src/features/analytics/components/AdvancedAnalytics.tsx",

    "components/PricingPage.tsx": "src/features/navigation/components/PricingPage.tsx",
    "components/AuthPage.tsx": "src/features/navigation/components/AuthPage.tsx",
    "components/DocumentationPage.tsx": "src/features/navigation/components/DocumentationPage.tsx",
    "components/SmartSidebar.tsx": "src/features/navigation/components/SmartSidebar.tsx",
    "components/Sidebar.tsx": "src/features/navigation/components/Sidebar.tsx",

    "components/DashboardHeader.tsx": "src/shared/layouts/DashboardHeader.tsx",
    "components/StatusFooter.tsx": "src/shared/layouts/StatusFooter.tsx",

    "services/openaiService.ts": "src/services/providers/openaiService.ts",
    "services/claudeService.ts": "src/services/providers/claudeService.ts",
    "services/geminiService.ts": "src/services/providers/geminiService.ts",
    "services/groqService.ts": "src/services/providers/groqService.ts",
    "services/deepseekService.ts": "src/services/providers/deepseekService.ts",
    "services/huggingFaceService.ts": "src/services/providers/huggingFaceService.ts",
    "services/openRouterService.ts": "src/services/providers/openRouterService.ts",
    "services/ollamaProxyService.ts": "src/services/providers/ollamaProxyService.ts",
    "services/unifiedProviderService.ts": "src/services/providers/unifiedProviderService.ts",

    "services/irExtractor.ts": "src/services/generation/irExtractor.ts",
    "services/judgeEnsemble.ts": "src/services/generation/judgeEnsemble.ts",
    "services/promptLint.ts": "src/services/generation/promptLint.ts",
    "services/styleProfiles.ts": "src/services/generation/styleProfiles.ts",
    "services/promptParser.ts": "src/services/generation/promptParser.ts",

    "services/orchestrator.ts": "src/services/agents/orchestrator.ts",
    "services/multiAgentOrchestrator.ts": "src/services/agents/multiAgentOrchestrator.ts",
    "services/agentTools.ts": "src/services/agents/agentTools.ts",
    "services/agentRecorder.ts": "src/services/agents/agentRecorder.ts",
    "services/agentService.ts": "src/services/agents/agentService.ts",
    "services/qwenAgentService.ts": "src/services/agents/qwenAgentService.ts",
    "services/autonomousTasks.ts": "src/services/agents/autonomousTasks.ts",

    "services/optimizerService.ts": "src/services/optimizer/optimizerService.ts",
    "services/optimizerPrompts.ts": "src/services/optimizer/optimizerPrompts.ts",
    "services/geneticAlgorithm.ts": "src/services/optimizer/geneticAlgorithm.ts",
    "services/geneticPrompts.ts": "src/services/optimizer/geneticPrompts.ts",
    "services/budgetOptimizer.ts": "src/services/optimizer/budgetOptimizer.ts",

    "services/testHarness.ts": "src/services/quality/testHarness.ts",
    "services/regressionRunner.ts": "src/services/quality/regressionRunner.ts",
    "services/regressionRunnerLocal.ts": "src/services/quality/regressionRunnerLocal.ts",
    "services/riskDiffAnalyzer.ts": "src/services/quality/riskDiffAnalyzer.ts",
    "services/standardsComplianceService.ts": "src/services/quality/standardsComplianceService.ts",
    "services/godModeValidator.ts": "src/services/quality/godModeValidator.ts",
    "services/contractValidator.ts": "src/services/quality/contractValidator.ts",

    "services/apiClient.ts": "src/services/platform/apiClient.ts",
    "services/telemetry.ts": "src/services/platform/telemetry.ts",
    "services/semanticCache.ts": "src/services/platform/semanticCache.ts",
    "services/brainClient.ts": "src/services/platform/brainClient.ts",
    "services/supabaseClient.ts": "src/services/platform/supabaseClient.ts",
    "services/promptVersioning.ts": "src/services/platform/promptVersioning.ts",
    "services/promptLifecycle.ts": "src/services/platform/promptLifecycle.ts",
    "services/promptLifecycleLocal.ts": "src/services/platform/promptLifecycleLocal.ts",

    "App.tsx": "src/app/App.tsx",
    "index.tsx": "src/app/index.tsx",
    "types.ts": "src/shared/types/index.ts",
    "data.ts": "src/shared/types/data.ts"
};

const keys = Object.keys(fileMap);
const latestVersions = {};

const dirs = fs.readdirSync(historyDir);
for (const dir of dirs) {
    const entriesPath = path.join(historyDir, dir, "entries.json");
    if (!fs.existsSync(entriesPath)) continue;

    try {
        const data = JSON.parse(fs.readFileSync(entriesPath, "utf-8"));
        const resource = data.resource;

        for (const key of keys) {
            if (resource.endsWith("/" + key) || resource.endsWith("%21/" + key)) {
                const lastEntry = data.entries[data.entries.length - 1];
                if (!latestVersions[key] || lastEntry.timestamp > latestVersions[key].timestamp) {
                    latestVersions[key] = {
                        historyFilePath: path.join(historyDir, dir, lastEntry.id),
                        timestamp: lastEntry.timestamp,
                        dest: path.join(cwd, fileMap[key])
                    };
                }
            }
        }
    } catch (e) { }
}

let recoveredCount = 0;
for (const key of keys) {
    const version = latestVersions[key];
    const destPath = path.join(cwd, fileMap[key]);

    if (version) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(version.historyFilePath, destPath);
        console.log("RECOVERED:", key, "->", fileMap[key]);
        recoveredCount++;
    } else {
        // Some components might not be in history if they haven't been edited.
        // Try to find them verbatim from super-master or superreasoning dirs as fallback.
        const fb1 = path.join(os.homedir(), "Desktop/super-master", key);
        const fb2 = path.join(os.homedir(), "superreasoning", key);
        if (fs.existsSync(fb1)) {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.copyFileSync(fb1, destPath);
            console.log("RECOVERED (Fallback super-master):", key, "->", fileMap[key]);
            recoveredCount++;
        } else if (fs.existsSync(fb2)) {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.copyFileSync(fb2, destPath);
            console.log("RECOVERED (Fallback superreasoning):", key, "->", fileMap[key]);
            recoveredCount++;
        } else {
            console.error("MISSING COMPLETELY:", key);
        }
    }
}

console.log("Total files recovered:", recoveredCount, "/", keys.length);
