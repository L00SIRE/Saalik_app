import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { UploadScreen } from '../screens/UploadScreen';
import { FeaturedPlanScreen } from '../screens/FeaturedPlanScreen';
import { GuideRequestScreen } from '../screens/GuideRequestScreen';
import { JourneyScreen } from '../screens/JourneyScreen';
import { TripsScreen } from '../screens/TripsScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons'; // Assuming Expo, otherwise use another icon lib

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Plan" component={PlanScreen} />
            <Stack.Screen name="FeaturedPlan" component={FeaturedPlanScreen} />
            <Stack.Screen name="GuideRequest" component={GuideRequestScreen} />
            <Stack.Screen name="Journey" component={JourneyScreen} />
        </Stack.Navigator>
    );
}

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
                tabBarActiveTintColor: colors.accent,
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
            <Tab.Screen name="Explore" component={HomeStack} />
            <Tab.Screen name="Trips" component={TripsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

export function AppNavigator() {
    const { isLoggedIn } = useAuth();

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isLoggedIn ? (
                <>
                    <Stack.Screen name="Main" component={MainTabs} />
                    <Stack.Screen name="Upload" component={UploadScreen} options={{ presentation: 'modal' }} />
                </>
            ) : (
                <Stack.Screen name="Auth" component={LoginScreen} />
            )}
        </Stack.Navigator>
    );
}
