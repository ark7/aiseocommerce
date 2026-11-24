import fs from 'fs';
import path from 'path';

function collectClientFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectClientFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const firstLines = content.split('\n').slice(0, 5).join('\n');
      if (firstLines.includes("'use client'") || firstLines.includes('"use client"')) {
        acc.push(full);
      }
    }
  }
  return acc;
}

describe('RBAC Client/Server Bundle Isolation Guard', () => {
  const root = process.cwd();

  it('keeps lib/rbac.ts strictly free of server-only imports (next/server, auth, prisma, middleware)', () => {
    const rbacContent = fs.readFileSync(path.join(root, 'lib/rbac.ts'), 'utf8');
    expect(rbacContent).not.toMatch(/from\s+['"]next\/server['"]/);
    expect(rbacContent).not.toMatch(/from\s+['"]\.\/auth['"]/);
    expect(rbacContent).not.toMatch(/from\s+['"]@\/lib\/auth['"]/);
    expect(rbacContent).not.toMatch(/from\s+['"]\.\/prisma['"]/);
    expect(rbacContent).not.toMatch(/from\s+['"]@\/lib\/prisma['"]/);
    expect(rbacContent).not.toMatch(/from\s+['"]@\/middleware['"]/);
    expect(rbacContent).not.toMatch(/JWT_SECRET/);
  });

  it('prevents any "use client" component/page from importing server-only modules', () => {
    const clientFiles = [
      ...collectClientFiles(path.join(root, 'app')),
      ...collectClientFiles(path.join(root, 'components')),
    ];
    expect(clientFiles.length).toBeGreaterThan(0);

    const forbiddenPattern =
      /from\s+['"]@\/(lib\/auth|lib\/rbacServer|lib\/prisma|lib\/superAdminAuth|lib\/paymentStorage|lib\/store|middleware)['"]/;

    const violations: string[] = [];
    for (const file of clientFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (forbiddenPattern.test(content)) {
        violations.push(path.relative(root, file));
      }
    }

    expect(violations).toEqual([]);
  });
});
