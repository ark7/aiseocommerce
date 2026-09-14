# aiseocommerce
AISERPCommerce

## API Endpoints

### Checkout & Payments
- **`POST /api/orders`**: Create a new order from cart items. Reserves stock immediately (`RESERVATION`).
- **`POST /api/checkout`**: Create a payment intent (`PENDING`) and receive gateway redirect URL or payment instructions.
- **`POST /api/payments/confirm`**: Process payment gateway confirmation webhooks and update order status.
- **`PUT /api/payments/confirm`**: Manual order confirmation by authorized store owner/staff.
- **`POST /api/payment/manual`**: Upload manual payment proof with automated audit logging (`MANUAL_PAYMENT_UPLOAD`).
