import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './db';

// Check if notifications are enabled in settings
const areNotificationsEnabled = (): boolean => {
  const saved = localStorage.getItem('app_notifications');
  return saved !== null ? JSON.parse(saved) : true;
};

// Initialize push notifications
export const initializePushNotifications = async () => {
  try {
    // Request permission
    const result = await PushNotifications.requestPermissions();
    
    if (result.receive === 'granted') {
      await PushNotifications.register();
    }

    // Listen for registration
    await PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Store token for later use with backend
      localStorage.setItem('push_token', token.value);
    });

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Listen for push notifications
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification);
    });

    // Listen for notification taps
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed', notification);
    });
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};

// Send local notification for matches
export const sendMatchNotification = async (
  matchType: 'lost' | 'found',
  itemTitle: string,
  confidence: number
) => {
  if (!areNotificationsEnabled()) {
    console.log('Notifications disabled by user');
    return;
  }

  // Use browser notification if available
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🎯 Potential Match Found!', {
      body: `Your ${matchType} item "${itemTitle}" has a ${confidence}% match!`,
      icon: '/icon.png',
      tag: 'match-notification',
    });
  } else {
    console.log('Match notification:', matchType, itemTitle, confidence);
  }
};

// Request browser notification permission
export const requestNotificationPermission = async () => {
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

    // Send notification to both users
    // In a real app, this would be done via a backend service
    // For now, we'll just log it and show a local notification
    console.log(`Match notification: ${lostUser.username} <-> ${foundUser.username} (${confidence}% match)`);

    // Show local notification if the current user is involved
    const currentUserId = localStorage.getItem('fg_uid');
    if (currentUserId === lostItem.userId) {
      await sendMatchNotification('lost', lostItem.title, confidence);
    } else if (currentUserId === foundItem.userId) {
      await sendMatchNotification('found', foundItem.title, confidence);
    }
  } catch (error) {
    console.error('Error sending match notifications:', error);
  }
};
