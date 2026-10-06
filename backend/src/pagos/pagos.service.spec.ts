import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PagosService } from './pagos.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('stripe', () => ({ __esModule: true, default: jest.fn() }));

describe('Pagos: propiedad y estado del pago', () => {
  const retrieve = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  let service: PagosService;
  beforeEach(() => {
    jest.resetAllMocks();
    (Stripe as unknown as jest.Mock).mockImplementation(() => ({
      checkout: { sessions: { retrieve, create } },
    }));
    service = new PagosService(
      new ConfigService({
        STRIPE_SECRET_KEY: 'sk_test_fake',
        FRONTEND_URL: 'http://localhost:4200',
      }),
      { user: { update } } as unknown as PrismaService,
    );
    retrieve.mockResolvedValue({
      client_reference_id: '7',
      metadata: { planId: 'mensual' },
      payment_status: 'paid',
      status: 'complete',
      customer: 'cus_1',
      subscription: { id: 'sub_1' },
    });
  });
  it.each([
    ['otro usuario', { client_reference_id: '99' }],
    ['no pagado', { payment_status: 'unpaid' }],
    ['incompleto', { status: 'open' }],
    ['cuota desconocida', { metadata: { planId: 'inventada' } }],
  ])('no activa cuota con %s', async (_name, override) => {
    const session = await retrieve();
    retrieve.mockResolvedValue({ ...session, ...override });
    await expect(
      service.confirmCheckoutSession('cs_test', { id: 7 }),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });
  it('activa la cuota únicamente del propietario de un pago completo', async () => {
    await expect(
      service.confirmCheckoutSession('cs_test', { id: 7 }),
    ).resolves.toMatchObject({ planId: 'mensual', monthlyClassLimit: 10 });
    expect(update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        membershipPlan: 'mensual',
        membershipStartedAt: expect.any(Date),
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
      },
    });
  });
  it('calcula el precio en el servidor y vincula el checkout al usuario', async () => {
    create.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
    await service.createCheckoutSession('mensual', {
      id: 7,
      email: 'user@example.com',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: '7',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'eur',
              unit_amount: 3900,
            }),
          }),
        ],
      }),
    );
  });
});
