import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { authGuard, publicGuard } from './auth.guard';
import { AuthService } from '../../services/auth/auth.service';

describe('Navegación según sesión', () => {
  const navigate = vi.fn();
  const isAuthenticated = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: AuthService, useValue: { isAuthenticated } },
      ],
    });
  });
  it.each([
    [authGuard, false, false, '/login'],
    [authGuard, true, true, null],
    [publicGuard, true, false, '/horarios'],
    [publicGuard, false, true, null],
  ])('protege la navegación (sesión: %s)', (guard, authenticated, allowed, redirect) => {
    isAuthenticated.mockReturnValue(authenticated);
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(result).toBe(allowed);
    if (redirect) expect(navigate).toHaveBeenCalledWith([redirect]);
    else expect(navigate).not.toHaveBeenCalled();
  });
});
