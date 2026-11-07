/** @type {import('next').NextConfig} */
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');

const nextConfig = {
  // Đường dự phòng khi trình duyệt không gọi thẳng được Supabase (xem actor-auth.ts)
  async rewrites() {
    return SUPABASE_URL.startsWith('https://') ? [{ source: '/api/sb/auth/v1/:path*', destination: `${SUPABASE_URL}/auth/v1/:path*` }] : [];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      }
    ],
  },
};

export default nextConfig;
