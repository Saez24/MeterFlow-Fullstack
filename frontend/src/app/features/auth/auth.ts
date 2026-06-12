import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '../../core/services/supabase.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSnackBarModule,],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',

})
export class Auth {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly mode = signal<AuthMode>('login');
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: [''],
  });

  protected readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.value
  });

  toggleMode(): void {
    this.mode.update(m => m === 'login' ? 'register' : 'login');
    this.errorMessage.set('');
    this.form.reset();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    const { email, password, confirmPassword } = this.form.value;

    if (this.mode() === 'register' && password !== confirmPassword) {
      this.errorMessage.set($localize`:@@auth.error.passwordMismatch:Passwörter stimmen nicht überein`);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      if (this.mode() === 'login') {
        const { error } = await this.supabase.signIn(email!, password!);
        if (error) throw error;
        this.router.navigate(['/dashboard']);
      } else {
        const { error } = await this.supabase.signUp(email!, password!);
        if (error) throw error;
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.errorMessage.set(this.translateError(err.message));
    } finally {
      this.loading.set(false);
    }
  }

  private translateError(msg: string): string {
    if (msg.includes('Invalid login credentials') || msg.includes('Incorrect email or password')) return $localize`:@@auth.error.invalidCredentials:E-Mail oder Passwort falsch`;
    if (msg.includes('already registered') || msg.includes('already exists')) return $localize`:@@auth.error.alreadyRegistered:Diese E-Mail ist bereits registriert`;
    if (msg.includes('Password should be') || msg.includes('password')) return $localize`:@@auth.error.passwordTooShort:Passwort muss mindestens 6 Zeichen haben`;
    return msg || $localize`:@@auth.error.generic:Ein Fehler ist aufgetreten. Bitte versuche es erneut.`;
  }
}
