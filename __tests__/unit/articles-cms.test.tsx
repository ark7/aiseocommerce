/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ArticleForm } from '@/components/ArticleForm';
import { ArticlePreview } from '@/components/ArticlePreview';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '/',
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Article CMS Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock product list for ArticleForm
    (fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/products') {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            products: [{ id: 'p1', name: 'Test Product 1' }, { id: 'p2', name: 'Test Product 2' }]
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  describe('ArticlePreview', () => {
    const mockArticle = {
      id: '1',
      title: 'SEO Guide 2026',
      content: 'This is a comprehensive guide to AI-SEO.',
      imageUrl: 'https://example.com/image.jpg',
      products: [{ id: 'p1', name: 'SEO Tool A' }, { id: 'p2', name: 'SEO Tool B' }],
    };

    it('renders article content and related products correctly', () => {
      render(<ArticlePreview article={mockArticle} />);

      expect(screen.getByText('SEO Guide 2026')).toBeInTheDocument();
      expect(screen.getByText('This is a comprehensive guide to AI-SEO.')).toBeInTheDocument();
      expect(screen.getByText('SEO Tool A')).toBeInTheDocument();
      expect(screen.getByText('SEO Tool B')).toBeInTheDocument();

      const img = screen.getByAltText('SEO Guide 2026');
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });
  });

  describe('ArticleForm SEO Analyzer', () => {
    it('calculates keyword counts and SEO score in real-time', async () => {
      const onSuccess = jest.fn();
      render(<ArticleForm onSuccess={onSuccess} />);

      // Find keyword input and enter keywords
      const keywordInput = screen.getByLabelText(/Target Keywords/i);
      fireEvent.change(keywordInput, { target: { value: 'sepatu, murah' } });

      // Enter content containing the keywords
      const contentInput = screen.getByLabelText(/Content/i);
      fireEvent.change(contentInput, { target: { value: 'Beli sepatu berkualitas dengan harga murah di sini.' } });

      // Enter title containing one of the keywords
      const titleInput = screen.getByLabelText(/^Title$/i);
      fireEvent.change(titleInput, { target: { value: 'Sepatu Murah Berkualitas' } });

      // Check if keywords are counted correctly
      // 'sepatu' appears 2 times (title + content), 'murah' appears 2 times
      await waitFor(() => {
        expect(screen.getByText(/sepatu: 2/i)).toBeInTheDocument();
        expect(screen.getByText(/murah: 2/i)).toBeInTheDocument();
      });

      // Score should be calculated (title match + content present)
      expect(screen.getByText(/Score:/i)).toBeInTheDocument();
    });

    it('submits the form and calls onSuccess', async () => {
      const onSuccess = jest.fn();
      render(<ArticleForm onSuccess={onSuccess} />);

      fireEvent.change(screen.getByLabelText(/^Title$/i), { target: { value: 'Test Title' } });
      fireEvent.change(screen.getByLabelText(/Slug/i), { target: { value: 'test-slug' } });
      fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: 'Test content' } });

      fireEvent.click(screen.getByText(/Save Article/i));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });
});
