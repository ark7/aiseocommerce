'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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
      // First create order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
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

      // Then proceed to checkout
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          orderId,
          paymentMethod: 'MIDTRANS', // Default to Midtrans
        }),
      })

      if (!checkoutResponse.ok) {
        throw new Error('Failed to initiate checkout')
      }

      const checkoutData = await checkoutResponse.json()
      const paymentUrl = checkoutData.paymentGatewayResponse.redirectUrl

      // Clear cart after successful checkout
      localStorage.removeItem(`cart_${storeDomain}`)
      setCartItems([])

      // Redirect to payment gateway
      window.location.href = paymentUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (isLoading) {
    return <div>Processing checkout...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Your cart is empty</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cartItems.map(item => (
            <div key={item.productId} className="flex items-center border-b pb-4">
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-cover mr-4"
                />
              )}
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
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
                Remove
              </button>
            </div>
          ))}

          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>Rp {calculateTotal().toLocaleString()}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              disabled={isLoading}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CartPage