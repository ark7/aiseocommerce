import fs from 'fs';
import path from 'path';

const SCAN_DIRS = [
  'app',
  'components',
  'lib',
  'services',
  'prisma',
  'scripts',
  'deploy',
  'nginx',
  'docs',
  'wordpress',
];

const ROOT_FILES = [
  'docker-compose.yml',
  'AGENTS.md',
  'README.md',
  'netlify.toml',
  '.env.example',
  'package.json',
];

const SKIP_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.pdf',
  '.zip',
  '.db',
  '.sqlite',
]);

function collectFiles(rootDir: string): string[] {
  const files: string[] = [];

  for (const relFile of ROOT_FILES) {
    const abs = path.join(rootDir, relFile);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      files.push(abs);
    }
  }

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.next' ||
        entry.name === '.git' ||
        entry.name === '.agents' ||
        entry.name === '__tests__'
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!SKIP_EXTENSIONS.has(ext) && entry.name !== 'package-lock.json') {
          files.push(fullPath);
        }
      }
    }
  }

  for (const dir of SCAN_DIRS) {
    walk(path.join(rootDir, dir));
  }

  return files;
}

describe('Anti-Secret Guard (No Exposed Credentials in Repository)', () => {
  const repoRoot = process.cwd();
  const exposedNeonEndpointPattern = new RegExp('ep-icy-scene-' + 'azp2bur3', 'i');
  const exposedNeonPasswordPattern = /\bnpg_[A-Za-z0-9]{8,}\b/;
  const hardcodedNeonUriPattern = /postgresql:\/\/[^:\s"']+:npg_[^@\s"']+@/i;
  const privateKeyPattern = /-----BEGIN (?:OPENSSH|RSA|EC|DSA) PRIVATE KEY-----/;

  it('contains zero Neon credentials, exposed production endpoints, or private keys across source, docs, and scripts', () => {
    const files = collectFiles(repoRoot);
    expect(files.length).toBeGreaterThan(10);

    const violations: string[] = [];

    for (const absPath of files) {
      const content = fs.readFileSync(absPath, 'utf8');
      const rel = path.relative(repoRoot, absPath);

      if (exposedNeonEndpointPattern.test(content)) {
        violations.push(`${rel}: exposed Neon production endpoint`);
      }
      if (exposedNeonPasswordPattern.test(content)) {
        violations.push(`${rel}: exposed Neon password token`);
      }
      if (hardcodedNeonUriPattern.test(content)) {
        violations.push(`${rel}: hardcoded Neon PostgreSQL URI`);
      }
      if (privateKeyPattern.test(content)) {
        violations.push(`${rel}: private SSH/TLS key material`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('uses safe environment placeholders in hosting guide and loads DATABASE_URL from env in Beekeeper script', () => {
    const hostingGuide = fs.readFileSync(
      path.join(repoRoot, 'docs', 'IDCLOUDHOST_HOSTING_GUIDE.md'),
      'utf8'
    );
    expect(hostingGuide).toContain('<NEON_USER>:<NEON_PASSWORD>@<NEON_POOLER_HOST>');
    expect(hostingGuide).not.toMatch(exposedNeonPasswordPattern);

    const beekeeperScript = fs.readFileSync(
      path.join(repoRoot, 'scripts', 'setup-beekeeper-connections.mjs'),
      'utf8'
    );
    expect(beekeeperScript).toContain("loadEnvVarFromDotEnv('DATABASE_URL')");
    expect(beekeeperScript).toContain('new URL(connectionUrl)');
    expect(beekeeperScript).not.toMatch(exposedNeonPasswordPattern);
  });
});
