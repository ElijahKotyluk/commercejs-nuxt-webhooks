<template>
  <v-card>
    <v-card-title>
      Your order has been received!
    </v-card-title>
    <v-card-subtitle>
      Thank you for shopping with us, we appreciate your business. A
      confirmation email has been sent to
      <span class="font-italic font-weight-bold">
        {{ checkout.customer.email }}
      </span>
      , you may have to check your spam folder.
    </v-card-subtitle>
    <v-divider></v-divider>
    <v-card-text>
      <v-row>
        <v-col cols="6" align="space-around">
          <span class="title nav-text">Order:</span>

          <v-divider></v-divider>
          <template v-for="product in checkout.order.line_items">
            <v-list-item :key="product.product_id" class="mb-2">
              <v-list-item-title>
                {{ product.product_name }}
                <span>x</span>
                <span class="mr-2">
                  {{ product.quantity }}
                </span>
              </v-list-item-title>

              <span class="mr-2">
                {{ product.line_total.formatted_with_symbol || '$0.00' }}
              </span>
            </v-list-item>
          </template>

          <v-list-item class="mt-2 mb-2">
            <v-list-item-title>
              <span class="nav-text subtitle-1 font-weight-medium">
                Shipping:
              </span>
            </v-list-item-title>

            <span class="mr-2 nav-text">
              {{ checkout.order.shipping.price.formatted_with_symbol }}
            </span>
          </v-list-item>

          <v-list-item class="mt-2 mb-2">
            <v-list-item-title>
              <span class="nav-text subtitle-1 font-weight-medium">Total</span>
            </v-list-item-title>

            <span class="mr-2 nav-text">
              {{ checkout.order.total.formatted_with_symbol }}
            </span>
          </v-list-item>
        </v-col>
        <v-col cols="1" align="center">
          <v-divider vertical></v-divider>
        </v-col>
        <v-col cols="5">
          <span class="title nav-text">Shipping:</span>

          <v-divider></v-divider>
          <div class="mt-5">
            <v-row>
              <span class="ml-4 my-1 subtitle-1">
                To: {{ checkout.shipping.name }}
              </span>
            </v-row>
            <v-row>
              <span class="ml-10 subtitle-2">
                {{ checkout.shipping.street }}
              </span>
            </v-row>
            <v-row>
              <div>
                <span class="ml-10 subtitle-2">
                  {{ checkout.shipping.town_city }},
                  {{ checkout.shipping.county_state }}
                  {{ checkout.shipping.postal_zip_code }}
                </span>
                <span>
                  {{ checkout.shipping.country }}
                </span>
              </div>
            </v-row>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
    <v-divider></v-divider>
    <v-card-actions>
      <v-row class="pb-5" justify="center">
        <v-btn color="green" class="white--text mt-10" to="/" large>
          Store
        </v-btn>
      </v-row>
    </v-card-actions>
  </v-card>
</template>

<script>
import { mapState } from 'vuex'

export default {
  async asyncData({ params }) {
    const slug = await params.slug

    return { slug }
  },
  data() {
    return {
      slug: this.$route.params.slug
    }
  },
  computed: {
    ...mapState(['checkout'])
  }
}
</script>

<style>
.nav-text {
  color: #6c7c8f;
}
</style>
