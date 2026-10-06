import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';

describe('HTTP: seguridad y funcionamiento (persistencia simulada)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const prisma = {
    clase: { count: jest.fn().mockResolvedValue(3) },
    user: { findUnique: jest.fn() },
    reservation: {
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
    },
  };
  const previousEnv = { ...process.env };
  const token = (role = 'ALUMNO', options = {}) =>
    jwt.sign({ sub: 7, role }, options);

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-never-use-in-production';
    process.env.CORS_ORIGIN = 'http://localhost:4200';
    process.env.NODE_ENV = 'production';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    jwt = app.get(JwtService);
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      name: 'Alumno',
      email: 'alumno@example.com',
      role: 'ALUMNO',
      password: await hash('Password123!', 10),
    });
  });
  afterAll(async () => {
    await app?.close();
    process.env = previousEnv;
  });
  beforeEach(() => jest.clearAllMocks());

  it('responde al health real', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ ok: true, classes: 3 });
  });
  it.each(['/auth/me', '/reservas', '/reservas/mis'])(
    'rechaza anónimos en %s',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(401);
      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    },
  );
  it.each(['invalid', 'expired', 'wrong-secret', 'malformed-cookie'])(
    'rechaza credencial %s',
    async (kind) => {
      const req = request(app.getHttpServer()).get('/reservas/mis');
      if (kind === 'malformed-cookie')
        req.set('Cookie', 'access_token=%E0%A4%A');
      else
        req.set(
          'Authorization',
          `Bearer ${kind === 'expired' ? token('ALUMNO', { expiresIn: -1 }) : kind === 'wrong-secret' ? new JwtService({ secret: 'other-secret' }).sign({ sub: 7 }) : 'invalid'}`,
        );
      await req.expect(401);
      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    },
  );
  it.each(['ALUMNO', 'PROFESOR'])(
    'impide acceso administrativo a %s',
    async (role) => {
      await request(app.getHttpServer())
        .get('/reservas')
        .set('Authorization', `Bearer ${token(role)}`)
        .expect(403);
      await request(app.getHttpServer())
        .delete('/reservas/1')
        .set('Authorization', `Bearer ${token(role)}`)
        .expect(403);
      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
      expect(prisma.reservation.delete).not.toHaveBeenCalled();
    },
  );
  it('permite acceso administrativo con JWT válido', async () => {
    await request(app.getHttpServer())
      .get('/reservas')
      .set('Authorization', `Bearer ${token('ADMIN')}`)
      .expect(200, []);
    expect(prisma.reservation.findMany).toHaveBeenCalled();
  });
  it('acepta cookie y limita mis reservas al usuario autenticado', async () => {
    await request(app.getHttpServer())
      .get('/reservas/mis')
      .set('Cookie', `access_token=${token()}`)
      .expect(200, []);
    expect(prisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7 } }),
    );
  });
  it.each([
    { sessionId: 0 },
    { sessionId: 'bad' },
    { sessionId: 1, userId: 999 },
    { sessionId: 1, role: 'ADMIN' },
  ])('rechaza entrada inválida o suplantación: %j', async (body) => {
    await request(app.getHttpServer())
      .post('/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send(body)
      .expect(400);
  });
  it('CORS permite solo el origen configurado', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://localhost:4200');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:4200',
    );
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    const denied = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://attacker.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('login establece cookie protegida y no expone contraseña ni token en JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'alumno@example.com', password: 'Password123!' })
      .expect(201);
    expect(response.body.user).toEqual({
      id: 7,
      name: 'Alumno',
      email: 'alumno@example.com',
      role: 'ALUMNO',
    });
    expect(response.body.access_token).toBeUndefined();
    const cookie = response.headers['set-cookie'][0];
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/'])
      expect(cookie).toContain(flag);
  });
  it('logout elimina la cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(201);
    expect(response.headers['set-cookie'][0]).toContain('access_token=;');
    expect(response.headers['set-cookie'][0]).toContain(
      'Expires=Thu, 01 Jan 1970',
    );
  });
  it('limita intentos repetidos de login', async () => {
    // Exercise the real short-window guard; malformed input avoids password work.
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'invalid' });
      statuses.push(response.status);
    }
    expect(statuses).toContain(429);
  });
});
