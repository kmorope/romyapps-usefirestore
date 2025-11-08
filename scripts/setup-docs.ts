#!/usr/bin/env bun

/**
 * Setup script for GitHub Pages documentation
 * Run with: bun run scripts/setup-docs.ts
 */

const GITHUB_USERNAME = "kmorope";
const REPO_NAME = "romyapps-usefirestore";

console.log("🚀 Setting up GitHub Pages documentation...\n");

// Step 1: Check if we're in a git repository
const checkGit = () => {
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--git-dir"]);
    return result.exitCode === 0;
  } catch {
    return false;
  }
};

if (!checkGit()) {
  console.error(
    "❌ Not in a git repository. Please run this from your project root."
  );
  process.exit(1);
}

console.log("✅ Git repository detected");
console.log("");

// Step 2: GitHub Configuration
console.log("📝 GitHub Configuration:");
console.log(`   Username: ${GITHUB_USERNAME}`);
console.log(`   Repository: ${REPO_NAME}`);
console.log(`   Docs URL: https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/`);
console.log("");

// Step 3: Instructions
console.log("📖 Next steps:\n");
console.log("1️⃣  Enable GitHub Pages in your repository:");
console.log(
  `   👉 https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/settings/pages`
);
console.log("");
console.log("2️⃣  Under 'Build and deployment':");
console.log("   • Source: GitHub Actions");
console.log("");
console.log("3️⃣  Commit and push your changes:");
console.log("   git add .");
console.log("   git commit -m 'docs: setup GitHub Pages with VitePress'");
console.log("   git push");
console.log("");
console.log("4️⃣  The workflow will automatically run and deploy your docs!");
console.log("");
console.log("5️⃣  Your documentation will be available at:");
console.log(`   🌐 https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/`);
console.log("");
console.log("📚 Local development commands:");
console.log("   bun run docs:dev     - Start dev server");
console.log("   bun run docs:build   - Build for production");
console.log("   bun run docs:preview - Preview production build");
console.log("");
console.log(
  "✨ Setup information displayed! Follow the steps above to deploy your docs."
);
