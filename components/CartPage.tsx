'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import StoreHeader from '@/components/StoreHeader'
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

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    const updatedItems = cartItems.map(item =>
      item.productId === productId ? { ...item, quantity: newQuantity } : item
    )

    setCartItems(updatedItems)
    localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(updatedItems))
  }

  const removeItem = (productId: string) => {
    const updatedItems = cartItems.filter(item => item.productId !== productId)
    setCartItems(updatedItems)
    localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(updatedItems))
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleCheckout = async () => {
    if (!storeId || !cartItems.length) return

    setIsLoading(true)
    setError(null)

    try {
      // Link the order to the signed-in customer so it shows up in their order
      // history and they can confirm receipt later.
      const storedUser = localStorage.getItem('user')
      const customerId = storedUser ? JSON.parse(storedUser).id : undefined

      // First create order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          customerId,
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      })

      if (!orderResponse.ok) {
        throw new Error('Failed to create order')
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
              <div className="flex justify-between font-bold text-lg text-gray-900">
                <span>Total</span>
                <span>Rp {calculateTotal().toLocaleString()}</span>
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