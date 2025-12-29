import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, login as apiLogin, register as apiRegister, getMe, getSavedPlans, savePlan as apiSavePlan } from '../services/api';
import type { ExperiencePlan } from '../types/api';

export interface Memory {
    id: string;
    uri: string;
    caption: string;
    date: string;
    type: 'image' | 'video';
    likes: number;
    isLiked: boolean;
    user: {
        name: string;
        avatar: string;
        handle: string;
    };
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isLoggedIn: boolean; // Added for AppNavigator
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    savedPlans: ExperiencePlan[];
    savePlan: (plan: ExperiencePlan) => Promise<void>;
    memories: Memory[];
    addMemory: (memory: Memory) => void;
    toggleLike: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock Memories (kept for demo visuals)
const MOCK_MEMORIES: Memory[] = [
    {
        id: '1',
        uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop',
        caption: 'Exploring the hidden waterfalls of Bali. The sound of nature is healing. 🌿💧 #Bali #Nature',
        date: '2 hours ago',
        type: 'image',
        likes: 124,
        isLiked: false,
        user: { name: 'Explorer', avatar: 'https://i.pravatar.cc/150?u=saalik', handle: '@explorer_one' },
    },
    {
        id: '2',
        uri: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop',
        caption: 'Tokyo at night is a different world entirely. Neon dreams. 🌃✨ #Tokyo #Travel',
        date: '5 hours ago',
        type: 'image',
        likes: 89,
        isLiked: true,
        user: { name: 'Explorer', avatar: 'https://i.pravatar.cc/150?u=saalik', handle: '@explorer_one' },
    },
];

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [savedPlans, setSavedPlans] = useState<ExperiencePlan[]>([]);
    const [memories, setMemories] = useState<Memory[]>(MOCK_MEMORIES);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            if (token) {
                const userData = await getMe();
                setUser(userData);
                loadPlans();
            } else {
                // Auto-login if no token (Bypass Login Screen)
                console.log('No token found, auto-logging in...');
                await login('demo@saalik.ai', 'demo');
            }
        } catch (e) {
            console.log('Failed to load user or token invalid', e);
            // If token invalid, try to re-login automatically
            try {
                await login('demo@saalik.ai', 'demo');
            } catch (err) {
                console.error('Auto-login failed', err);
                await SecureStore.deleteItemAsync('token');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loadPlans = async () => {
        try {
            const plans = await getSavedPlans();
            setSavedPlans(plans);
        } catch (e) {
            console.warn('Failed to load plans', e);
        }
    };

    const login = async (email: string, password: string) => {
        const response = await apiLogin(email, password);
        await SecureStore.setItemAsync('token', response.token);
        setUser(response.user);
        await loadPlans();
    };

    const register = async (email: string, password: string, name: string) => {
        const response = await apiRegister(email, password, name);
        await SecureStore.setItemAsync('token', response.token);
        setUser(response.user);
        await loadPlans();
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('token');
        setUser(null);
        setSavedPlans([]);
        setMemories(MOCK_MEMORIES);
    };

    const savePlan = async (plan: ExperiencePlan) => {
        // Optimistic update
        setSavedPlans((prev) => [plan, ...prev]);
        try {
            await apiSavePlan(plan);
        } catch (e) {
            console.error('Failed to save plan remote', e);
            // Revert or retry logic could go here
        }
    };

    const addMemory = (memory: Memory) => {
        setMemories((prev) => [memory, ...prev]);
    };

    const toggleLike = (id: string) => {
        setMemories(prev => prev.map(mem => {
            if (mem.id === id) {
                return {
                    ...mem,
                    isLiked: !mem.isLiked,
                    likes: mem.isLiked ? mem.likes - 1 : mem.likes + 1
                };
            }
            return mem;
        }));
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isLoggedIn: user !== null, // Derived from user state
            login,
            register,
            logout,
            savedPlans,
            savePlan,
            memories,
            addMemory,
            toggleLike
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
