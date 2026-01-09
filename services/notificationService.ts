import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { api } from './db';
import { Toast } from '@capacitor/toast';

// Check if notifications are enabled in settings
const areNotificationsEnabled = (): boolean => {
    const saved = localStorage.getItem('app_notifications');
    return saved !== null ? JSON.parse(saved) : true;
};

// Show toast message (works on both web and native)
export const showToast = async (message: string, duration: 'short' | 'long' = 'long') => {
    if (Capacitor.isNativePlatform()) {
        await Toast.show({
            text: message,
            duration: duration,
            position: 'bottom'
        });
    } else {
        // Web fallback - create a simple toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-brand-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration === 'short' ? 2000 : 3500);
    }
};

// Initialize push notifications
export const initializePushNotifications = async () => {
    if (!Capacitor.isNativePlatform()) {
        console.log('Push notifications only work on native platforms');
        return;
    }

    try {
        // Request permission
        const result = await PushNotifications.requestPermissions();

        if (result.receive === 'granted') {
            await PushNotifications.register();
        }

        // Listen for registration
        await PushNotifications.addListener('registration', (token: Token) => {
            console.log('Push registration success, token: ' + token.value);
            localStorage.setItem('push_token', token.value);
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Listen for push notifications received
        await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
            console.log('Push notification received: ', notification);
            // Show toast when notification is received while app is open
            showToast(notification.body || 'New notification');
        });

        // Listen for notification taps
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
            console.log('Push notification action performed', notification);
            // Navigate to matches page when notification is tapped
            window.location.hash = '#/matches';
        });
    } catch (error) {
        console.error('Error initializing push notifications:', error);
    }
};

// Send local notification (works on device)
export const sendLocalNotification = async (
    title: string,
    body: string,
    id?: number
) => {
    if (!areNotificationsEnabled()) {
        console.log('Notifications disabled by user');
        return;
    }

    if (Capacitor.isNativePlatform()) {
        try {
            // Request permission first
            const permission = await LocalNotifications.requestPermissions();
            if (permission.display !== 'granted') {
                console.log('Local notification permission not granted');
                return;
            }

            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body,
                        id: id || Date.now(),
                        schedule: { at: new Date(Date.now() + 100) },
                        sound: 'default',
                        smallIcon: 'ic_stat_icon_config_sample',
                        actionTypeId: '',
                        extra: null
                    }
                ]
            });
        } catch (error) {
            console.error('Error sending local notification:', error);
        }
    } else {
        // Web notification fallback
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/icon.png',
                tag: 'match-notification',
            });
        }
    }
};

// Send match notification to both users
export const sendMatchNotification = async (
    matchType: 'lost' | 'found',
    itemTitle: string,
    confidence: number
) => {
    if (!areNotificationsEnabled()) {
        console.log('Notifications disabled by user');
        return;
    }

    const title = '🎯 Potential Match Found!';
    const body = `Your ${matchType} item "${itemTitle}" has a ${confidence}% match!`;

    // Send local notification
    await sendLocalNotification(title, body);

    // Also show toast for immediate feedback
    await showToast(body);
};

// Request browser notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
        const result = await PushNotifications.requestPermissions();
        return result.receive === 'granted';
    }

    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

// Notify both users when a match is created
export const notifyMatch = async (
    lostItemId: string,
    foundItemId: string,
    confidence: number
) => {
    if (!areNotificationsEnabled()) return;

    try {
        const lostItem = await api.items.getById(lostItemId);
        const foundItem = await api.items.getById(foundItemId);

        if (!lostItem || !foundItem) return;

        // Get users
        const lostUser = await api.users.get(lostItem.userId);
        const foundUser = await api.users.get(foundItem.userId);

        if (!lostUser || !foundUser) return;

        console.log(`Match notification: ${lostUser.username} <-> ${foundUser.username} (${confidence}% match)`);

        // Show notification and toast to current user
        const currentUserId = localStorage.getItem('fg_uid');

        if (currentUserId === lostItem.userId) {
            await sendMatchNotification('lost', lostItem.title, confidence);
        } else if (currentUserId === foundItem.userId) {
            await sendMatchNotification('found', foundItem.title, confidence);
        }

        // In a real app, you would also send push notifications via a backend service
        // to notify the other user who might not be currently using the app
    } catch (error) {
        console.error('Error sending match notifications:', error);
    }
};

// Notify exchange status
export const notifyExchange = async (
    type: 'item_given' | 'item_taken' | 'exchange_complete' | 'exchange_expired',
    itemTitle: string
) => {
    if (!areNotificationsEnabled()) return;

    let title = '';
    let body = '';

    switch (type) {
        case 'item_given':
            title = '📦 Item Given';
            body = `The founder has marked "${itemTitle}" as given. Please confirm within 5 minutes.`;
            break;
        case 'item_taken':
            title = '✅ Item Taken';
            body = `You have confirmed receiving "${itemTitle}". Thank you!`;
            break;
        case 'exchange_complete':
            title = '🎉 Exchange Complete';
            body = `The exchange for "${itemTitle}" has been completed successfully!`;
            break;
        case 'exchange_expired':
            title = '⚠️ Exchange Expired';
            body = `The exchange for "${itemTitle}" was not confirmed in time.`;
            break;
    }

    await sendLocalNotification(title, body);
    await showToast(body);
};
