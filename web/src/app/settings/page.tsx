'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [user, setUser] = useState({
        id: 0,
        name: '',
        email: '',
        photoUrl: '', // Placeholder for now
        password: '',
        newPassword: ''
    });

    useEffect(() => {
        // Load user from localStorage or API
        // For now, we'll try to get it from localStorage (auth implementation todo)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(prev => ({ ...prev, ...parsed }));
        } else {
            // Redirect to login if no user found (simple protection)
            router.push('/login');
        }
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUser(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        alert('Funcionalidad en desarrollo');
        return;
        
        // setLoading(true);
        // setMessage({ type: '', text: '' });

        // try {
        //     const res = await fetch('/api/auth/update-profile', {
        //         method: 'PUT',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify(user),
        //     });

        //     const data = await res.json();

        //     if (!res.ok) {
        //         throw new Error(data.message || 'Failed to update profile');
        //     }

        //     setMessage({ type: 'success', text: 'Profile updated successfully!' });

        //     // Update local storage
        //     const updatedUser = { ...user, password: '', newPassword: '' }; // Don't store password
        //     localStorage.setItem('user', JSON.stringify(updatedUser));

        // } catch (error: any) {
        //     setMessage({ type: 'error', text: error.message });
        // } finally {
        //     setLoading(false);
        // }
    };

    return (
        <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => window.location.href = '/'}
              className="mb-4 text-sm text-blue-600 hover:underline"
            >
              ← Volver
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mb-8 dark:text-white">Settings</h1>

            <div className="bg-white shadow rounded-lg dark:bg-gray-800">
                <div className="p-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Profile Information</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update your account's profile information and email address.</p>
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Photo Section (Placeholder UI) */}
                        <div className="flex items-center space-x-6">
                            <div className="shrink-0">
                                {user.photoUrl ? (
                                    <img className="h-16 w-16 object-cover rounded-full" src={user.photoUrl} alt="Current profile photo" />
                                ) : (
                                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-bold">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <label className="block">
                                <span className="sr-only">Choose profile photo</span>
                                <input type="file" className="block w-full text-sm text-slate-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-green-50 file:text-green-700
                                  hover:file:bg-green-100
                                " />
                            </label>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    value={user.name}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3 border"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={user.email}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3 border"
                                />
                            </div>

                            <div className="border-t pt-6 border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            id="newPassword"
                                            placeholder="Leave blank to keep current"
                                            value={user.newPassword}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3 border"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
