import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { LoginComponent } from './login';
import { AuthService } from '../../services/auth/auth.service';
import { LoginResponse } from '../../services/auth/auth.models';

describe('Formulario de login', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let response: Subject<LoginResponse>;
  const login = vi.fn();
  const navigate = vi.fn();
  beforeEach(async () => {
    vi.resetAllMocks();
    response = new Subject<LoginResponse>();
    login.mockReturnValue(response);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: { login } },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });
  function submit(email = 'user@example.com', password = 'Password12345!') {
    fixture.nativeElement.querySelector('#email').value = email;
    fixture.nativeElement.querySelector('#password').value = password;
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
  it('envía el formulario, bloquea el botón y navega al iniciar sesión', () => {
    submit();
    expect(login).toHaveBeenCalledWith('user@example.com', 'Password12345!');
    expect(fixture.nativeElement.querySelector('#submitBtn').disabled).toBe(true);
    response.next({
      user: { id: 7, name: 'User', email: 'user@example.com', role: 'ALUMNO' },
      access_token: '',
    });
    expect(navigate).toHaveBeenCalledWith(['/horarios']);
  });
  it('muestra errores como texto, sin interpretar HTML, y permite reintentar', () => {
    vi.useFakeTimers();
    submit();
    const message = '<img src=x onerror=alert(1)>';
    response.error({ error: { message } });
    const error = fixture.nativeElement.querySelector('#errorContainer');
    expect(error.textContent).toBe(message);
    expect(error.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('#submitBtn').disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    vi.runAllTimers();
  });
  it('no envía campos vacíos', () => {
    vi.useFakeTimers();
    submit('', '');
    expect(login).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#errorContainer').textContent).toContain(
      'completa todos los campos',
    );
    vi.runAllTimers();
  });
});
