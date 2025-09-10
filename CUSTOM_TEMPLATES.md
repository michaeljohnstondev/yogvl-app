# Custom Notification Templates

## Overview

Custom notification templates allow users to create reusable reminder timings that persist across events. When a user creates a custom template (e.g., "30 minutes before"), it's automatically saved for future use.

## How It Works

### 1. Template Creation
- Users can create custom templates in the notification settings form
- Custom templates are identified by IDs starting with `custom_`
- Templates include: `amount`, `unit`, `label`, and `enabled` state

### 2. Automatic Persistence
- When users add custom templates, they're automatically saved to user preferences
- Saved location: `users/{userId}/userdata/settings/notifications/customTemplates`
- Custom templates merge with default templates for display

### 3. Template Reuse
- Saved custom templates appear in notification settings for all future events
- Users can enable/disable templates per event
- Long-press allows deletion of custom templates (not defaults)

## Implementation Files

### Core Service
- `src/services/CustomTemplateService.js` - Main persistence logic

### UI Components
- `src/components/notifications/GuestNotificationSettingsForm.js` - Template management UI
- `src/screens/EventNotificationSettingsScreen.js` - Settings screen integration

### Integration Points
- Templates are loaded when the notification form opens
- New custom templates are saved automatically when created
- "Save as Defaults" also saves custom templates to user preferences

## Database Structure

```javascript
users/{userId}/userdata/settings/notifications/customTemplates: [
  {
    id: "custom_1757455722183",
    amount: 30,
    unit: "minutes", 
    label: "30 min",
    enabled: true,
    savedAt: "2025-01-09T..."
  }
]
```

## Benefits

1. **User Experience**: Templates persist across events automatically
2. **No Duplication**: System prevents duplicate templates based on amount/unit
3. **Flexible Management**: Users can create, use, and delete custom templates
4. **Seamless Integration**: Works with existing notification scheduling system

## Testing

To test custom template persistence:

1. Create an event and go to notification settings
2. Add a custom template (e.g., "45 minutes before")
3. Create another event
4. Verify the custom template appears in the new event's notification settings
5. Test enabling/disabling and deletion functionality