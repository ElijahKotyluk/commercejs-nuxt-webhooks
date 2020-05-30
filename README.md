# Webhooks with Commerce.js and Nuxt.js

This guide continues from [Creating a Checkout with Commerce.js SDK and Nuxt.js](https://github.com/ElijahKotyluk/commercejs-nuxt-checkout/)

In this guide, I will illustrate how to create a webhook in the Chec dashboard and then use it to send an email to the customer. We'll also be creating a simple order confirmation page.

[Live Demo](https://cjs-nuxt-webhook.herokuapp.com/)

***** *Note* *****

* This guide uses Commerce.js SDK v2

## Overview
In the previous guide you created a checkout page for your customers, generated a checkout token, and captured an order. In this guide you will be introduced to using Commerce.js's [webhooks](https://commercejs.com/docs/api/#webhooks), integrate [SendGrid](https://sendgrid.com/)'s email API, and send an email message with the customer's order reference.

## This guide will cover

1. Webhooks in the Chec dashboard
2. Setting up a SendGrid account
3. Install SendGrid and update your server
4. Install ngrok and test the webhook
5. Send an email to your customer
6. Create an order confirmation page

## Requirements

- IDE or a code editor of your choice
- [Commerce.js SDK](https://github.com/chec/commerce.js)
- [Chec account](https://authorize.chec.io/signup)
- [ExpressJS](https://expressjs.com)
- [ngrok](https://ngrok.com/)
- Yarn or npm
- [Nuxt.js](https://nuxtjs.org/)
- [Vuetify](https://vuetifyjs.com/en/)
- [Vuex](https://nuxtjs.org/guide/vuex-store/)
- [SendGrid Account](https://sendgrid.com)

## Prerequisites
Basic knowldge of Express, Nuxt.js and JavaScript are required for this guide.

- Nuxt.js v2
- JavaScript(ES7)
- Vuetify.js v2.2.15
- Vue.js
- ExpressJS

## Creating a SendGrid account

An important part of this guide is setting up a [SendGrid](https://sendgrid.com) account and generating an API Key. So first thing's first, you should create an account (they do have a free option)! SendGrid will ask for some basic details to create your account, once completed you should find yourself welcomed by SendGrid. On the left side of the page is a menu, click on `settings` at the botttom and then locate the **API Keys** option in the settings panel (go [here](https://app.sendgrid.com/settings/api_keys) if you have an account already). You will then be taken to a fairly blank page that is titled, **API Keys**, you will want to click the **Create API Key** button on the right hand side. Once clicked, a dialog will pop up and allow you to name and set the terms for your API Key. I recommend just going with **Full Access**, as I have for this guide. 

![SendGrid API Key](https://i.imgur.com/LRAAFPi.png)

Once your API Key is created, you'll be taken to a page that will display this key **`ONE TIME ONLY`**, so be sure to copy it and put it in your `.env` file in the root of your project. E.g.`SENDGRID_API_KEY="<your-key-goes-here>"`
If you do not, you will have to repeat the process of creating another API key. 

![SAVE YOUR KEY!!!!](https://i.imgur.com/oPTVf8k.png)

After you've created and stored your key within your project so it can be used in future steps, go back to the left side menu, click **settings**, followed by the [Sender Authentication](https://app.sendgrid.com/settings/sender_auth) option in the settings panel. On this page there will be a couple of options for verifying a sender, click the **Get Started** button beneath **Verify an Address**.

![Sender Authentication page](https://i.imgur.com/8SwHVf5.png)

After clicking the button, a menu containing a form will slide out from the right side, asking for some details to verify your sender email address. Fill out those details and create a sender, this is the address and info used when sending an email through SendGrid's email API. If successful, you should see the following:

![Created a sender](https://i.imgur.com/7IGOPNy.png)

## Setting up the server

Since you used the nuxt-cli to create this project, if you followed the prompts and chose the same options as I did, in the [first guide](https://github.com/ElijahKotyluk/commercejs-nuxt-demo) you would have had an express server already created with the project. Since you already have a base server created, there is only one necessary dependency left to install. `@sendgrid/mail` is the [SendGrid SDK](https://www.npmjs.com/package/@sendgrid/mail) used to send the emails. To install this package, run either of the following in your terminal. *Be sure you are in the root of your project*

```ts
# Install with Yarn
yarn add @sendgrid/mail

# Install with npm
npm i @sendgrid/mail
```

 The server file will look like this:

```ts
// server/index.js

const express = require('express')
const consola = require('consola')
const { Nuxt, Builder } = require('nuxt')

const app = express()

// Import and set Nuxt.js options
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

  // Give Nuxt middleware to Express
  app.use(nuxt.render)

  // Listen to the server
  app.listen(port, host)
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true
  })
}
start()
```

Next you will create the server middleware used to send the email. First create an `api` directory at the root of your project, then add a file called `hook.js` inside. At the top of the file, begin by importing the client from the [@sendgrid/mail](https://github.com/sendgrid/sendgrid-nodejs/tree/master/packages/client) package installed previously. Then export a default function with the following parameters, `req`: request, `res`: response, and `next`. First we'll set the api key using a method on the imported client object. Then you will listen for a post request and push the streamed into an array, once the request has ended you will use JSON.parse to parse the array of data. From there you will be able to grab the customers email, first name, reference number, and also the merchant's email. The last necessary variable is `msg`, this object will contain the necessary properties required to send an email through SendGrid; `to:`: Email recipient/customer, `from`: You, `subject`: Subject of the email. `text`: The message you'd like to send in the body of the email. You then will then use the `send()` method on the client object and pass it the `msg` variable to send your customer an email when they place their order successfully.

```ts
// api/hook.js

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
        text: `Hi ${event.payload.customer.firstname},
              thank you for your purchase. Here is your order reference: 
              ${event.payload.customer_reference}`
      }

      client.send(msg)
    })
  }

  res.statusCode = 200
  res.end()
}
```

Update your `nuxt.config.js` file and register the server middleware you just created. To do this you will add the [serverMiddlerware](https://nuxtjs.org/api/configuration-servermiddleware/) property to your config file. The `serverMiddleware` property accepts a list of strings, objects, or functions as it's value. For this demo, an object will be the item used, set `path`'s value to `/api/hook` and `handler`'s value to `~/api/hook.js`. The path is the route path and handler is the file path pointing to the file you just created.

```ts
// nuxt.config.js
  /*
  ...
  ** Nuxt server middleware
  ** Docs: https://nuxtjs.org/api/configuration-servermiddleware/
   */
  serverMiddleware: [
    { path: '/api/hook', handler: '~/api/hook.js' }
  ],
  ...
```

A successful request object will contain a lot of data, details about the webhook itself, the customer's cart, order reference, shipping information, merchant details, and anything else you could possibly need. A signature is also included, which you can use to validate the request came from Chec and not someone else.

*This is the expected request body that will be logged when a successful request comes through from Chec.io:*

```ts
// Successfull request body example:

{
  id: 'wbhk_j0YnEoqP6we7P6',
  created: 1589168245,
  event: 'orders.create',
  response_code: 201,
  payload: {
    id: 'ord_DWy4oG4qev56Jx',
    cart_id: 'cart_vlK9eDpWjpRjZo',
    checkout_token_id: 'chkt_jwOX7N3Q8Pkn4o',
    created: 1589168242,
    redirect: false,
    customer_reference: 'DMMRCHNT-98999',
    status_payment: 'paid',
    status_fulfillment: 'not_fulfilled',
    customer: {
      email: 'elijah@elijahkotyluk.com',
      firstname: 'Elijah',
      lastname: 'Kotyluk'
    },
    currency: { code: 'USD', symbol: '$' },
    extrafields: null,
    shipping: {
      name: 'Elijah Kotyluk',
      street: '934 west cross',
      street_2: null,
      town_city: 'woodland',
      county_state: 'CA',
      postal_zip_code: '95695',
      country: 'US'
    },
    billing: [],
    order: {
      line_items: [Array],
      subtotal: [Object],
      discount: [],
      shipping: [Object],
      tax: [Object],
      total: [Object],
      total_with_tax: [Object],
      giftcard: [],
      pay_what_you_want: [Object],
      total_paid: [Object],
      future_charges: []
    },
    payments: [ [Object] ],
    pending_payments: [],
    fulfillment: { physical: [Object], digital: [Object] },
    conditionals: {
      collects_fullname: true,
      collects_shipping_address: true,
      collects_billing_address: false,
      fulfill_shipping: true,
      fulfill_digital: false,
      has_available_discounts: false,
      has_pay_what_you_want: false,
      collects_extrafields: false,
      is_cart_free: false,
      has_preorder: false,
      has_delayed_preorder: false
    },
    metadata: [],
    fraud: [],
    preorders: [],
    merchant: {
      id: 17828,
      business_name: 'Demo Merchant',
      business_description: '',
      status: 'active',
      timezone: 'UM8',
      country: 'US',
      currency: [Object],
      support_email: 'elijah@elijahkotyluk.com',
      logo: null,
      logo_shape: 'circle',
      cover: null,
      is_manifold: 0,
      analytics: [Object],
      has: [Object]
    }
  },
  signature: '232e23cf0b6907544b96a33cc32adc6c43f4ddde817819ee876d82c65119d68c'
}
```

## Install ngrok

[ngrok](https://ngrok.com/) allows you to expose a web server running on your local machine to the internet and can be used test your webhook before publishing. To install ngrok globally, simply enter the following command into your terminal.

```ts
# Install with Yarn
yarn global add ngrok

# Install with npm
npm i -g ngrok
```

After you've installed ngrok, open up two terminal windows. In the first, run your development server like so;

```ts
yarn dev
# OR
npm run dev
```

And in the second terminal, run the recently installed ngrok command with the port your local server is running on (for Nuxt it is `3000`).

```ts
ngrok http 3000
```

If all goes well you should see the following in the second terminal window:

![Ngrok terminal window](https://i.imgur.com/YXH2wF5.png)

*I would recommend copying 'ctrl || cmd + c' the last url to be used in the next step, in my case it's:* `https://0e46744b.ngrok.io`


## Create a Webhook

Login to your [dashboard](https://dashboard.chec.io) and navigate to the settings page, from there click on the `Webhooks` menu option and you will land at the [webhooks page](https://dashboard.chec.io/setup/webhooks). Once you've found the webhooks page, there will be a green button to the right that says **+ ADD WEBHOOK**, click that button and a dialog will pop up. The event chosen was the `order.create` event, which will trigger once a customer checks out and the order is created. In the `URL` field, paste the url copied in the last step. Once that is done you can click `Add webhook`.

![Create a webhook](https://i.imgur.com/xiY57MV.png)

Now that you have added your webhook you will now see it listed under `Registered webhooks`:

![registered webhook](https://i.imgur.com/dltbkPi.png)

## Test your webhook

To test your webhook out, open up your browser and paste the copied link again into the browser's url bar. Go through the steps of being a customer, select a product, add it to the cart, and checkout with your shipping/billing information. Once the order has been submitted, you will hopefully have received an email notification about the order.

![Email received](https://i.imgur.com/8YKv5yG.jpg)

## Create a confirmation page
For this last step you will be creating a confirmation page for your customer that will be routed to once they submit their order. To achieve this you will begin by creating a new directory within the [pages](https://nuxtjs.org/guide/views/#pages) directory, called `order`, and within `pages/order/` you will create a file called `_slug.vue`. The full path should be `pages/order/_slug.vue`. Inside the script portion of this single file component will be a single computed property, `checkout`, which will be mapped from your vuex store's state. This [capture checkout object](https://commercejs.com/docs/api/#capture-order) will provide you with the necessary data you would need to create a confirmation page for your customers.

```js
import { mapState } from 'vuex'

export default {
  computed: {
   ...mapState(['checkout'])
  }
}
```

Once you've created your confirmation page, go back to your `BillingDetails.vue` component at `components/BillingDetails.vue` to edit the submit method to now dispatch the `captureCheckout` action to the store and push to the confirmation page route using the order id as the route slug. Once you've completed this step it is now a good time to test out your app and make sure everything is working properly. Don't forget to test using ngrok to be sure your webhook is working. 

```js
// components/BillingDetails.vue

...
submitOrder() {
  ...
  // capture checkout data
  const data = {
  ...
  }
  this.$store
    .dispatch('captureCheckout', { token: this.token.id, data })
    .then((val) => {
      this.$router.push(`/order/${val.id}`)
    })
},
...
```

### Conclusion

Great job, you've successfully sent an email to your customer after they've submitted an order as well as a confirmation page for the customer.

Let's review what you have accomplished in this guide:

* Created a SendGrid account and used their mail API to send emails
* Updated your server to listen for a request from the webhook and use the data to send an email.
* Created a webhook that triggers whenever a customer creates an order
* Installed and used ngrok to test your webhook
* Sent an email to your customer when an order is submitted
* Created a confirmation page 

[Live Demo](https://cjs-nuxt-webhook.herokuapp.com/)

As you can see, the Commerce.js SDK greatly simplifies the eCommerce process, the only thing left for you to do is create a theme or layout and style your app as you see fit.

This guide continues from [Creating a Checkout with Commerce.js SDK and Nuxt.js](https://github.com/ElijahKotyluk/commercejs-nuxt-checkout/)

## Built With

* [Nuxt.js](https://github.com/nuxt/nuxt.js) - The front-end framework used
* [Vuetify](https://github.com/vuetifyjs/vuetify) - The Vue material component library used
* [ExpressJS](https://expressjs.com) - The server used
* [SendGrid](https://sendgrid.com) - The API used to send an email
* [Yarn](https://github.com/yarnpkg/yarn) - Package manager tool

## Authors

**ElijahKotyluk** - [Github](https://github.com/ElijahKotyluk)
