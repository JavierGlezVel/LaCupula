import { ReservasService } from './reservas.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Reservas: integridad de las reglas de negocio', () => {
  let service: ReservasService;
  let prisma: any;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-05T09:00:00'));
    prisma = {
      session: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 1,
            date: new Date('2026-10-06T00:00:00Z'),
            startTime: '18:00',
            maxCapacity: 2,
            schedule: { maxCapacity: 20 },
          }),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            membershipPlan: 'mensual',
            membershipStartedAt: new Date('2026-10-01T00:00:00'),
          }),
      },
      reservation: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockResolvedValue({ id: 10, sessionId: 1, userId: 7 }),
        delete: jest.fn().mockResolvedValue({ id: 10 }),
      },
      eventReservation: { count: jest.fn().mockResolvedValue(0) },
    };
    service = new ReservasService(prisma as PrismaService);
  });
  afterEach(() => jest.useRealTimers());
  it('reserva una plaza disponible', async () => {
    await expect(service.create(1, 7)).resolves.toMatchObject({
      sessionId: 1,
      userId: 7,
    });
    expect(prisma.reservation.create).toHaveBeenCalledWith({
      data: { sessionId: 1, userId: 7 },
    });
  });
  it.each([
    [
      'sesión inexistente',
      'Sesion no encontrada',
      (p: any) => p.session.findUnique.mockResolvedValue(null),
    ],
    [
      'duplicado',
      'Ya tienes una reserva',
      (p: any) => p.reservation.findUnique.mockResolvedValue({ id: 10 }),
    ],
    [
      'sin cuota',
      'Necesitas una cuota activa',
      (p: any) => p.user.findUnique.mockResolvedValue(null),
    ],
    [
      'cupo lleno',
      'No hay cupo',
      (p: any) =>
        p.reservation.count.mockImplementation(({ where }: any) =>
          Promise.resolve(where.sessionId ? 2 : 0),
        ),
    ],
    [
      'cuota agotada contando eventos',
      'No te quedan asistencias',
      (p: any) => {
        p.reservation.count.mockResolvedValue(8);
        p.eventReservation.count.mockResolvedValue(2);
      },
    ],
    [
      'cuota caducada',
      'caducidad',
      (p: any) =>
        p.user.findUnique.mockResolvedValue({
          membershipPlan: 'mensual',
          membershipStartedAt: new Date('2026-09-01'),
        }),
    ],
    [
      'clase pasada',
      'ya ha empezado',
      (p: any) =>
        p.session.findUnique.mockResolvedValue({
          date: new Date('2026-10-04'),
          startTime: '18:00',
        }),
    ],
    [
      'fuera de semana',
      'esta semana',
      (p: any) =>
        p.session.findUnique.mockResolvedValue({
          date: new Date('2026-10-12'),
          startTime: '18:00',
        }),
    ],
  ])('rechaza %s sin escribir', async (_name, message, setup) => {
    setup(prisma);
    await expect(service.create(1, 7)).rejects.toThrow(message);
    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });
  it('cancelación busca exclusivamente la reserva del usuario', async () => {
    prisma.reservation.findUnique.mockResolvedValue({ id: 10 });
    await service.cancelForUser(1, 7);
    expect(prisma.reservation.findUnique).toHaveBeenCalledWith({
      where: { sessionId_userId: { sessionId: 1, userId: 7 } },
    });
    expect(prisma.reservation.delete).toHaveBeenCalledWith({
      where: { id: 10 },
    });
  });
  it('no cancela una reserva ajena o inexistente', async () => {
    await expect(service.cancelForUser(1, 7)).rejects.toThrow(
      'No tienes una reserva',
    );
    expect(prisma.reservation.delete).not.toHaveBeenCalled();
  });
});
