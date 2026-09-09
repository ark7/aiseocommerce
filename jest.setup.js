// Jest setup file
// This runs before each test file

import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Mock Prisma Client
global.prisma = mockDeep();

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Reset mocks before each test
beforeEach(() => {
  mockReset(global.prisma);
});

// Cleanup after tests
afterAll(() => {
  jest.clearAllMocks();
});
