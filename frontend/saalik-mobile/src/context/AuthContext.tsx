import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, login as apiLogin, register as apiRegister, getMe } from '../services/api';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            if (token) {
                const userData = await getMe();
                setUser(userData);
            } else {
                // Auto-login for demo
                console.log('No token found, auto-logging in...');
                await login('demo@saalik.com', 'demo123');
            }
        } catch (e) {
            console.log('Failed to load user or token invalid', e);
            // If token invalid, try auto-login
            try {
                await login('demo@saalik.com', 'demo123');
            } catch (err) {
                console.error('Auto-login failed', err);
                await SecureStore.deleteItemAsync('token');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const response = await apiLogin(email, password);
        await SecureStore.setItemAsync('token', response.token);
        setUser(response.user);
    };

    const register = async (email: string, password: string, name: string) => {
        const response = await apiRegister(email, password, name);
        await SecureStore.setItemAsync('token', response.token);
        setUser(response.user);
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isLoggedIn: user !== null,
            login,
            register,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
