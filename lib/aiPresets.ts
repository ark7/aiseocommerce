// =============================================================================
// AI PRODUCT SALES IMAGE GENERATOR PRESETS & TYPES
// Shared client-safe presets for AI Studio UI and AI Service engine
// =============================================================================

export type SalesImageStyle =
  | 'studio-clean'
  | 'wooden-podium'
  | 'luxury-marble'
  | 'nature-lifestyle'
  | 'modern-pastel'
  | 'cyber-neon'
  | 'custom';

export interface SalesImageStylePreset {
  id: SalesImageStyle;
  name: string;
  badge: string;
  icon: string;
  description: string;
  recommendedCategory: string;
  promptTemplate: string;
}

export const SALES_IMAGE_PRESETS: SalesImageStylePreset[] = [
  {
    id: 'studio-clean',
    name: 'Studio White Minimalist',
    badge: 'Katalog Standar',
    icon: '⚪',
    description: 'Latar studio putih bersih profesional, pencahayaan softbox merata dengan bayangan lantai halus.',
    recommendedCategory: 'Elektronik, Fashion, Sepatu, Aksesoris',
    promptTemplate: 'Professional e-commerce commercial product photography, placed on a pristine off-white studio surface, clean studio background, bright softbox commercial lighting, soft natural contact shadow underneath, razor-sharp focus on the product, 8k resolution, minimalist commercial advertisement.',
  },
  {
    id: 'wooden-podium',
    name: 'Aesthetic Wooden Podium',
    badge: 'Paling Populer',
    icon: '🪵',
    description: 'Panggung podium kayu oak halus, pencahayaan matahari pagi hangat dengan bayangan dedaunan organik.',
    recommendedCategory: 'Skincare, Kosmetik, Herbal, Makanan & Minuman',
    promptTemplate: 'Modern aesthetic commercial product display, the product elegantly placed on a smooth rounded natural oak wooden podium pedestal, warm gentle morning sunlight with soft organic plant shadows on a neutral beige textured wall backdrop, boutique e-commerce aesthetic, hyper-realistic 8k.',
  },
  {
    id: 'luxury-marble',
    name: 'Luxury Marble & Gold',
    badge: 'Premium',
    icon: '🏛️',
    description: 'Permukaan marmer Carrara mewah dengan urat emas, pencahayaan ambient elegan dan pantulan air halus.',
    recommendedCategory: 'Parfum, Jam Tangan, Perhiasan, Busana Mewah',
    promptTemplate: 'High-end luxury commercial advertisement, the product resting on polished black or white Carrara marble surface with delicate gold veining, dramatic ambient golden rim lighting, elegant glossy reflections, dark moody blurred boutique background, ultra-luxurious 8k commercial photography.',
  },
  {
    id: 'nature-lifestyle',
    name: 'Nature Outdoor Lifestyle',
    badge: 'Segar & Organik',
    icon: '🌿',
    description: 'Latar batu alam alami dikelilingi dedaunan monstera segar, cahaya outdoor lembut dengan efek bokeh.',
    recommendedCategory: 'Kopi, Madu, Kuliner Nusantara, Perlengkapan Outdoor',
    promptTemplate: 'Fresh outdoor organic commercial photography, the product placed on a weathered natural river stone slab surrounded by dewy tropical monstera leaves and moss, soft natural diffused daylight, beautiful soft bokeh garden background, refreshing authentic eco-friendly commercial aesthetic.',
  },
  {
    id: 'modern-pastel',
    name: 'Modern Pastel Pop',
    badge: 'Trendy / IG',
    icon: '🌸',
    description: 'Latar pastel peach dan sage mint ceria dengan bentuk geometris modern, pencahayaan high-key tajam.',
    recommendedCategory: 'Fashion Remaja, Snack, Mainan, Aksesoris Unik',
    promptTemplate: 'Trendy aesthetic commercial product photo, soft pastel monochromatic background in warm peach and sage mint, playful architectural geometric pedestals, bright crisp high-key commercial lighting, Instagram and TikTok ad style, vibrant clean commercial photography.',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon Tech',
    badge: 'Futuristik',
    icon: '⚡',
    description: 'Latar gelap akrilik dengan pencahayaan neon cyan & magenta yang dramatis, pantulan teknologi tinggi.',
    recommendedCategory: 'Gaming, Gadget, Smartwatch, Headphone, Audio',
    promptTemplate: 'Futuristic high-tech commercial advertising photography, sleek dark reflective acrylic surface, dramatic dual-tone cyan and magenta neon rim lighting, subtle volumetric mist, cinematic technology mood, sharp product silhouette, premium electronics commercial photo.',
  },
  {
    id: 'custom',
    name: 'Kustom Prompt Pilihan Anda',
    badge: 'Fleksibel',
    icon: '✍️',
    description: 'Tentukan suasana panggung dan pencahayaan sendiri sesuai kreativitas dan konsep campaign Anda.',
    recommendedCategory: 'Campaign Khusus, Hari Raya, Kolaborasi Brand',
    promptTemplate: 'Commercial e-commerce product photograph, razor-sharp focus on the product, professional commercial advertising composition, realistic lighting and shadows, 8k resolution.',
  },
];
