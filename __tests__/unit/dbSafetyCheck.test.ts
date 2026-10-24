import {
  parsePrismaSchema,
  validateSchemaDiff,
  validateFullSchema,
} from '../../scripts/db-safety-check';
import {
  executeTenantPatch,
  TenantPatchDefinition,
} from '../../scripts/run-data-patch';

describe('Prisma Multi-Tenant Database Safety Checker', () => {
  describe('parsePrismaSchema', () => {
    it('correctly parses model names, fields, attributes, and unique constraints', () => {
      const sampleSchema = `
        model Product {
          id        String   @id @default(cuid())
          storeId   String
          name      String
          price     Float    @default(0)
          tags      String[]
          bio       String?  @db.Text
          createdAt DateTime @default(now())

          @@unique([storeId, name])
          @@map("products")
        }
      `;

      const models = parsePrismaSchema(sampleSchema);
      expect(models).toHaveLength(1);

      const product = models[0];
      expect(product.name).toBe('Product');
      expect(product.fields).toHaveLength(7);

      const priceField = product.fields.find((f) => f.name === 'price');
      expect(priceField).toBeDefined();
      expect(priceField?.type).toBe('Float');
      expect(priceField?.isOptional).toBe(false);
      expect(priceField?.attributes).toContain('@default(0)');

      const bioField = product.fields.find((f) => f.name === 'bio');
      expect(bioField?.isOptional).toBe(true);

      const tagsField = product.fields.find((f) => f.name === 'tags');
      expect(tagsField?.isArray).toBe(true);

      expect(product.uniqueBlocks).toEqual([['storeId', 'name']]);
    });
  });

  describe('validateSchemaDiff (Anti-Destructive & Schema Drift Protection)', () => {
    it('blocks newly added non-nullable scalar field without @default value', () => {
      const gitDiff = `
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -150,6 +150,7 @@ model Product {
   id        String  @id @default(cuid())
+  isVipOnly Boolean
   name      String
      `;

      const result = validateSchemaDiff(gitDiff);
      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('NEW_NON_NULLABLE_FIELD_WITHOUT_DEFAULT');
      expect(result.errors[0].field).toBe('isVipOnly');
    });

    it('allows newly added non-nullable field when it has @default(...)', () => {
      const gitDiff = `
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -150,6 +150,7 @@ model Product {
   id        String  @id @default(cuid())
+  isVipOnly Boolean @default(false)
   name      String
      `;

      const result = validateSchemaDiff(gitDiff);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('allows newly added optional field (ending with ?)', () => {
      const gitDiff = `
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -150,6 +150,7 @@ model Product {
   id        String  @id @default(cuid())
+  vipCode   String?
   name      String
      `;

      const result = validateSchemaDiff(gitDiff);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('blocks newly added unique constraint on tenant model lacking storeId', () => {
      const gitDiff = `
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -150,6 +150,7 @@ model Product {
   slug      String
+  @@unique([slug])
      `;

      const result = validateSchemaDiff(gitDiff);
      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('MULTI_TENANT_UNIQUE_CONSTRAINT_MISSING_STORE_ID');
    });

    it('allows newly added unique constraint when storeId is included', () => {
      const gitDiff = `
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -150,6 +150,7 @@ model Product {
   slug      String
+  @@unique([storeId, slug])
      `;

      const result = validateSchemaDiff(gitDiff);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects destructive model deletion (DROP TABLE risk)', () => {
      const gitDiff = `
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -150,6 +150,0 @@
-model OldCustomerTable {
-  id String @id
-}
      `;

      const result = validateSchemaDiff(gitDiff);
      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('DESTRUCTIVE_MODEL_DROP');
    });

    it('warns when a column is removed (DROP COLUMN risk)', () => {
      const gitDiff = `
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -150,7 +150,6 @@ model Product {
-  oldDiscountPrice Float?
   name             String
      `;

      const result = validateSchemaDiff(gitDiff);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].rule).toBe('DESTRUCTIVE_FIELD_DROP');
      expect(result.warnings[0].field).toBe('oldDiscountPrice');
    });
  });

  describe('validateFullSchema (Baseline Multi-Tenant Rules)', () => {
    it('flags tenant models with unconstrained @@unique indexes on slug/code', () => {
      const badSchema = `
        model Category {
          id      String @id @default(cuid())
          storeId String
          slug    String

          @@unique([slug])
        }
      `;

      const result = validateFullSchema(badSchema);
      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('MULTI_TENANT_UNIQUE_CONSTRAINT_MISSING_STORE_ID');
    });

    it('passes when tenant models properly scope @@unique with storeId', () => {
      const goodSchema = `
        model Category {
          id      String @id @default(cuid())
          storeId String
          slug    String

          @@unique([storeId, slug])
        }
      `;

      const result = validateFullSchema(goodSchema);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('Tenant Data Patch Framework (scripts/run-data-patch.ts)', () => {
  it('iterates through stores, accumulates updates, and respects dry-run mode', async () => {
    const mockStores = [
      { id: 'store-1', name: 'Toko Satu', domain: 'tokosatu.com' },
      { id: 'store-2', name: 'Toko Dua', domain: 'tokodua.com' },
    ];

    const mockPrisma = {
      store: {
        findMany: jest.fn().mockResolvedValue(mockStores),
      },
    } as any;

    const testPatch: TenantPatchDefinition = {
      id: 'test-patch-001',
      name: 'Test Patch',
      description: 'Testing patch runner execution',
      runForStore: jest.fn().mockImplementation(async (_prisma, store, isDryRun) => {
        if (store.id === 'store-1') {
          return { updated: 5, skipped: 0 };
        }
        return { updated: 0, skipped: 2 };
      }),
    };

    const summary = await executeTenantPatch(testPatch, {
      prismaClient: mockPrisma,
      isDryRun: true,
    });

    expect(summary.totalStores).toBe(2);
    expect(summary.successStores).toBe(2);
    expect(summary.failedStores).toBe(0);
    expect(summary.totalUpdated).toBe(5);
    expect(summary.totalSkipped).toBe(2);
    expect(summary.isDryRun).toBe(true);
    expect(testPatch.runForStore).toHaveBeenCalledTimes(2);
  });

  it('handles and isolates individual store errors without aborting entire process', async () => {
    const mockStores = [
      { id: 'store-fail', name: 'Toko Error', domain: 'tokoerror.com' },
      { id: 'store-ok', name: 'Toko Sukses', domain: 'tokosukses.com' },
    ];

    const mockPrisma = {
      store: {
        findMany: jest.fn().mockResolvedValue(mockStores),
      },
    } as any;

    const testPatch: TenantPatchDefinition = {
      id: 'test-patch-faulty',
      name: 'Faulty Patch',
      description: 'Testing fault tolerance per store',
      runForStore: jest.fn().mockImplementation(async (_prisma, store) => {
        if (store.id === 'store-fail') {
          throw new Error('Database deadlock on store-fail');
        }
        return { updated: 3, skipped: 1 };
      }),
    };

    const summary = await executeTenantPatch(testPatch, {
      prismaClient: mockPrisma,
    });

    expect(summary.totalStores).toBe(2);
    expect(summary.successStores).toBe(1);
    expect(summary.failedStores).toBe(1);
    expect(summary.totalUpdated).toBe(3);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0].storeId).toBe('store-fail');
    expect(summary.errors[0].error).toContain('deadlock');
  });
});
