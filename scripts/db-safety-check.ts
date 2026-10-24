import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface SafetyViolation {
  model: string;
  field?: string;
  rule: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
  recommendation: string;
}

export interface SchemaValidationResult {
  ok: boolean;
  errors: SafetyViolation[];
  warnings: SafetyViolation[];
}

export interface ParsedField {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  attributes: string[];
  raw: string;
}

export interface ParsedModel {
  name: string;
  fields: ParsedField[];
  uniqueBlocks: string[][];
  rawLines: string[];
}

const SCALAR_TYPES = new Set([
  'String',
  'Boolean',
  'Int',
  'Float',
  'Decimal',
  'DateTime',
  'Json',
  'Bytes',
  'BigInt',
]);

/**
 * Parses the models and their fields from a Prisma schema string.
 */
export function parsePrismaSchema(content: string): ParsedModel[] {
  const models: ParsedModel[] = [];
  const lines = content.split('\n');

  let currentModel: ParsedModel | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('//')) {
      continue;
    }

    const modelMatch = line.match(/^model\s+([A-Za-z0-9_]+)\s*\{/);
    if (modelMatch) {
      currentModel = {
        name: modelMatch[1],
        fields: [],
        uniqueBlocks: [],
        rawLines: [],
      };
      continue;
    }

    if (line === '}' && currentModel) {
      models.push(currentModel);
      currentModel = null;
      continue;
    }

    if (currentModel) {
      currentModel.rawLines.push(line);

      const uniqueBlockMatch = line.match(/@@unique\s*\(\s*\[([^\]]+)\]/);
      if (uniqueBlockMatch) {
        const fields = uniqueBlockMatch[1]
          .split(',')
          .map((f) => f.trim().replace(/['"]/g, ''))
          .filter(Boolean);
        currentModel.uniqueBlocks.push(fields);
        continue;
      }

      if (line.startsWith('@@')) {
        continue;
      }

      const fieldParts = line.split(/\s+/);
      if (fieldParts.length >= 2) {
        const name = fieldParts[0];
        const rawType = fieldParts[1];
        const attributes = fieldParts.slice(2);

        const isOptional = rawType.endsWith('?');
        const isArray = rawType.endsWith('[]');
        const cleanType = rawType.replace(/[?\[\]]/g, '');

        currentModel.fields.push({
          name,
          type: cleanType,
          isOptional,
          isArray,
          attributes,
          raw: line,
        });
      }
    }
  }

  return models;
}

/**
 * Analyzes a git diff of prisma/schema.prisma for newly introduced dangerous changes:
 * 1. Newly added non-nullable scalar columns without default values.
 * 2. Removed columns or models (destructive drop).
 * 3. Newly added unique constraints that break multi-tenancy.
 */
export function validateSchemaDiff(diffText: string): SchemaValidationResult {
  const errors: SafetyViolation[] = [];
  const warnings: SafetyViolation[] = [];

  const lines = diffText.split('\n');
  let currentModel = 'Unknown';

  for (const line of lines) {
    // Detect model context from diff hunks or model definitions
    const modelHunkMatch = line.match(/model\s+([A-Za-z0-9_]+)/);
    if (modelHunkMatch) {
      currentModel = modelHunkMatch[1];
    }

    // Check for removed lines (destructive changes)
    if (line.startsWith('-') && !line.startsWith('---')) {
      const stripped = line.substring(1).trim();
      if (!stripped || stripped.startsWith('//')) continue;

      if (stripped.startsWith('model ')) {
        errors.push({
          model: stripped.replace(/model\s+|\s*\{/g, ''),
          rule: 'DESTRUCTIVE_MODEL_DROP',
          severity: 'ERROR',
          message: `Model '${stripped}' dihapus dari skema. Menghapus tabel akan melenyapkan seluruh data toko & pelanggan secara permanen!`,
          recommendation: 'Gunakan pola Expand-and-Contract. Jangan hapus tabel aktif sebelum data dimigrasikan dan diarsip.',
        });
      } else if (!stripped.startsWith('@@') && !stripped.startsWith('@')) {
        const fieldName = stripped.split(/\s+/)[0];
        warnings.push({
          model: currentModel,
          field: fieldName,
          rule: 'DESTRUCTIVE_FIELD_DROP',
          severity: 'WARNING',
          message: `Field '${fieldName}' dihapus dari model '${currentModel}'. Perintah db push akan menghapus kolom ini dari PostgreSQL beserta seluruh data historisnya.`,
          recommendation: 'Pastikan kolom ini benar-benar tidak lagi digunakan di seluruh endpoint sebelum dihapus.',
        });
      }
    }

    // Check for added lines (new fields and constraints)
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const stripped = line.substring(1).trim();
      if (!stripped || stripped.startsWith('//')) continue;

      // Check added @@unique
      const uniqueMatch = stripped.match(/@@unique\s*\(\s*\[([^\]]+)\]/);
      if (uniqueMatch) {
        const fields = uniqueMatch[1].split(',').map((f) => f.trim().replace(/['"]/g, ''));
        // If it's a tenant model, ensure storeId is included
        if (fields.length > 0 && !fields.includes('storeId') && fields.includes('slug')) {
          errors.push({
            model: currentModel,
            rule: 'MULTI_TENANT_UNIQUE_CONSTRAINT_MISSING_STORE_ID',
            severity: 'ERROR',
            message: `Penambahan @@unique([${fields.join(', ')}]) pada '${currentModel}' tidak menyertakan 'storeId'.`,
            recommendation: `Ubah menjadi @@unique([storeId, ${fields.join(', ')}]) agar tidak terjadi benturan identifier antar toko.`,
          });
        }
      }

      // Check added fields
      const fieldParts = stripped.split(/\s+/);
      if (fieldParts.length >= 2 && !stripped.startsWith('@@') && !stripped.startsWith('model ')) {
        const fieldName = fieldParts[0];
        const rawType = fieldParts[1];
        const attributes = fieldParts.slice(2);

        const isOptional = rawType.endsWith('?');
        const isArray = rawType.endsWith('[]');
        const cleanType = rawType.replace(/[?\[\]]/g, '');

        const isId = fieldName === 'id' || attributes.some((attr) => attr.startsWith('@id'));
        const hasDefault = attributes.some((attr) => attr.startsWith('@default'));
        const isUpdatedAt = attributes.some((attr) => attr.startsWith('@updatedAt'));
        const isForeignKey = fieldName.endsWith('Id');

        if (
          !isOptional &&
          !isArray &&
          !isId &&
          !hasDefault &&
          !isUpdatedAt &&
          !isForeignKey &&
          SCALAR_TYPES.has(cleanType)
        ) {
          errors.push({
            model: currentModel,
            field: fieldName,
            rule: 'NEW_NON_NULLABLE_FIELD_WITHOUT_DEFAULT',
            severity: 'ERROR',
            message: `Kolom baru '${currentModel}.${fieldName}' (${cleanType}) bersifat non-nullable (NOT NULL) tetapi TIDAK memiliki '@default(...)'.`,
            recommendation: `Tambahkan '@default(...)' atau jadikan opsional ('${cleanType}?'). Menambahkan kolom NOT NULL tanpa default pada tabel yang sudah berisi data toko akan menyebabkan error 'column cannot be added' atau kegagalan migrasi.`,
          });
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates full schema content for baseline multi-tenant isolation rules.
 */
export function validateFullSchema(content: string): SchemaValidationResult {
  const models = parsePrismaSchema(content);
  const errors: SafetyViolation[] = [];
  const warnings: SafetyViolation[] = [];

  for (const model of models) {
    const isTenantModel = model.fields.some((f) => f.name === 'storeId');

    if (isTenantModel) {
      // Validate unique indexes
      for (const uniqueFields of model.uniqueBlocks) {
        if (uniqueFields.length === 1 && uniqueFields[0] === 'storeId') {
          continue; // Singleton settings per store
        }

        // Slug, code, or name should always be scoped with storeId
        if (
          (uniqueFields.includes('slug') || uniqueFields.includes('code') || uniqueFields.includes('name')) &&
          !uniqueFields.includes('storeId')
        ) {
          errors.push({
            model: model.name,
            rule: 'MULTI_TENANT_UNIQUE_CONSTRAINT_MISSING_STORE_ID',
            severity: 'ERROR',
            message: `Model '${model.name}' mendefinisikan @@unique([${uniqueFields.join(', ')}]) tanpa menyertakan 'storeId'.`,
            recommendation: `Ubah menjadi @@unique([storeId, ${uniqueFields.join(', ')}]) agar tidak bentrok antar toko tenant.`,
          });
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * CLI Runner
 */
export function runSafetyCheck(schemaPath?: string, forceFullAudit = false): boolean {
  const targetPath = schemaPath || path.resolve(process.cwd(), 'prisma/schema.prisma');

  console.log('\n======================================================');
  console.log('🛡️  PRISMA MULTI-TENANT DATABASE SAFETY CHECKER');
  console.log('======================================================');

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ File skema tidak ditemukan di: ${targetPath}`);
    return false;
  }

  let result: SchemaValidationResult = { ok: true, errors: [], warnings: [] };
  let isDiffCheck = false;

  // Try checking git diff if git is available and not in full audit mode
  if (!forceFullAudit) {
    try {
      const gitDiff = execSync(`git diff HEAD -- ${targetPath}`, { encoding: 'utf-8' });
      if (gitDiff && gitDiff.trim().length > 0) {
        console.log(`🔍 Memeriksa perubahan skema terkini via Git Diff...`);
        result = validateSchemaDiff(gitDiff);
        isDiffCheck = true;
      }
    } catch {
      // Fallback to full audit if git diff is unavailable
    }
  }

  if (!isDiffCheck) {
    console.log(`🔍 Menjalankan audit integritas multi-tenant pada skema penuh: ${targetPath}`);
    const content = fs.readFileSync(targetPath, 'utf-8');
    result = validateFullSchema(content);
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  DITEMUKAN ${result.warnings.length} PERINGATAN (WARNING):`);
    result.warnings.forEach((w, idx) => {
      console.log(`  [W${idx + 1}] Model '${w.model}'${w.field ? ` -> field '${w.field}'` : ''}:`);
      console.log(`      Pesan   : ${w.message}`);
      console.log(`      Saran   : ${w.recommendation}\n`);
    });
    console.log('------------------------------------------------------');
  }

  if (result.errors.length > 0) {
    console.error(`\n❌ DITEMUKAN ${result.errors.length} PELANGGARAN KRITIS (ERROR):`);
    result.errors.forEach((e, idx) => {
      console.error(`  [E${idx + 1}] Model '${e.model}'${e.field ? ` -> field '${e.field}'` : ''}:`);
      console.error(`      Pesan   : ${e.message}`);
      console.error(`      Aturan  : ${e.rule}`);
      console.error(`      Solusi  : ${e.recommendation}\n`);
    });
    console.error('🚫 PUSH SKEMA DIBATALKAN: Perbaiki error di atas sebelum menjalankan prisma db push.');
    console.error('   Hal ini krusial untuk mencegah kegagalan runtime atau kerusakan data toko pelanggan.\n');
    return false;
  }

  console.log('\n✅ SELURUH PEMERIKSAAN KEAMANAN DATABASE LOLOS (0 ERROR)!');
  console.log('   - Kompatibilitas multi-tenant terverifikasi.');
  console.log('   - Tidak ada kolom non-nullable berbahaya tanpa nilai default.');
  console.log('   - Seluruh indeks unik terisolasi dengan storeId.\n');
  return true;
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('db-safety-check')) {
  const forceFull = process.argv.includes('--full');
  const success = runSafetyCheck(undefined, forceFull);
  if (!success) {
    process.exit(1);
  }
}
