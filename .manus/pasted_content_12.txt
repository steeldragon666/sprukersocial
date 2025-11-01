// Stripe Payment Service
// Handles all payment processing and subscription management

import Stripe from 'stripe';
import { prisma, PaymentStatus, ProductType, Plan } from '@headshot-studio/database';
import { PRICING, ADD_ONS } from '@headshot-studio/shared';

export class PaymentService {
  private stripe: Stripe;

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }

  /**
   * Create Stripe customer for user
   */
  async createCustomer(params: {
    userId: number;
    email: string;
    name?: string;
  }): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        userId: params.userId.toString(),
      },
    });

    // Update user with Stripe customer ID
    await prisma.user.update({
      where: { id: params.userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(params: {
    userId: number;
    productType: ProductType;
    projectId?: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }> {
    const { userId, productType, projectId, successUrl, cancelUrl } = params;

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      customerId = await this.createCustomer({
        userId,
        email: user.email,
        name: user.name || undefined,
      });
    }

    // Get product details
    const productDetails = this.getProductDetails(productType);

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: productDetails.recurring ? 'subscription' : 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: productDetails.price,
            product_data: {
              name: productDetails.name,
              description: productDetails.description,
            },
            recurring: productDetails.recurring
              ? { interval: 'month' }
              : undefined,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
        productType,
        projectId: projectId?.toString() || '',
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
    }

    return { received: true };
  }

  /**
   * Handle checkout session completed
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = parseInt(session.metadata?.userId || '0');
    const productType = session.metadata?.productType as ProductType;
    const projectId = session.metadata?.projectId
      ? parseInt(session.metadata.projectId)
      : undefined;

    if (!userId || !productType) {
      console.error('Missing metadata in checkout session');
      return;
    }

    // Create payment record
    await prisma.payment.create({
      data: {
        userId,
        stripePaymentId: session.payment_intent as string,
        stripeInvoiceId: session.invoice as string | undefined,
        amount: session.amount_total || 0,
        currency: session.currency || 'usd',
        status: PaymentStatus.SUCCEEDED,
        productType,
        description: `Purchase: ${productType}`,
        metadata: { projectId } as any,
      },
    });

    // Update user plan if it's a plan purchase
    if (productType.includes('PLAN')) {
      const plan = this.getProductDetails(productType).plan;
      if (plan) {
        await prisma.user.update({
          where: { id: userId },
          data: { plan },
        });
      }
    }
  }

  /**
   * Handle payment succeeded
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const paymentId = paymentIntent.id;

    await prisma.payment.updateMany({
      where: { stripePaymentId: paymentId },
      data: { status: PaymentStatus.SUCCEEDED },
    });
  }

  /**
   * Handle payment failed
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const paymentId = paymentIntent.id;

    await prisma.payment.updateMany({
      where: { stripePaymentId: paymentId },
      data: { status: PaymentStatus.FAILED },
    });
  }

  /**
   * Handle subscription update
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    // Get user by Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    // Update user's plan based on subscription
    // This is simplified - you'd want to check the subscription product
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: Plan.PROFESSIONAL, // Or determine from subscription
      },
    });
  }

  /**
   * Handle subscription canceled
   */
  private async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    await prisma.user.update({
      where: { id: user.id },
      data: { plan: Plan.FREE },
    });
  }

  /**
   * Get product details by type
   */
  private getProductDetails(productType: ProductType): {
    name: string;
    description: string;
    price: number;
    recurring?: boolean;
    plan?: Plan;
  } {
    switch (productType) {
      case ProductType.STARTER_PLAN:
        return {
          name: PRICING.STARTER.name,
          description: `${PRICING.STARTER.headshotsGenerated} headshots generated`,
          price: PRICING.STARTER.price,
          plan: Plan.STARTER,
        };

      case ProductType.PROFESSIONAL_PLAN:
        return {
          name: PRICING.PROFESSIONAL.name,
          description: `${PRICING.PROFESSIONAL.headshotsGenerated} headshots with premium features`,
          price: PRICING.PROFESSIONAL.price,
          plan: Plan.PROFESSIONAL,
        };

      case ProductType.TEAM_PLAN:
        return {
          name: PRICING.TEAM.name,
          description: `${PRICING.TEAM.members} team members with consistent styling`,
          price: PRICING.TEAM.price,
          plan: Plan.TEAM,
        };

      case ProductType.EXTRA_BACKGROUNDS:
        return {
          name: ADD_ONS.EXTRA_BACKGROUNDS.name,
          description: 'Additional background style options',
          price: ADD_ONS.EXTRA_BACKGROUNDS.price,
        };

      case ProductType.VIDEO_AVATAR:
        return {
          name: ADD_ONS.VIDEO_AVATAR.name,
          description: 'Animated video avatar from your headshot',
          price: ADD_ONS.VIDEO_AVATAR.price,
        };

      case ProductType.MONTHLY_REFRESH:
        return {
          name: ADD_ONS.MONTHLY_REFRESH.name,
          description: '4 new headshots every month',
          price: ADD_ONS.MONTHLY_REFRESH.price,
          recurring: true,
        };

      case ProductType.BACKGROUND_REMOVAL:
        return {
          name: ADD_ONS.BACKGROUND_REMOVAL.name,
          description: 'Remove backgrounds from your headshots',
          price: ADD_ONS.BACKGROUND_REMOVAL.price,
        };

      case ProductType.FULL_IMAGE_SET:
        return {
          name: ADD_ONS.FULL_SET.name,
          description: 'Get all 100 generated images',
          price: ADD_ONS.FULL_SET.price,
        };

      default:
        throw new Error(`Unknown product type: ${productType}`);
    }
  }

  /**
   * Get user's payment history
   */
  async getPaymentHistory(userId: number) {
    return await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: number, userId: number) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Create refund in Stripe
    const refund = await this.stripe.refunds.create({
      payment_intent: payment.stripePaymentId,
    });

    // Update payment record
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });

    return refund;
  }
}