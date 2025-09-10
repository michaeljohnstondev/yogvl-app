# Custom Notification Timing Debug

## 🤔 **WHAT MIGHT BE HAPPENING**

### **Scenario 1: Correct Behavior (might be confusing)**
- **Current Time**: 4:00 PM
- **You Create Event**: For 4:30 PM (30 minutes from now)
- **Custom Template**: "30 minutes before event"
- **Expected Reminder Time**: 4:00 PM (which is NOW!)
- **Result**: ✅ Notification fires immediately (this is CORRECT!)

### **Scenario 2: Incorrect Behavior (actual bug)**  
- **Current Time**: 4:00 PM
- **You Create Event**: For 5:00 PM (60 minutes from now)
- **Custom Template**: "30 minutes before event"
- **Expected Reminder Time**: 4:30 PM (30 minutes from now)
- **Result**: ❌ Notification fires immediately (this is WRONG!)

## 🧪 **TEST CASES TO VERIFY**

### **Test 1: Create event far in future**
```javascript
// Event: 2 hours from now (6:00 PM)
// Template: 30 minutes before 
// Expected: Notification at 5:30 PM
// Should NOT fire immediately
```

### **Test 2: Create event close in future**
```javascript  
// Event: 30 minutes from now (4:30 PM)
// Template: 30 minutes before
// Expected: Notification NOW (4:00 PM)
// SHOULD fire immediately
```

### **Test 3: Create event very close**
```javascript
// Event: 10 minutes from now (4:10 PM) 
// Template: 30 minutes before
// Expected: No notification (reminder time is in the past)
// Should NOT fire at all
```

## 🔍 **DEBUG QUESTIONS**

1. **When you tested**: 
   - How far in the future was your event?
   - What was your custom template timing?

2. **Expected vs Actual**:
   - Did you expect notification "30 minutes from now"?
   - Or did you expect notification "30 minutes before event"?

## 🐛 **POTENTIAL ISSUES TO CHECK**

### **Issue 1: Timezone Problems**
- Event time stored in wrong timezone
- Notification scheduler using different timezone

### **Issue 2: Time Conversion Bugs**
- Firestore Timestamp not converting properly
- JavaScript Date constructor issues

### **Issue 3: Logic Error**
- Math calculation wrong (should be: `eventTime - reminderMinutes`)
- Comparison logic reversed

### **Issue 4: Template Data Corruption**
- Custom template minutes value wrong
- Template enabled/disabled state incorrect

## 🔧 **NEXT STEPS**

1. **Add Debug Logging** ✅ (Done)
2. **Test Specific Scenario**: Create event 2+ hours in future with 30min template
3. **Check Console Logs**: Look for timing calculations
4. **Verify Expected Behavior**: Clarify when notification should fire

The debug logging I added will show:
- Raw event start time
- Converted event start time  
- Current time
- Minutes until event
- Reminder calculation for each template
- Scheduled notification timing

Run a test and check the console output!