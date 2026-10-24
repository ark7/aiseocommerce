'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AdminAiDrawer from '@/components/AdminAiDrawer';
import { hasPermission, canAccessPath, PermissionKey } from '@/lib/rbac';

interface User {
  id: string;
  storeId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  title?: string | null;
  permissions?: string[];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }
        
        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        
        const data = await response.json();
        if (data.user && (data.user.role === 'ADMIN' || data.user.role === 'STAFF')) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const allNavigation = [
    { name: 'Dashboard', href: '/admin', icon: 'HomeIcon', permission: 'dashboard' as PermissionKey },
    { name: 'Produk', href: '/admin/products', icon: 'PackageIcon', permission: 'products' as PermissionKey },
    { name: 'Kategori', href: '/admin/categories', icon: 'FolderIcon', permission: 'categories' as PermissionKey },
    { name: 'CMS & Konten', href: '/admin/cms', icon: 'TemplateIcon', permission: 'cms' as PermissionKey },
    { name: 'Artikel', href: '/admin/articles', icon: 'DocumentTextIcon', permission: 'articles' as PermissionKey },
    { name: 'Pesanan', href: '/admin/orders', icon: 'ShoppingBagIcon', permission: 'orders' as PermissionKey },
    { name: 'Pelanggan', href: '/admin/customers', icon: 'UsersIcon', permission: 'customers' as PermissionKey },
    { name: 'Keuangan', href: '/admin/finance', icon: 'CreditCardIcon', permission: 'finance' as PermissionKey },
    { name: 'Promo', href: '/admin/promo', icon: 'TagIcon', permission: 'promo' as PermissionKey },
    { name: 'Laporan & Analitik', href: '/admin/analytics', icon: 'ChartIcon', permission: 'analytics' as PermissionKey },
    { name: 'Pengaturan', href: '/admin/settings', icon: 'SettingsIcon', permission: 'settings' as PermissionKey },
    { name: 'Manajemen Staf', href: '/admin/staff', icon: 'UserGroupIcon', permission: 'staff' as PermissionKey },
  ];

  const SETTINGS_SUBNAV = [
    { id: 'general', name: 'Identitas & Kontak', icon: '🏢' },
    { id: 'hero', name: 'Hero Section', icon: '🖼️' },
    { id: 'theme', name: 'Tema & Font', icon: '🎨' },
    { id: 'integrations', name: 'Pixel & Keamanan', icon: '🛡️' },
    { id: 'legal', name: 'Legal & Cookie', icon: '📄' },
    { id: 'ai', name: 'AI Assistant', icon: '✨' },
    { id: 'notifications', name: 'Notifikasi (WA/TG)', icon: '📲' },
  ];

  // Filter navigation items based on user role and permissions
  const visibleNavigation = allNavigation.filter((item) => {
    if (user.role === 'ADMIN') return true;
    return hasPermission(user, item.permission);
  });

  // Evaluate whether current page path is permitted for the logged-in user
  const isPageAuthorized = canAccessPath(user, pathname);

  const Icons = {
    HomeIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    PackageIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    FolderIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    TemplateIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    DocumentTextIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    ShoppingBagIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    UsersIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    CreditCardIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    SettingsIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    ChartIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M8 17V9m4 8V5m4 12v-6" />
      </svg>
    ),
    TagIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 10V5a2 2 0 012-2h2z" />
      </svg>
    ),
    UserGroupIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    ChevronLeftIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    ),
    ChevronRightIcon: () => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    ),
  };

  const IconComponent = Icons as any;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-md transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-xl font-semibold text-gray-800">Admin Panel</span>
          </Link>
        </div>
        
        <nav className="flex flex-col p-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <ul className="space-y-1.5">
            {visibleNavigation.map((item) => {
              const Icon = IconComponent[item.icon];
              const isSettings = item.href === '/admin/settings';
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${isActive ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <Icon />
                    <span className="flex-1">{item.name}</span>
                    {isSettings && (
                      <span className="text-xs text-gray-400">
                        {pathname.startsWith('/admin/settings') ? '▾' : '▸'}
                      </span>
                    )}
                  </Link>

                  {/* Expand sub-menus when on settings page */}
                  {isSettings && pathname.startsWith('/admin/settings') && (
                    <ul className="mt-1 pl-6 pr-1 space-y-1 border-l-2 border-indigo-100 ml-4 py-1">
                      {SETTINGS_SUBNAV.map((sub) => (
                        <li key={sub.id}>
                          <Link
                            href={`/admin/settings?tab=${sub.id}`}
                            className="flex items-center space-x-2 px-2 py-1 rounded-md text-xs text-gray-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
                          >
                            <span>{sub.icon}</span>
                            <span className="truncate">{sub.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
              <span>{user.firstName?.[0] || 'U'}{user.lastName?.[0] || ''}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-800 text-sm truncate">{user.firstName} {user.lastName}</div>
              <div className="flex items-center space-x-1.5">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {user.role === 'ADMIN' ? 'Owner / Admin' : (user.title || 'Staf')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2.5 w-full px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 ml-0 md:ml-64">
        {/* Header */}
        <header className="fixed top-0 right-0 left-0 md:left-64 z-40 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition shadow-xs"
                title="Buka etalase toko di tab baru"
              >
                <span>🏪</span>
                <span className="hidden sm:inline">Lihat Toko</span>
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
              <span className="text-xs text-gray-500 hidden sm:inline-block">
                Toko: <span className="font-semibold text-gray-700">{user.email}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="pt-16 px-4 pb-4 md:px-6 md:pb-6">
          {isPageAuthorized ? (
            children
          ) : (
            <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-11a9 9 0 100 18 9 9 0 000-18zm0 5a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Akses Halaman Dibatasi</h2>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                Akun staf Anda (<span className="font-semibold text-gray-800">{user.email}</span>) dengan peran/jabatan{' '}
                <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded text-xs">{user.title || 'Staf Toko'}</span>{' '}
                tidak memiliki hak akses delegasi untuk membuka modul halaman{' '}
                <code className="bg-gray-100 px-2 py-1 rounded text-red-600 text-xs font-mono">{pathname}</code>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-xs text-amber-800 text-left">
                <p className="font-semibold mb-1 flex items-center space-x-1.5">
                  <span>💡</span>
                  <span>Butuh akses ke halaman ini?</span>
                </p>
                <p>Silakan hubungi Pemilik Toko / Administrator untuk menambahkan hak akses menu ini pada akun Anda melalui halaman <strong>Manajemen Staf</strong>.</p>
              </div>
              <div className="flex justify-center items-center space-x-3">
                {visibleNavigation[0] && (
                  <Link
                    href={visibleNavigation[0].href}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
                  >
                    Kembali ke {visibleNavigation[0].name}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Ganti Akun
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Slide-Over AI Copilot Assistant Drawer */}
      <AdminAiDrawer />
    </div>
  );
}
