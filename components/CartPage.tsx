'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import StoreHeader from '@/components/StoreHeader'
import { readStoredAttribution } from '@/lib/attribution'
import { trackFunnelEvent } from '@/lib/funnelEvents'
import { z } from 'zod'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

// Prisma ids are cuids, and seeded rows use plain strings like demo-prod-001.
// Validating as uuid rejected every real cart item.
const CartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
})

interface CartPageProps {
  storeId: string
  storeDomain: string
}

const CartPage = ({ storeId, storeDomain }: CartPageProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'MANUAL' | 'MIDTRANS'>('MANUAL')
  const [voucherInput, setVoucherInput] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(null)
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null)
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false)

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

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    const updatedItems = cartItems.map(item =>
      item.productId === productId ? { ...item, quantity: newQuantity } : item
    )

    setCartItems(updatedItems)
    localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(updatedItems))
    forgetVoucher()
  }

  const removeItem = (productId: string) => {
    const updatedItems = cartItems.filter(item => item.productId !== productId)
    setCartItems(updatedItems)
    localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(updatedItems))
    forgetVoucher()
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const calculatePayable = () => Math.max(0, calculateTotal() - (appliedVoucher?.discount ?? 0))

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
      window.location.href = `/login?from=${encodeURIComponent(`/${storeDomain}/cart`)}`
      return
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
      // First create order. The store and the customer are taken from the token
      // server-side, so neither is sent from here.
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        // The token travels with the order: it is what says who is checking out.
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          // First-touch campaign, so an order can be traced back to the ad that
          // paid for the click.
          attribution: readStoredAttribution() ?? undefined,
          voucherCode: appliedVoucher?.code,
          // The prices this cart is showing. The server refuses the order when
          // they no longer match the shelf, instead of charging the difference
          // without telling anyone.
          expectedUnitPrices: Object.fromEntries(
            cartItems.map(item => [item.productId, item.price])
          ),
        }),
      })

      if (!orderResponse.ok) {
        const data = await orderResponse.json().catch(() => ({}))

        if (data.code === 'PRICE_CHANGED') {
          const changes: { productId: string; actual: number }[] = data.changes ?? []
          const repriced = cartItems.map(item => {
            const change = changes.find(entry => entry.productId === item.productId)
            return change ? { ...item, price: change.actual } : item
          })

          setCartItems(repriced)
          localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(repriced))
          // The subtotal just moved, so whatever the voucher was worth before
          // is no longer what it is worth now.
          setAppliedVoucher(null)
          throw new Error('Harga beberapa produk berubah. Periksa keranjang, lalu lanjutkan lagi.')
        }

        if (data.code === 'VOUCHER_REJECTED') {
          setAppliedVoucher(null)
          throw new Error(data.error || 'Voucher tidak bisa dipakai')
        }

        throw new Error(data.error || 'Failed to create order')
      }

      const orderData = await orderResponse.json()
      const orderId = orderData.order.id

      // Create the payment intent with the method the customer picked
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          orderId,
          paymentMethod,
        }),
      })

      if (!checkoutResponse.ok) {
        throw new Error('Gagal memulai pembayaran')
      }

      // Clear cart after successful checkout
      localStorage.removeItem(`cart_${storeDomain}`)
      setCartItems([])

      // A manual transfer has no gateway to visit - the customer uploads the
      // proof from the order page instead.
      if (paymentMethod === 'MANUAL') {
        window.location.href = `/${storeDomain}/orders/${orderId}`
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
    <div className="min-h-screen bg-gray-50">
      <StoreHeader storeDomain={storeDomain} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Keranjang</h1>

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow border px-4 py-16 text-center">
            <p className="text-gray-500 mb-4">Keranjang Anda masih kosong.</p>
            <Link
              href={`/${storeDomain}`}
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map(item => (
              <div key={item.productId} className="bg-white rounded-lg shadow border p-4 flex items-center">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded mr-4"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-gray-600">Rp {item.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="px-2 py-1 border rounded-l"
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span className="px-4 py-1 border-t border-b">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="px-2 py-1 border rounded-r"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="ml-4 text-red-500 hover:text-red-700"
                >
                  Hapus
                </button>
              </div>
            ))}

            <div className="bg-white rounded-lg shadow border p-4">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>Rp {calculateTotal().toLocaleString('id-ID')}</span>
              </div>

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

              {appliedVoucher && (
                <div className="mt-4 flex justify-between text-gray-700">
                  <span>Potongan voucher</span>
                  <span className="text-green-700">
                    - Rp {appliedVoucher.discount.toLocaleString('id-ID')}
                  </span>
                </div>
              )}

              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg text-gray-900">
                <span>Total</span>
                <span>Rp {calculatePayable().toLocaleString('id-ID')}</span>
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

              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Memproses...' : 'Lanjut ke Pembayaran'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default CartPage