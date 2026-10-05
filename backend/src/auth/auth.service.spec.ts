import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioEstado, UsuarioTipo } from '../usuarios/dto/usuario.enums';

describe('AuthService: credenciales', () => {
  const findUnique = jest.fn();
  const create = jest.fn();
  const sign = jest.fn();
  let service: AuthService;
  const dto = {
    firstName: ' Ana ',
    lastName: ' Pérez ',
    email: 'ANA@example.com',
    password: 'Password12345!',
    belt: 'Blanco',
    beltDegree: 0,
    memberType: UsuarioTipo.ALUMNO,
    status: UsuarioEstado.ACTIVO,
  };
  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuthService(
      { user: { findUnique, create } } as unknown as PrismaService,
      { sign } as unknown as JwtService,
    );
  });
  it('normaliza el registro, guarda un hash verificable y no lo devuelve', async () => {
    findUnique.mockResolvedValue(null);
    create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 7, ...data }),
    );
    const result = await service.register(dto);
    const saved = create.mock.calls[0][0].data;
    expect(saved.email).toBe('ana@example.com');
    expect(saved.name).toBe('Ana Pérez');
    expect(saved.password).not.toBe(dto.password);
    expect(await compare(dto.password, saved.password)).toBe(true);
    expect(result).toEqual({
      id: 7,
      name: 'Ana Pérez',
      email: 'ana@example.com',
      role: 'ALUMNO',
    });
  });
  it('rechaza email duplicado sin escribir', async () => {
    findUnique.mockResolvedValue({ id: 7 });
    await expect(service.register(dto)).rejects.toThrow(
      'El email ya está registrado',
    );
    expect(create).not.toHaveBeenCalled();
  });
  it('usa el mismo error para usuario inexistente y contraseña incorrecta', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.login(dto.email, 'wrong')).rejects.toThrow(
      'Email o contraseña incorrectos',
    );
    findUnique.mockResolvedValue({
      id: 7,
      password: await hash(dto.password, 10),
    });
    await expect(service.login(dto.email, 'wrong')).rejects.toThrow(
      'Email o contraseña incorrectos',
    );
    expect(sign).not.toHaveBeenCalled();
  });
});
