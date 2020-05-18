# Webhooks with Commerce.js SDK and Nuxt.js

This guide continues from (Creating a Checkout with Commerce.js SDK and Nuxt.js)[Creating a Checkout](https://github.com/ElijahKotyluk/nuxt-cjs-adding-products)

This guide illustrates how to create a webhook in the Chec dashboard and use it to send an Email to the customer.

[Live Demo](https://cjs-nuxt-webhook.herokuapp.com/)

***** *Note* *****

* This guide uses v2 of the Commerce.js SDK

![](https://imgur.com/a/o0Q6e0S)

## Overview
In the previous guide you created a checkout page for your customers, generated a checkout token, and captured an order. In this guide you will be introduced to using CommerceJS's [webhooks](https://commercejs.com/docs/api/#webhooks), integrate [SendGrid](https://sendgrid.com/)'s email API, and send an email message with the customer's order reference.

## This guide will cover

1. Webhooks in the Chec.io dashboard
2. Setting up a SendGrid account
3. Install SendGrid and update your server
4. Install ngrok and test the webhook
5. Send an email to your customer
6. Create an order confirmation page

## Requirements

- IDE of your choice: VS Code is not required, you can use something lightweight like [Atom Code Editor](https://atom.io/) or [Sublime Text](https://www.sublimetext.com/).
- [Commerce.js SDK](https://github.com/chec/commerce.js)
- [Chec.io account](https://authorize.chec.io/signup)
- [ExpressJS](https://expressjs.com)
- [ngrok](https://ngrok.com/)
- Yarn or npm
- [Nuxt.js](https://nuxtjs.org/)
- [Vuetify](https://vuetifyjs.com/en/)
- [Vuex](https://nuxtjs.org/guide/vuex-store/)
- [Send Grid Account](https://sendgrid.com)

## Prerequesites
Basic knowldge of Express, Nuxt.js and JavaScript are required for this guide.

- Nuxt.js v2
- JavaScript(ES7)
- Vuetify.js v2.2.15
- Vue.js
- ExpressJS

## Creating a SendGrid account

An important part of this guide is setting up a [SendGrid](https://sendgrid.com) account and generating an API Key. So first thing's first, you should create an account(They do have a free option!). They will ask for some basic details to create your account, once completed you should find yourself welcomed by send grid. On the left side of the page is a menu, click on `settings` at the botttom and then locate the `API Keys`([Here](https://app.sendgrid.com/settings/api_keys) if you have an account already) option in the settings panel. You will then be taken to a fairly blank page that is titled, 'API Keys', you will want to click the `Create API Key` button on the right hand side. Once clicked, a dialog will pop up and allow you to name and set the terms for your API Key. I recommend just going with **Full Access**, as I have for this guide. 

![Send Grid API Key](https://i.imgur.com/LRAAFPi.png)

Once your API Key is created, you'll be taken to a page that will display this key **`ONE TIME ONLY`**, so be sure to copy it and put it in your `.env` file in the root of your project. E.g.`SENDGRID_API_KEY="<your-key-goes-here>"`
If you do not, you will have to repeat the process of creating another API key. 

![SAVE YOUR KEY!!!!](https://i.imgur.com/oPTVf8k.png)

After you've created and stored your key within your project so it can be used in future steps, go back to the left side menu, click `settings`, followed by the [Sender Authentication](https://app.sendgrid.com/settings/sender_auth) option in the settings panel. On this page there will be a couple of options for verifying a sender, click the `Get Started` button beneath `Verify an Address`.

![Sender Authentication page](https://i.imgur.com/8SwHVf5.png)

After clicking the button, a menu containing a form will slide out from the right side, asking for some details to verify your sender email address. Fill out those details and create a sender, this is the address and info used when sending an email through SendGrid's email API. If successful, you should see the following:

![Created a sender](https://i.imgur.com/7IGOPNy.png)

## Setting up the server

Since you used the nuxt-cli to create this project, if you followed the same options as in the [first guide](https://github.com/ElijahKotyluk/commercejs-nuxt-demo) you will have had an express server already created with the project. Since you already have a base server created, the necessary dependencies will be installed. `body-parser` is a [middleware](https://www.npmjs.com/package/body-parser) that parses incoming requests before your handlers. `@sendgrid/mail` is the [SendGrid SDK](https://www.npmjs.com/package/@sendgrid/mail) used to send the emails. To install these dependencies, run either of the following in your terminal. *Be sure you are in the root of your project*

```ts
// yarn
yarn add body-parser @sendgrid/mail

//npm
npm i body-parser @sendgrid/mail
```

Once you have run one of the commands, go to the `server/index.js` file, create variables, and require the dependencies you have just installed. Be sure to have your server use the `bodyParser` middleware. The server file should look like this:

```ts
// server/index.js
const express = require('express')
const consola = require('consola')
const bodyParser = require('body-parser')
const sgMail = require('@sendgrid/mail')
const { Nuxt, Builder } = require('nuxt')

const app = express()
app.use(bodyParser.json())

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
```

Next you'll want to edit the async start function that shipped with the server file, inside you'll use the `app.post()` [method](https://expressjs.com/en/api.html#app.post.method) to listen for an incoming request. Inside the post request create a `headers` object variable containg an `Accept` property with the following value: `*/*,`: Any mime type, `'Content-Type': 'application/json',`: Json is the expected format of the requested data, `'Access-Control-Allow-Origin': '*'`: Allow any origin to access the resource. You will then use the `res`(response) object and call `writeHead(200, headers)` with the headers variable you just created. Next you'll create a `credentials` variable which should have the value of your SendGrid API key. Since you stored it in the `.env` file earlier, you can just use `process.env.SENDGRID_API_KEY`. The last necessary variable is `msg`, this object will contain the necessary properties required to send an email through SendGrid; `to:`: Email recipient/customer, `from`: You, `subject`: Subject of the email. `text`: The message you'd like to send in the body of the email.

```ts
  // server/index.js
  ...
  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt)
    await builder.build()
  }

  app.post('/', (req, res) => {
    console.log('req: ', req.body) // Call your action on the request here
    const headers = {
      Accept: '*/*',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
    res.writeHead(200, headers)

    const credentials = "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"
    sgMail.setApiKey(credentials)

    const msg = {
      to: req.body.payload.customer.email,
      from: req.body.payload.merchant.support_email,
      subject: 'Thank you for your purchase!',
      text: `Hi ${req.body.payload.customer.firstname}, thank you for your purchase. Here is your order reference: ${req.body.payload.customer_reference}`
    }

    sgMail
      .send(msg)
        .then(
          () => {},
          (error) => {
            console.error(error)

            if (error.response) {
              console.error(error.response.body)
            }
          }
        )
  })

  // Give nuxt middleware to express
  ...
```

The request object, if successful, will contain a lot of data. The request object will have details about the webhook itself, the customer's cart, order reference, shipping information, merchant details, and anything else you could possibly need. A signature is also included, which you can use to validate the request came from Chec.io and not someone else.
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
// yarn
yarn global add ngrok

// npm
npm i -g ngrok
```

After you've installed ngrok, open up two terminal windows. In the first, run your development server like so;

```ts
// yarn
yarn dev

// npm
npm run dev
```

And in the second terminal, run the recently installed ngrok command with the port your local server is running on(For Nuxt it is `3000`).

```ts
ngrok http 3000
```

If all goes well you should see the following in the second terminal window:

![Ngrok terminal window](https://i.imgur.com/YXH2wF5.png)

*I would recommend copying 'ctrl || cmd + c' the last url to be used in the next step, in my case it's:* `https://0e46744b.ngrok.io`


## Create a Webhook

Login to your [dashboard](https://dashboard.chec.io) and navigate to the settings page, from there click on the `Webhooks` menu option and you will land at the [webhooks page](https://dashboard.chec.io/setup/webhooks). Once you've found the webhooks page, there will be a green button to the right that says `+ ADD WEBHOOK`, click that button and a dialog will pop up. The event chosen was the `order.create` event, which will trigger once a customer checks out and the order is created. In the `URL` field, paste the url copied in the last step. Once that is done you can click `Add webhook`.

![Create a webhook](https://i.imgur.com/xiY57MV.png)

Now that you have added your webhook you will now see it listed under `Registered webhooks`:

![registered webhook](https://i.imgur.com/dltbkPi.png)

## Test your webhook

To test your webhook out, open up your browser and paste the copied link again into the browser's url bar. Go through the steps of being a customer, select a product, add it to the cart, checkout with your shipping/billing information and once the order has been submitted, hopefully you will have received an email notification about the order.

![Email received](https://i.imgur.com/8YKv5yG.jpg)

### Conclusion

Great job, you've successfully sent an email to your customer after they've submitted an order as well as a confirmation page for the customer.

Let's review what you have accomplished in this guide.

* Created a SendGrid account and used their mail API to send emails
* Updated your server to listen for a request from the webhook and use the data to send an email.
* Created a webhook that triggers whenever a customer creates an order
* Installed and used ngrok to test your webhook
* Sent an email to your customer when an order is submitted
* Created a confirmation page 

[Live Demo](https://cjs-nuxt-webhook.herokuapp.com/)

As you can see, the Commerce.js SDK greatly simplifies the eCommerce process, the only thing left for you to do is create a theme or layout and style your app as you see fit.

This guide continues from (Adding products to a cart with Nuxt.js and Commerce.js)[Adding Products To A Cart](https://github.com/ElijahKotyluk/nuxt-cjs-adding-products)

## Built With

* [Nuxt.js](https://github.com/nuxt/nuxt.js) - The front-end framework used
* [Vuetify](https://github.com/vuetifyjs/vuetify) - The Vue material component library used
* [ExpressJS](https://expressjs.com) - The server used
* [SendGrid](https://sendgrid.com) - The API used to send an email
* [Yarn](https://github.com/yarnpkg/yarn) - Package manager tool

## Authors

* **ElijahKotyluk** - [Github](https://github.com/ElijahKotyluk)

