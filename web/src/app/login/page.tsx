'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // New state for password visibility and field errors
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ email?: string, password?: string }>({});
    const [isLoaded, setIsLoaded] = useState(false); // For fade-in animation

    useEffect(() => {
        setIsLoaded(true);
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);

    const validateForm = () => {
        const errors: { email?: string, password?: string } = {};
        let isValid = true;

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            errors.email = 'Email inválido';
            isValid = false;
        }

        // Password validation
        if (!password || password.length < 8) {
            errors.password = 'La contraseña debe tener al menos 8 caracteres';
            isValid = false;
        }

        setFieldErrors(errors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Run client-side validation
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const body = isLogin
                ? { email, password }
                : { name, email, password };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Algo salió mal');
            }

            if (isLogin) {
                // Save user to localStorage
                localStorage.setItem('user', JSON.stringify(data.user));

                // Handle Remember Me
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }

                router.push('/');
            } else {
                setSuccess('¡Cuenta creada exitosamente! Por favor inicia sesión.');
                setIsLogin(true);
                setName('');
                setPassword('');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper to determine input border color
    const getInputClass = (fieldName: 'email' | 'password', value: string, error?: string) => {
        const baseClass = "block w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 transition-colors duration-200";

        // Light & Dark mode colors
        const normalState = "bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-green-600 focus:ring-green-600/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:bg-gray-600 dark:focus:border-green-500";
        const errorState = "bg-gray-100 border-red-500 text-gray-900 focus:border-red-600 focus:ring-red-600/20 dark:bg-gray-700 dark:text-white dark:border-red-500";
        const validState = "bg-gray-100 border-green-500 text-gray-900 focus:border-green-600 focus:ring-green-600/20 dark:bg-gray-700 dark:text-white dark:border-green-500";

        if (error) return `${baseClass} ${errorState}`;
        if (value.length > 0) return `${baseClass} ${validState}`;
        return `${baseClass} ${normalState}`;
    };

    const isFormValid = () => {
        if (isLogin) return email.length > 0 && password.length >= 8;
        return name.length > 0 && email.length > 0 && password.length >= 8;
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 dark:bg-[#0a0a0a] sm:px-6 lg:px-8">
            <div
                className={`w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-xl transition-all duration-500 dark:bg-gray-800 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
                <div className="text-center">
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-white">
                        {isLogin ? 'Construction Schedule' : 'Crear una cuenta'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {isLogin ? 'Bienvenido de nuevo, inicia sesión para continuar' : 'Ingresa tus datos para registrarte en la plataforma'}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div
                            className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                            role="alert"
                            aria-live="polite"
                        >
                            {error}
                        </div>
                    )}

                    {success && (
                        <div
                            className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                            role="alert"
                            aria-live="polite"
                        >
                            {success}
                        </div>
                    )}

                    <div className="space-y-5">
                        {!isLogin && (
                            <div className="group">
                                <label htmlFor="name" className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Nombre completo
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required={!isLogin}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:bg-gray-600 dark:focus:border-green-500"
                                    placeholder="Juan Pérez"
                                />
                            </div>
                        )}
                        <div className="group">
                            <label htmlFor="email-address" className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Correo electrónico
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                                }}
                                aria-invalid={fieldErrors.email ? "true" : "false"}
                                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                                className={getInputClass('email', email, fieldErrors.email)}
                                placeholder="tu@ejemplo.com"
                            />
                            {fieldErrors.email && (
                                <p id="email-error" className="mt-1 text-sm text-red-600 font-medium dark:text-red-400" aria-live="polite">
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>
                        <div className="group">
                            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                                    }}
                                    aria-invalid={fieldErrors.password ? "true" : "false"}
                                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                                    className={getInputClass('password', password, fieldErrors.password)}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-green-700 focus:outline-none focus:text-green-700 dark:text-gray-400 dark:hover:text-green-500"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p id="password-error" className="mt-1 text-sm text-red-600 font-medium dark:text-red-400" aria-live="polite">
                                    {fieldErrors.password}
                                </p>
                            )}
                        </div>
                    </div>

                    {isLogin && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600 transition-colors duration-200 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-green-500 dark:ring-offset-gray-800"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                    Recordarme
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-semibold text-green-600 hover:text-green-700 hover:underline transition-all duration-200 dark:text-green-400 dark:hover:text-green-300">
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !isFormValid()}
                            className="group relative flex w-full justify-center rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-green-700 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 dark:bg-green-500 dark:hover:bg-green-600"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="mr-2 -ml-1 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
                                </span>
                            ) : (
                                isLogin ? 'Iniciar sesión' : 'Registrarse'
                            )}
                        </button>
                    </div>

                    <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        {isLogin ? (
                            <p>
                                ¿No tienes cuenta?{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLogin(false);
                                        setError('');
                                        setSuccess('');
                                        setFieldErrors({});
                                    }}
                                    className="font-bold text-green-600 hover:text-green-700 hover:underline transition-all duration-200 dark:text-green-400 dark:hover:text-green-300 focus:outline-none"
                                >
                                    Regístrate
                                </button>
                            </p>
                        ) : (
                            <p>
                                ¿Ya tienes una cuenta?{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLogin(true);
                                        setError('');
                                        setSuccess('');
                                        setFieldErrors({});
                                    }}
                                    className="font-bold text-green-600 hover:text-green-700 hover:underline transition-all duration-200 dark:text-green-400 dark:hover:text-green-300 focus:outline-none"
                                >
                                    Iniciar sesión
                                </button>
                            </p>
                        )}
                    </div>

                    {/* Test credentials hint - only show in login/default */}
                    <div className="mt-8 text-center text-xs text-gray-500 border-t pt-6 border-gray-200 dark:text-gray-500 dark:border-gray-700">
                        <p className="uppercase tracking-wider font-semibold">Credenciales de prueba</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
