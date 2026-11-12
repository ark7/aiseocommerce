'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import StoreHeader from '@/components/StoreHeader'
import StoreFooter from '@/components/StoreFooter'
import { readStoredAttribution } from '@/lib/attribution'
import { trackFunnelEvent } from '@/lib/funnelEvents'
import { z } from 'zod'
import { updateCartQuantity, removeFromCart, clearCart, dispatchCartUpdated, type CartItemPriceTier } from '@/lib/cart'
import { formatTierRangeLabel, resolveBatchUnitPrice } from '@/lib/pricing'
import AddressLocationSelector, { SelectedLocationData } from '@/components/AddressLocationSelector'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
  isPreOrder?: boolean
  productType?: 'PHYSICAL' | 'DIGITAL' | 'EVENT'
  variantId?: string
  variation?: string
  hasBatchPricing?: boolean
  minOrderQty?: number
  baseUnitPrice?: number
  priceTiers?: CartItemPriceTier[]
}

interface ProblematicProduct {
  productId: string
  productName: string
  reason: 'NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'UNPUBLISHED' | 'STORE_MISMATCH' | 'MIN_ORDER_QTY'
  availableStock?: number
}

// Prisma ids are cuids, and seeded rows use plain strings like demo-prod-001.
// Validating as uuid rejected every real cart item.
const CartItemPriceTierSchema = z.object({
  minQty: z.number().int().min(1),
  maxQty: z.number().int().min(1).nullable(),
  unitPrice: z.number().nonnegative(),
})

const CartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  imageUrl: z.string().min(1).optional(),
  isPreOrder: z.boolean().optional(),
  productType: z.enum(['PHYSICAL', 'DIGITAL', 'EVENT']).optional(),
  storeDomain: z.string().optional(),
  variantId: z.string().optional(),
  variation: z.string().optional(),
  hasBatchPricing: z.boolean().optional(),
  minOrderQty: z.number().int().min(1).optional(),
  baseUnitPrice: z.number().nonnegative().optional(),
  priceTiers: z.array(CartItemPriceTierSchema).optional(),
})

interface ShippingConfigProps {
  originCity?: string | null
  flatRateInner?: number | null
  flatRateOuter?: number | null
  freeThreshold?: number | null
  biteshipEnabled?: boolean | null
  originPostalCode?: string | null
}

export interface CourierOption {
  courierCode: string
  courierName: string
  serviceCode: string
  serviceName: string
  description?: string
  cost: number
  etd: string
  type?: string
  isFreeShipping?: boolean
}

interface CartPageProps {
  storeId: string
  storeDomain: string
  shippingConfig?: ShippingConfigProps
}

const CartPage = ({ storeId, storeDomain, shippingConfig }: CartPageProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'MANUAL' | 'MIDTRANS'>('MANUAL')
  const [shippingZone, setShippingZone] = useState<'INNER' | 'OUTER'>('INNER')
  const [shippingAddress, setShippingAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [courierRates, setCourierRates] = useState<CourierOption[]>([])
  const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>(null)
  const [loadingRates, setLoadingRates] = useState(false)
  const [voucherInput, setVoucherInput] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(null)
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null)
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false)
  const [problematicProduct, setProblematicProduct] = useState<ProblematicProduct | null>(null)

  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem('token')))
  }, [])

  useEffect(() => {
    if (storeDomain) {
      const storedCart = localStorage.getItem(`cart_${storeDomain}`)
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart)
          const validatedItems = z.array(CartItemSchema).parse(parsedCart)
          setCartItems(validatedItems)
        } catch (err) {
          setError('Failed to load cart')
        }
      }
    }
  }, [storeDomain])

  /**
   * The discount is a number the server computed for one specific subtotal.
   * Once the subtotal moves that number is stale, and showing it would promise
   * a price the checkout will not honour. Clearing it costs one click; keeping
   * it costs the customer the difference.
   */
  const forgetVoucher = () => {
    if (!appliedVoucher) return

    setAppliedVoucher(null)
    setVoucherMessage('Keranjang berubah — pakai ulang voucher untuk melihat potongan barunya.')
  }

  const updateQuantity = (productId: string, newQuantity: number, variantId?: string) => {
    if (newQuantity < 1) return

    const { cart } = updateCartQuantity(storeDomain, productId, newQuantity, variantId)
    setCartItems(cart)
    forgetVoucher()
    if (problematicProduct?.productId === productId) {
      setProblematicProduct(null)
      setError(null)
    }
  }

  const removeItem = (productId: string, variantId?: string) => {
    const { cart } = removeFromCart(storeDomain, productId, variantId)
    setCartItems(cart)
    forgetVoucher()
    if (problematicProduct?.productId === productId) {
      setProblematicProduct(null)
      setError(null)
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const hasPhysicalItems = cartItems.some(
    (item) => !item.productType || item.productType === 'PHYSICAL'
  )

  const subtotal = calculateTotal()
  const freeThreshold = shippingConfig?.freeThreshold
  const isFreeShippingQualified = Boolean(
    hasPhysicalItems && freeThreshold && freeThreshold > 0 && subtotal >= freeThreshold
  )

  const calculateShippingFee = () => {
    if (!hasPhysicalItems) return 0
    if (isFreeShippingQualified) return 0
    if (selectedCourier) {
      return Math.max(0, selectedCourier.cost)
    }
    if (shippingZone === 'INNER') {
      return Math.max(0, shippingConfig?.flatRateInner ?? 0)
    }
    return Math.max(0, shippingConfig?.flatRateOuter ?? 0)
  }

  const fetchShippingRates = async (destPostal?: string) => {
    if (!hasPhysicalItems || cartItems.length === 0) return
    setLoadingRates(true)
    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          destinationPostalCode: destPostal || postalCode || undefined,
          destinationAddress: shippingAddress,
          items: cartItems.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            productType: i.productType || 'PHYSICAL',
          })),
        }),
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.rates)) {
        setCourierRates(data.rates)
        if (data.rates.length > 0) {
          setSelectedCourier((prev) => prev || data.rates[0])
        }
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setLoadingRates(false)
    }
  }

  const shippingCost = calculateShippingFee()
  const calculatePayable = () => Math.max(0, subtotal - (appliedVoucher?.discount ?? 0)) + shippingCost

  /**
   * The voucher rules are per-customer (a claim belongs to a person), so the
   * check has to be made as the signed-in user or every code would come back
   * "klaim dulu" even for the customer who already claimed it.
   */
  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  /**
   * Asks the server what the code is worth on this cart. The rules live in
   * `lib/voucher` and are enforced again at order time — this call only decides
   * what number to show, never what to charge.
   */
  const applyVoucher = async () => {
    const code = voucherInput.trim()
    if (!code) return

    setIsCheckingVoucher(true)
    setVoucherMessage(null)

    try {
      const response = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ storeId, code, subtotal: calculateTotal() }),
      })
      const data = await response.json()

      if (!response.ok) {
        setAppliedVoucher(null)
        setVoucherMessage(data.error || 'Voucher tidak bisa dipakai')
        return
      }

      setAppliedVoucher({ code: data.voucher.code, discount: data.discount })
    } catch {
      setAppliedVoucher(null)
      setVoucherMessage('Gagal memeriksa voucher')
    } finally {
      setIsCheckingVoucher(false)
    }
  }

  const removeVoucher = () => {
    setAppliedVoucher(null)
    setVoucherInput('')
    setVoucherMessage(null)
  }

  const handleCheckout = async () => {
    if (!storeId || !cartItems.length) return

    // An order needs an owner, so checkout is for signed-in customers. Send the
    // visitor to sign in and back to this cart; the cart is in localStorage, so
    // it survives the round trip. The funnel event is deliberately not sent for
    // a visitor who never reaches the form.
    if (!localStorage.getItem('token')) {
      window.location.href = `/login?from=${encodeURIComponent('/cart')}`
      return
    }

    if (hasPhysicalItems && !shippingAddress.trim()) {
      setError('Harap masukkan alamat lengkap pengiriman untuk pengiriman pesanan fisik Anda.')
      return
    }

    for (const item of cartItems) {
      if (item.hasBatchPricing || (item.minOrderQty && item.minOrderQty > 1)) {
        const res = resolveBatchUnitPrice(
          item.baseUnitPrice ?? item.price,
          item.priceTiers,
          item.quantity,
          item.minOrderQty
        )
        if (res.isBelowMinimum) {
          setProblematicProduct({
            productId: item.productId,
            productName: item.variation ? `${item.name} (${item.variation})` : item.name,
            reason: 'MIN_ORDER_QTY',
          })
          setError(
            `Minimal pemesanan untuk "${item.name}${item.variation ? ` (${item.variation})` : ''}" adalah ${res.effectiveMinOrderQty} pcs.`
          )
          return
        }
      }
    }

    // Every line gets its own row, so a product that is carried to checkout and
    // then abandoned is distinguishable from one that never got that far. An
    // order that follows also counts here; the report subtracts nothing.
    for (const item of cartItems) {
      trackFunnelEvent('CHECKOUT_START', { productId: item.productId, storeDomain })
    }

    setIsLoading(true)
    setError(null)

    try {
      // First create order. The store and the customer are validated server-side
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        // The token travels with the order: it is what says who is checking out.
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          storeId,
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            name: item.name,
            variantId: item.variantId,
            variation: item.variation,
          })),
          // First-touch campaign, so an order can be traced back to the ad that
          // paid for the click.
          attribution: readStoredAttribution() ?? undefined,
          voucherCode: appliedVoucher?.code,
          // The prices this cart is showing. The server refuses the order when
          // they no longer match the shelf, instead of charging the difference
          // without telling anyone.
          expectedUnitPrices: Object.fromEntries(
            cartItems.map(item => [
              item.variantId ? `${item.productId}::${item.variantId}` : item.productId,
              item.price,
            ])
          ),
          shippingZone: hasPhysicalItems ? (selectedCourier ? 'INNER' : shippingZone) : undefined,
          shippingAddress: hasPhysicalItems
            ? postalCode
              ? `${shippingAddress.trim()} (Kode Pos: ${postalCode.trim()})`
              : shippingAddress.trim()
            : undefined,
          courierCode: selectedCourier?.courierCode,
          courierService: selectedCourier?.serviceCode,
          courierServiceName: selectedCourier
            ? `${selectedCourier.courierName} ${selectedCourier.serviceName} (${selectedCourier.etd})`
            : undefined,
          courierEtd: selectedCourier?.etd,
          shippingCost: hasPhysicalItems ? shippingCost : 0,
        }),
      })

      if (!orderResponse.ok) {
        const data = await orderResponse.json().catch(() => ({}))

        if (data.code === 'STORE_MISMATCH') {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          setIsLoggedIn(false)
          throw new Error(data.error || 'Sesi akun Anda terdaftar di toko lain. Silakan masuk kembali.')
        }

        if (orderResponse.status === 401) {
          localStorage.removeItem('token')
          setIsLoggedIn(false)
          throw new Error('Sesi Anda telah berakhir. Silakan masuk kembali untuk melanjutkan pesanan.')
        }

        if (data.code === 'PRICE_CHANGED') {
          const changes: { productId: string; actual: number }[] = data.changes ?? []
          const repriced = cartItems.map(item => {
            const change = changes.find(entry => entry.productId === item.productId)
            return change ? { ...item, price: change.actual } : item
          })

          setCartItems(repriced)
          localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(repriced))
          dispatchCartUpdated(storeDomain)
          // The subtotal just moved, so whatever the voucher was worth before
          // is no longer what it is worth now.
          setAppliedVoucher(null)
          throw new Error('Harga beberapa produk berubah. Periksa keranjang, lalu lanjutkan lagi.')
        }

        if (data.code === 'VOUCHER_REJECTED') {
          setAppliedVoucher(null)
          throw new Error(data.error || 'Voucher tidak bisa dipakai')
        }

        if (data.code === 'MIN_ORDER_QTY') {
          setProblematicProduct({
            productId: data.productId,
            productName: data.productName,
            reason: 'MIN_ORDER_QTY',
          })
          throw new Error(data.error || 'Jumlah pesanan di bawah minimal order')
        }

        if (data.code === 'PRODUCT_UNAVAILABLE') {
          setProblematicProduct({
            productId: data.productId,
            productName: data.productName,
            reason: data.reason,
            availableStock: data.availableStock,
          })
          throw new Error(data.error || 'Produk tidak tersedia')
        }

        throw new Error(data.error || 'Gagal membuat pesanan')
      }

      const orderData = await orderResponse.json()
      const orderId = orderData.order.id

      // Create the payment intent with the method the customer picked
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          storeId,
          orderId,
          paymentMethod,
        }),
      })

      if (!checkoutResponse.ok) {
        throw new Error('Gagal memulai pembayaran')
      }

      // Clear cart after successful checkout and notify all listeners
      clearCart(storeDomain)
      setCartItems([])

      // A manual transfer has no gateway to visit - the customer uploads the
      // proof from the order page instead.
      if (paymentMethod === 'MANUAL') {
        window.location.href = `/orders/${orderId}`
        return
      }

      const checkoutData = await checkoutResponse.json()
      window.location.href = checkoutData.paymentGatewayResponse.redirectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader storeDomain={storeDomain} />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Keranjang</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <span className="text-base">⚠️</span>
                  <span>Kendala pada Produk di Keranjang</span>
                </p>
                <p className="text-xs sm:text-sm text-red-700">{error}</p>
              </div>
              {problematicProduct && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {problematicProduct.reason === 'INSUFFICIENT_STOCK' && (problematicProduct.availableStock ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        updateQuantity(problematicProduct.productId, problematicProduct.availableStock!)
                        setProblematicProduct(null)
                        setError(null)
                      }}
                      className="px-3 py-1.5 bg-amber-600 text-white font-medium text-xs rounded-lg hover:bg-amber-700 transition shadow-xs"
                    >
                      Sesuaikan ke {problematicProduct.availableStock} pcs
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      removeItem(problematicProduct.productId)
                      setProblematicProduct(null)
                      setError(null)
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white font-medium text-xs rounded-lg hover:bg-red-700 transition shadow-xs"
                  >
                    Hapus Produk Bermasalah
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800 px-4 py-16 text-center">
            <p className="text-gray-500 dark:text-slate-400 mb-4">Keranjang Anda masih kosong.</p>
            <Link
              href="/"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.some(item => item.productType === 'DIGITAL' || item.productType === 'EVENT') && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2">
                <span>⚡</span>
                <span>
                  <strong>Pengiriman Instan Elektronik:</strong> Produk digital / Tiket seminar otomatis dapat diakses dan diunduh langsung setelah pembayaran Anda lunas (Bebas Ongkir).
                </span>
              </div>
            )}

            {cartItems.map(item => {
              const isProblematic = problematicProduct?.productId === item.productId
              const batchInfo = item.hasBatchPricing
                ? resolveBatchUnitPrice(
                    item.baseUnitPrice ?? item.price,
                    item.priceTiers,
                    item.quantity,
                    item.minOrderQty
                  )
                : null
              const effectiveItemMin = batchInfo
                ? batchInfo.effectiveMinOrderQty
                : Math.max(1, item.minOrderQty ?? 1)
              const activeTierLabel =
                batchInfo?.matchedTier
                  ? formatTierRangeLabel(batchInfo.matchedTier.minQty, batchInfo.matchedTier.maxQty)
                  : null

              return (
                <div
                  key={`${item.productId}::${item.variantId || 'default'}`}
                  className={`bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800 p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 transition-colors ${
                    isProblematic ? 'border-red-400 bg-red-50/30 dark:bg-red-950/20 ring-2 ring-red-200' : ''
                  }`}
                >
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 object-cover rounded mr-4"
                    />
                  )}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
                      {item.variation && (
                        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          🏷️ {item.variation}
                        </span>
                      )}
                      {activeTierLabel && (
                        <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          Grosir: {activeTierLabel}
                        </span>
                      )}
                      {isProblematic && (
                        <span className="bg-red-100 text-red-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-red-200">
                          ⚠️ Perlu Diperbaiki
                        </span>
                      )}
                      {item.productType === 'DIGITAL' && (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-200">
                          💻 File Digital
                        </span>
                      )}
                      {item.productType === 'EVENT' && (
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-purple-200">
                          🎟️ Tiket Event
                        </span>
                      )}
                      {item.isPreOrder && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-300">
                          PO
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-slate-300 text-sm mt-0.5">
                      Rp {item.price.toLocaleString('id-ID')}
                      {item.hasBatchPricing && (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          / pcs • Total: <strong className="text-slate-800 dark:text-slate-100">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</strong>
                        </span>
                      )}
                    </p>
                    {batchInfo?.isBelowMinimum && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                        <span>Minimal order: {effectiveItemMin} pcs</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, effectiveItemMin, item.variantId)}
                          className="underline font-semibold hover:text-rose-900"
                        >
                          Sesuaikan ({effectiveItemMin} pcs)
                        </button>
                      </div>
                    )}
                  </div>
                  <div 
                    data-quantity-stepper
                    className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-700 overflow-hidden shadow-xs transition-colors"
                  >
                    <button
                      onClick={() => updateQuantity(item.productId, Math.max(effectiveItemMin, item.quantity - 1), item.variantId)}
                      aria-label="Kurangi jumlah item"
                      className="px-2.5 py-1 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition disabled:opacity-40"
                      disabled={item.quantity <= effectiveItemMin}
                    >
                      -
                    </button>
                    {item.hasBatchPricing ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        data-quantity-counter
                        aria-label={`Jumlah ${item.name}${item.variation ? ` ${item.variation}` : ''}`}
                        min={effectiveItemMin}
                        value={item.quantity}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10)
                          if (!Number.isNaN(parsed) && parsed >= 1) {
                            updateQuantity(item.productId, parsed, item.variantId)
                          }
                        }}
                        className="w-20 px-2 py-1 border-l border-r border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-semibold text-sm text-center focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                      />
                    ) : (
                      <span 
                        data-quantity-counter
                        className="px-3.5 py-1 border-l border-r border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold text-sm select-none"
                      >
                        {item.quantity}
                      </span>
                    )}
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                      aria-label="Tambah jumlah item"
                      className="px-2.5 py-1 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="ml-4 text-red-500 hover:text-red-700 font-medium text-sm"
                  >
                    Hapus
                  </button>
                </div>
              )
            })}

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
              <div className="flex justify-between text-gray-700 dark:text-slate-200 text-sm sm:text-base">
                <span>Subtotal Produk</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>

              {/* SHIPPING SELECTION (if physical products present) */}
              {hasPhysicalItems && (
                <div className="pt-4 border-t space-y-4">
                  <AddressLocationSelector
                    initialPostalCode={postalCode}
                    initialStreetAddress={shippingAddress}
                    onChange={(loc: SelectedLocationData) => {
                      setPostalCode(loc.postalCode);
                      setShippingAddress(loc.fullFormattedAddress);
                      if (loc.postalCode && loc.postalCode.length === 5) {
                        fetchShippingRates(loc.postalCode);
                      }
                    }}
                  />

                  {/* Manual trigger / status indicator */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {postalCode ? `Wilayah tujuan: ${postalCode}` : 'Silakan tentukan wilayah tujuan di atas.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchShippingRates(postalCode)}
                      disabled={loadingRates || !postalCode}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {loadingRates ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>Menghitung Tarif...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Perbarui Pilihan Kurir</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* COURIER RATES (BITESHIP OR FLAT RATE) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1.5 flex items-center justify-between">
                      <span>Pilihan Ekspedisi & Kurir</span>
                      {shippingConfig?.biteshipEnabled && (
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                          Biteship Live Rates
                        </span>
                      )}
                    </label>

                    {courierRates.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {courierRates.map((courier) => {
                          const isSelected =
                            selectedCourier?.courierCode === courier.courierCode &&
                            selectedCourier?.serviceCode === courier.serviceCode;
                          return (
                            <label
                              key={`${courier.courierCode}_${courier.serviceCode}`}
                              className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="courierSelection"
                                  checked={isSelected}
                                  onChange={() => setSelectedCourier(courier)}
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-gray-900">{courier.courierName}</span>
                                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                                      {courier.serviceName}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Estimasi tiba: <strong>{courier.etd}</strong>
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-right shrink-0">
                                {isFreeShippingQualified ? (
                                  <span className="text-emerald-600">GRATIS</span>
                                ) : (
                                  <span className="text-indigo-600">Rp {courier.cost.toLocaleString('id-ID')}</span>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      /* Flat Rate Fallback */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={`flex flex-col p-3.5 border rounded-xl cursor-pointer transition ${
                            shippingZone === 'INNER'
                              ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                              <input
                                type="radio"
                                name="shippingZone"
                                value="INNER"
                                checked={shippingZone === 'INNER' && !selectedCourier}
                                onChange={() => {
                                  setSelectedCourier(null);
                                  setShippingZone('INNER');
                                }}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Dalam Kota</span>
                            </span>
                            <span className="text-sm font-bold">
                              {isFreeShippingQualified ? (
                                <span className="text-emerald-600">GRATIS</span>
                              ) : (
                                <span className="text-gray-900">
                                  Rp {(shippingConfig?.flatRateInner ?? 0).toLocaleString('id-ID')}
                                </span>
                              )}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 mt-1 pl-6">
                            Area pengiriman lokal {shippingConfig?.originCity || 'toko'}
                          </span>
                        </label>

                        <label
                          className={`flex flex-col p-3.5 border rounded-xl cursor-pointer transition ${
                            shippingZone === 'OUTER'
                              ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                              <input
                                type="radio"
                                name="shippingZone"
                                value="OUTER"
                                checked={shippingZone === 'OUTER' && !selectedCourier}
                                onChange={() => {
                                  setSelectedCourier(null);
                                  setShippingZone('OUTER');
                                }}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Luar Kota</span>
                            </span>
                            <span className="text-sm font-bold">
                              {isFreeShippingQualified ? (
                                <span className="text-emerald-600">GRATIS</span>
                              ) : (
                                <span className="text-gray-900">
                                  Rp {(shippingConfig?.flatRateOuter ?? 0).toLocaleString('id-ID')}
                                </span>
                              )}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 mt-1 pl-6">
                            Antar kota / luar daerah toko
                          </span>
                        </label>
                      </div>
                    )}

                    {isFreeShippingQualified && (
                      <div className="mt-2.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                        <span>🎉</span>
                        <span>
                          Selamat! Total belanja Anda memenuhi syarat <strong>Bebas Ongkir</strong> (Minimal Rp {(shippingConfig?.freeThreshold ?? 0).toLocaleString('id-ID')}).
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="voucherCode">
                  Kode Voucher
                </label>

                {appliedVoucher ? (
                  <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-green-800">
                      <span className="font-semibold">{appliedVoucher.code}</span> — potongan Rp{' '}
                      {appliedVoucher.discount.toLocaleString('id-ID')}
                    </span>
                    <button
                      type="button"
                      onClick={removeVoucher}
                      className="text-sm text-green-700 hover:underline shrink-0"
                    >
                      Batalkan
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="voucherCode"
                      value={voucherInput}
                      onChange={(event) => setVoucherInput(event.target.value)}
                      placeholder="Contoh: HEMAT10"
                      autoComplete="off"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg uppercase"
                    />
                    <button
                      type="button"
                      onClick={applyVoucher}
                      disabled={isCheckingVoucher || !voucherInput.trim()}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {isCheckingVoucher ? 'Memeriksa...' : 'Pakai'}
                    </button>
                  </div>
                )}

                {voucherMessage && <p className="mt-2 text-sm text-red-600">{voucherMessage}</p>}
              </div>

              {/* RINGKASAN BIAYA & TOTAL */}
              <div className="pt-4 border-t space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Subtotal Produk</span>
                  <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>

                {appliedVoucher && (
                  <div className="flex justify-between text-green-700">
                    <span>Potongan voucher</span>
                    <span>- Rp {appliedVoucher.discount.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {hasPhysicalItems && (
                  <div className="flex justify-between">
                    <span>
                      Ongkos Kirim{' '}
                      {selectedCourier
                        ? `(${selectedCourier.courierName} ${selectedCourier.serviceName})`
                        : `(${shippingZone === 'INNER' ? 'Dalam Kota' : 'Luar Kota'})`}
                    </span>
                    <span className="font-medium">
                      {shippingCost === 0 ? (
                        <span className="text-emerald-600 font-semibold">GRATIS</span>
                      ) : (
                        `Rp ${shippingCost.toLocaleString('id-ID')}`
                      )}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t flex justify-between font-bold text-lg text-gray-900">
                  <span>Total Pembayaran</span>
                  <span className="text-indigo-600">Rp {calculatePayable().toLocaleString('id-ID')}</span>
                </div>
              </div>

              <fieldset className="mt-4 pt-4 border-t">
                <legend className="text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</legend>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:border-indigo-300">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="MANUAL"
                      checked={paymentMethod === 'MANUAL'}
                      onChange={() => setPaymentMethod('MANUAL')}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">Transfer Manual</span>
                      <span className="block text-xs text-gray-500">
                        Transfer ke rekening toko, lalu unggah bukti bayar. Dikonfirmasi admin.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:border-indigo-300">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="MIDTRANS"
                      checked={paymentMethod === 'MIDTRANS'}
                      onChange={() => setPaymentMethod('MIDTRANS')}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">Midtrans</span>
                      <span className="block text-xs text-gray-500">
                        Bayar online lewat halaman payment gateway.
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>

              {!isLoggedIn && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-base shrink-0">🔒</span>
                    <span>
                      <strong>Belum masuk akun:</strong> Masuk atau daftar terlebih dahulu agar pesanan dapat diproses ke akun Anda.
                    </span>
                  </div>
                  <Link
                    href={`/login?from=${encodeURIComponent('/cart')}`}
                    className="px-3.5 py-1.5 bg-indigo-600 text-white font-semibold text-xs rounded-lg hover:bg-indigo-700 transition shrink-0 shadow-xs"
                  >
                    Masuk Sekarang
                  </Link>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Memproses Pesanan...</span>
                  </>
                ) : !isLoggedIn ? (
                  'Masuk Akun & Lanjut ke Pembayaran'
                ) : (
                  'Lanjut ke Pembayaran'
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      <StoreFooter />
    </div>
  )
}

export default CartPage