import React, { createContext, useState, useContext, ReactNode } from 'react';

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
    isLoggedIn: boolean;
    login: () => void;
    logout: () => void;
    savedPlans: ExperiencePlan[];
    savePlan: (plan: ExperiencePlan) => void;
    memories: Memory[];
    addMemory: (memory: Memory) => void;
    toggleLike: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock Data
const MOCK_MEMORIES: Memory[] = [
    {
        id: '1',
        uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop',
        caption: 'Exploring the hidden waterfalls of Bali. The sound of nature is healing. 🌿💧 #Bali #Nature',
        date: '2 hours ago',
        type: 'image',
        likes: 124,
        isLiked: false,
        user: {
            name: 'Explorer',
            avatar: 'https://i.pravatar.cc/150?u=saalik',
            handle: '@explorer_one',
        },
    },
    {
        id: '2',
        uri: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop',
        caption: 'Tokyo at night is a different world entirely. Neon dreams. 🌃✨ #Tokyo #Travel',
        date: '5 hours ago',
        type: 'image',
        likes: 89,
        isLiked: true,
        user: {
            name: 'Explorer',
            avatar: 'https://i.pravatar.cc/150?u=saalik',
            handle: '@explorer_one',
        },
    },
    {
        id: '3',
        uri: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop',
        caption: 'Swiss Alps hiking adventure. The view from the top makes it all worth it. 🏔️🇨🇭',
        date: '1 day ago',
        type: 'image',
        likes: 256,
        isLiked: false,
        user: {
            name: 'Explorer',
            avatar: 'https://i.pravatar.cc/150?u=saalik',
            handle: '@explorer_one',
        },
    },
];

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [savedPlans, setSavedPlans] = useState<ExperiencePlan[]>([]);
    const [memories, setMemories] = useState<Memory[]>(MOCK_MEMORIES);

    const login = () => setIsLoggedIn(true);
    const logout = () => {
        setIsLoggedIn(false);
        setSavedPlans([]); // Optional: clear data on logout
        // We keep memories for demo purposes or reset to mock
        setMemories(MOCK_MEMORIES);
    };

    const savePlan = (plan: ExperiencePlan) => {
        // Avoid duplicates based on headline/theme
        setSavedPlans((prev) => {
            if (prev.some(p => p.headline === plan.headline)) return prev;
            return [plan, ...prev];
        });
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
            isLoggedIn,
            login,
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
