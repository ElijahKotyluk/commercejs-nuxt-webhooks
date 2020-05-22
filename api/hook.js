import client from '@sendgrid/mail';

export default function(req, res, next) {
  client.setApiKey(process.env.SENDGRID_API_KEY)

  if (req.method === 'POST') {
    const body = []
    req.on('data', (chunk) => {
      body.push(chunk)
    })
    req.on('end', () => {
      const event = JSON.parse(body)

      const msg = {
        to: event.payload.customer.email,
        from: event.payload.merchant.support_email,
        subject: 'Thank you for your purchase!',
        text: `Hi ${event.payload.customer.firstname}, thank you for your purchase. Here is your order reference: ${event.payload.customer_reference}`
      }

      client.send(msg)
    })
  }

  res.statusCode = 200
  res.end()
}
