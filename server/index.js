const express = require('express')
const consola = require('consola')
const bodyParser = require('body-parser')
const { Nuxt, Builder } = require('nuxt')
const app = express()

app.use(bodyParser.json())
// const accountSid = process.env.TWILIO_AUTH_TOKEN
// const authToken = process.env.TWILIO_ACC_SID
const sgMail = require('@sendgrid/mail')

// Import and Set Nuxt.js options
const config = require('../nuxt.config.js')
config.dev = process.env.NODE_ENV !== 'production'

async function start() {
  // Init Nuxt.js
  const nuxt = new Nuxt(config)

  const { host, port } = nuxt.options.server

  await nuxt.ready()
  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt)
    await builder.build()
  }

  app.post('/', (req, res) => {
    const credentials = process.env.SENDGRID_API_KEY

    const headers = {
      Accept: '*/*',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }

    sgMail.setApiKey(credentials)

    const msg = {
      to: req.body.payload.customer.email,
      from: req.body.payload.merchant.support_email,
      subject: 'Thank you for your purchase!',
      text: `Hi ${req.body.payload.customer.firstname}, thank you for your purchase. Here is your order reference: ${req.body.payload.customer_reference}`
    }

    sgMail
      .send(msg)
      .then(() => {
        res.send('200', headers)
      }).catch((e) => {
        throw e
      })

      res.end()
  })

  // Give nuxt middleware to express
  app.use(nuxt.render)

  // Listen the server
  app.listen(port, host)
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true
  })
}
start()
