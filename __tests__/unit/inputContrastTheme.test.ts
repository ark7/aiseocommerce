import fs from 'fs';
import path from 'path';

describe('Universal Form Input Contrast & Theme Guard', () => {
  const globalsCssPath = path.join(process.cwd(), 'app/globals.css');

  it('globals.css defines universal base layer rules for input, textarea, and select contrast', () => {
    expect(fs.existsSync(globalsCssPath)).toBe(true);
    const css = fs.readFileSync(globalsCssPath, 'utf8');

    // Must define @layer base
    expect(css).toContain('@layer base');

    // Default input color must be dark (e.g. #0f172a or Slate 900)
    expect(css).toMatch(/input[\s\S]*color:\s*#0f172a/);
    expect(css).toMatch(/textarea[\s\S]*color:\s*#0f172a/);
    expect(css).toMatch(/select[\s\S]*color:\s*#0f172a/);

    // Dark mode input styling must be defined
    expect(css).toMatch(/\.dark\s+input[\s\S]*color:\s*#f8fafc/);
    expect(css).toMatch(/\.dark\s+input[\s\S]*background-color:\s*#1e293b/);

    // Safety guard for inputs inside white/light containers in dark mode
    expect(css).toMatch(/\.dark\s+\.bg-white\s+input[\s\S]*color:\s*#0f172a/);
  });

  it('LoginForm component includes explicit text and background contrast classes', () => {
    const loginFormPath = path.join(process.cwd(), 'components/LoginForm.tsx');
    expect(fs.existsSync(loginFormPath)).toBe(true);
    const code = fs.readFileSync(loginFormPath, 'utf8');

    expect(code).toContain('text-slate-900');
    expect(code).toContain('dark:text-white');
    expect(code).toContain('bg-white');
    expect(code).toContain('dark:bg-slate-800');
  });

  it('RegisterForm component includes explicit text and background contrast classes', () => {
    const registerFormPath = path.join(process.cwd(), 'components/RegisterForm.tsx');
    expect(fs.existsSync(registerFormPath)).toBe(true);
    const code = fs.readFileSync(registerFormPath, 'utf8');

    expect(code).toContain('text-slate-900');
    expect(code).toContain('dark:text-white');
    expect(code).toContain('bg-white');
    expect(code).toContain('dark:bg-slate-800');
  });

  it('Admin Settings email tab includes high contrast classes on input fields', () => {
    const settingsPath = path.join(process.cwd(), 'app/admin/settings/page.tsx');
    expect(fs.existsSync(settingsPath)).toBe(true);
    const code = fs.readFileSync(settingsPath, 'utf8');

    // Verify SMTP host input has high-contrast classes
    expect(code).toContain('text-gray-900 dark:text-white bg-white dark:bg-slate-800');
  });
});
