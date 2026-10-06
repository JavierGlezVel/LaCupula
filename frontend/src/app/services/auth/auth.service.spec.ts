import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../../core/api/api.config';

describe('AuthService', () => {
  let http: HttpTestingController;
  const user = { id: 7, name: 'Alumno', email: 'user@example.com', role: 'ALUMNO' };
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });
  it.each(['invalid json', '{}', 'null'])('descarta almacenamiento corrupto: %s', (value) => {
    localStorage.setItem('current_user', value);
    const service = TestBed.inject(AuthService);
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('current_user')).toBeNull();
  });
  it('login envía credenciales y guarda el usuario sin token', () => {
    const service = TestBed.inject(AuthService);
    service.login(user.email, 'Password123!').subscribe();
    const req = http.expectOne(`${API_BASE_URL}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ email: user.email, password: 'Password123!' });
    req.flush({ user });
    expect(service.getCurrentUser()).toEqual(user);
    expect(JSON.parse(localStorage.getItem('current_user')!)).toEqual(user);
    expect(localStorage.getItem('access_token')).toBeNull();
  });
  it('un login rechazado no crea sesión', () => {
    const service = TestBed.inject(AuthService);
    service.login(user.email, 'wrong').subscribe({ error: () => {} });
    http
      .expectOne(`${API_BASE_URL}/auth/login`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('current_user')).toBeNull();
  });
  it('logout limpia la sesión local incluso si falla la red', () => {
    localStorage.setItem('current_user', JSON.stringify(user));
    localStorage.setItem('access_token', 'old-token');
    const service = TestBed.inject(AuthService);
    service.logout().subscribe({ error: () => {} });
    const req = http.expectOne(`${API_BASE_URL}/auth/logout`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({}, { status: 500, statusText: 'Server error' });
    expect(service.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('current_user')).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
