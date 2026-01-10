import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { TourDetailScreen } from '../screens/TourDetailScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { BookingScreen } from '../screens/BookingScreen';
import { TripsScreen } from '../screens/TripsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AIChatScreen } from '../screens/AIChatScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Explore Stack - Tour discovery and booking flow
function ExploreStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="TourDetail" component={TourDetailScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="AIChat" component={AIChatScreen} />
        </Stack.Navigator>
    );
}

// Trips Stack - User's bookings
function TripsStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MyBookings" component={TripsScreen} />
            <Stack.Screen name="TourDetail" component={TourDetailScreen} />
        </Stack.Navigator>
    );
}

// Profile Stack - User profile and settings
function ProfileStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MyProfile" component={ProfileScreen} />
        </Stack.Navigator>
    );
}

// Main Tab Navigator
function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;

                    if (route.name === 'Explore') {
                        iconName = focused ? 'compass' : 'compass-outline';
                    } else if (route.name === 'Trips') {
                        iconName = focused ? 'ticket' : 'ticket-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    } else {
                        iconName = 'alert';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Explore" component={ExploreStack} />
            <Tab.Screen name="Trips" component={TripsStack} />
            <Tab.Screen name="Profile" component={ProfileStack} />
        </Tab.Navigator>
    );
}

// Root Navigator
export function AppNavigator() {
    const { isLoggedIn } = useAuth();

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isLoggedIn ? (
                <Stack.Screen name="Main" component={MainTabs} />
            ) : (
                <Stack.Screen name="Auth" component={LoginScreen} />
            )}
        </Stack.Navigator>
    );
}
