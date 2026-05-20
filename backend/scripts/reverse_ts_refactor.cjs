const { Project } = require("ts-morph");
const fs = require("fs");
const path = require("path");

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + "/" + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes("node_modules") && !file.includes(".git")) {
            results.push(...walk(file));
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            results.push(file);
        }
    });
    return results;
}

const project = new Project({
    compilerOptions: {
        target: 2,
        module: 1,
        jsx: 2,
        allowJs: true,
        baseUrl: "./",
        paths: { "*": ["*"] }
    }
});

const files = walk(process.cwd());
files.forEach(f => {
    try {
        project.addSourceFileAtPath(f);
    } catch (e) { }
});

const sourceFiles = project.getSourceFiles();

const oldToNew = {
    "features/prompt-builder/components": "components",
    "features/ailab/components": "components",
    "features/optimizer/components": "components",
    "features/testing/components": "components",
    "features/rag/components": "components",
    "features/templates/components": "components",
    "features/command-palette/components": "components",
    "features/vibe-coding/components": "components",
    "features/analytics/components": "components",
    "features/navigation/components": "components",
    "shared/components": "components",
    "shared/layouts": "components",
    "services/providers": "services",
    "services/generation": "services",
    "services/agents": "services",
    "services/optimizer": "services",
    "services/quality": "services",
    "services/platform": "services",
    "services/shared": "services",
    "shared/utils": "utils",
    "shared/hooks": "hooks",
    "shared/types": "types",
    "app": ""
};

let totalModified = 0;

for (const sourceFile of sourceFiles) {
    let modified = false;
    const imports = sourceFile.getImportDeclarations();

    for (const imp of imports) {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        if (moduleSpecifier.startsWith(".")) {
            // resolve absolute path of what it imports
            const currentDir = path.dirname(sourceFile.getFilePath());
            let importedFullPath = path.resolve(currentDir, moduleSpecifier);

            // Re-map the imported path
            let mappedPath = importedFullPath;
            // The imported file was in src/..., we need to map it to ...
            const srcPattern = path.join(process.cwd(), "src");
            if (importedFullPath.startsWith(srcPattern)) {
                let relativeToSrc = path.relative(srcPattern, importedFullPath);
                let newRelative = relativeToSrc;
                for (const [newP, oldP] of Object.entries(oldToNew)) {
                    if (relativeToSrc.startsWith(newP)) {
                        newRelative = path.join(oldP, relativeToSrc.substring(newP.length));
                        break;
                    }
                }

                // Now mappedPath is in the root directory
                mappedPath = path.join(process.cwd(), newRelative);
            } else if (importedFullPath.includes("src/")) {
                // handles explicit src/
                mappedPath = importedFullPath.replace("/src/", "/");
            }

            // Also, mapping the current file's future path
            let myFuturePath = sourceFile.getFilePath();
            if (myFuturePath.startsWith(srcPattern)) {
                let relativeToSrc = path.relative(srcPattern, myFuturePath);
                let newRelative = relativeToSrc;
                for (const [newP, oldP] of Object.entries(oldToNew)) {
                    if (relativeToSrc.startsWith(newP)) {
                        newRelative = path.join(oldP, relativeToSrc.substring(newP.length));
                        break;
                    }
                }
                myFuturePath = path.join(process.cwd(), newRelative);
            }

            // Calculate new relative import
            if (mappedPath !== importedFullPath || myFuturePath !== sourceFile.getFilePath()) {
                let newSpecifier = path.relative(path.dirname(myFuturePath), mappedPath);
                if (!newSpecifier.startsWith(".")) newSpecifier = "./" + newSpecifier;
                newSpecifier = newSpecifier.replace(/\\/g, "/");

                imp.setModuleSpecifier(newSpecifier);
                modified = true;
            }
        }
    }

    if (modified) {
        totalModified++;
    }
}

console.log(`Reverted imports in ${totalModified} files.`);
project.saveSync();
