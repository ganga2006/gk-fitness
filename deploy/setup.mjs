// One-time setup: puts the GitHub Pages workflow and the VS Code tasks where
// GitHub and VS Code look for them.  Run from the project folder:  npm run setup:deploy
import { mkdirSync, copyFileSync } from 'node:fs';

mkdirSync('.github/workflows', { recursive: true });
copyFileSync('deploy/deploy-pages.yml', '.github/workflows/deploy-pages.yml');
mkdirSync('.vscode', { recursive: true });
copyFileSync('deploy/tasks.json', '.vscode/tasks.json');
console.log('✓ .github/workflows/deploy-pages.yml');
console.log('✓ .vscode/tasks.json');
console.log('Next: Source Control → Publish to GitHub (choose a PUBLIC repository).');
