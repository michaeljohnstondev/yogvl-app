// FILE: services/emailService.js - Email Notification Service

/**
 * Email Service Integration
 * 
 * This file provides a template for integrating with email services like:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Firebase Extensions (SendGrid, Mailgun)
 * 
 * Choose one based on your needs and implement the actual sending logic.
 */

// EMAIL TEMPLATES
export const EMAIL_TEMPLATES = {
  INVITATION_RECEIVED: 'invitation-received',
  EVENT_UPDATE: 'event-update',
  EVENT_REMINDER: 'event-reminder',
  WELCOME: 'welcome',
};

/**
 * Email template configurations
 */
const EMAIL_CONFIGS = {
  [EMAIL_TEMPLATES.INVITATION_RECEIVED]: {
    subject: 'You\'re invited to {{eventTitle}}!',
    template: 'invitation-received',
    priority: 'high',
  },
  [EMAIL_TEMPLATES.EVENT_UPDATE]: {
    subject: 'Updates to {{eventTitle}}',
    template: 'event-update',
    priority: 'normal',
  },
  [EMAIL_TEMPLATES.EVENT_REMINDER]: {
    subject: 'Reminder: {{eventTitle}} is coming up!',
    template: 'event-reminder',
    priority: 'normal',
  },
  [EMAIL_TEMPLATES.WELCOME]: {
    subject: 'Welcome to Big Vibe Studios!',
    template: 'welcome',
    priority: 'normal',
  },
};

/**
 * Send invitation email
 */
export const sendInvitationEmail = async ({
  recipientEmail,
  recipientName,
  eventData,
  hostData,
  invitationData,
  customMessage = '',
}) => {
  try {
    const templateData = {
      recipientName: recipientName || 'Friend',
      hostName: hostData?.displayName || 'Someone',
      eventTitle: eventData.title,
      eventDate: formatEventDate(eventData.eventTimestamp),
      eventTime: formatEventTime(eventData.eventTimestamp),
      eventLocation: eventData.location,
      eventAddress: eventData.address || '',
      eventDescription: eventData.desc || 'No additional details provided.',
      customMessage,
      acceptUrl: generateAcceptUrl(invitationData.id),
      declineUrl: generateDeclineUrl(invitationData.id),
      appDownloadUrl: getAppDownloadUrl(),
    };

    const emailContent = generateInvitationEmailHTML(templateData);

    const emailRequest = {
      to: recipientEmail,
      subject: `You're invited to ${eventData.title}!`,
      html: emailContent,
      templateData,
    };

    // Choose your email service implementation
    return await sendWithFirebaseExtension(emailRequest);
    // return await sendWithSendGrid(emailRequest);
    // return await sendWithAWSSES(emailRequest);
    // return await sendWithMailgun(emailRequest);

  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
};

/**
 * Send event update email
 */
export const sendEventUpdateEmail = async ({
  recipientEmail,
  recipientName,
  eventData,
  changes,
}) => {
  try {
    const templateData = {
      recipientName: recipientName || 'Friend',
      eventTitle: eventData.title,
      changes: formatChanges(changes),
      eventDate: formatEventDate(eventData.eventTimestamp),
      eventTime: formatEventTime(eventData.eventTimestamp),
      eventLocation: eventData.location,
      viewEventUrl: generateEventUrl(eventData.id),
    };

    const emailContent = generateEventUpdateEmailHTML(templateData);

    const emailRequest = {
      to: recipientEmail,
      subject: `Updates to ${eventData.title}`,
      html: emailContent,
      templateData,
    };

    return await sendWithFirebaseExtension(emailRequest);

  } catch (error) {
    console.error('Error sending event update email:', error);
    throw error;
  }
};

/**
 * Send event reminder email
 */
export const sendEventReminderEmail = async ({
  recipientEmail,
  recipientName,
  eventData,
  reminderType = '24h', // '24h', '2h', '30m'
}) => {
  try {
    const templateData = {
      recipientName: recipientName || 'Friend',
      eventTitle: eventData.title,
      eventDate: formatEventDate(eventData.eventTimestamp),
      eventTime: formatEventTime(eventData.eventTimestamp),
      eventLocation: eventData.location,
      eventAddress: eventData.address || '',
      reminderType,
      viewEventUrl: generateEventUrl(eventData.id),
    };

    const emailContent = generateEventReminderEmailHTML(templateData);

    const emailRequest = {
      to: recipientEmail,
      subject: `Reminder: ${eventData.title} is ${getReminderText(reminderType)}!`,
      html: emailContent,
      templateData,
    };

    return await sendWithFirebaseExtension(emailRequest);

  } catch (error) {
    console.error('Error sending event reminder email:', error);
    throw error;
  }
};

// EMAIL SERVICE IMPLEMENTATIONS

/**
 * Firebase Extension implementation (Recommended for Firebase projects)
 * Install: Firebase Extensions -> Send Email via SendGrid
 */
const sendWithFirebaseExtension = async (emailRequest) => {
  try {
    // This writes to a Firestore collection that triggers the Firebase Extension
    const { addDoc, collection } = await import('firebase/firestore');
    const { db } = await import('../auth/services/firebase');

    await addDoc(collection(db, 'mail'), {
      to: emailRequest.to,
      message: {
        subject: emailRequest.subject,
        html: emailRequest.html,
      },
    });

    console.log('Email queued for delivery via Firebase Extension');
    return { success: true, provider: 'firebase-extension' };

  } catch (error) {
    console.error('Firebase Extension email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * SendGrid implementation (placeholder)
 */
const sendWithSendGrid = async (emailRequest) => {
  try {
    // TODO: Implement SendGrid API integration
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send(emailRequest);

    console.log('SendGrid email sent (placeholder)');
    return { success: true, provider: 'sendgrid' };

  } catch (error) {
    console.error('SendGrid email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * AWS SES implementation (placeholder)
 */
const sendWithAWSSES = async (emailRequest) => {
  try {
    // TODO: Implement AWS SES integration
    // const AWS = require('aws-sdk');
    // const ses = new AWS.SES({ region: 'us-east-1' });
    // await ses.sendEmail(params).promise();

    console.log('AWS SES email sent (placeholder)');
    return { success: true, provider: 'aws-ses' };

  } catch (error) {
    console.error('AWS SES email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mailgun implementation (placeholder)
 */
const sendWithMailgun = async (emailRequest) => {
  try {
    // TODO: Implement Mailgun API integration
    // const mailgun = require('mailgun-js')({
    //   apiKey: process.env.MAILGUN_API_KEY,
    //   domain: process.env.MAILGUN_DOMAIN
    // });
    // await mailgun.messages().send(emailRequest);

    console.log('Mailgun email sent (placeholder)');
    return { success: true, provider: 'mailgun' };

  } catch (error) {
    console.error('Mailgun email error:', error);
    return { success: false, error: error.message };
  }
};

// HELPER FUNCTIONS

const formatEventDate = (timestamp) => {
  if (!timestamp) return 'Date TBD';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatEventTime = (timestamp) => {
  if (!timestamp) return 'Time TBD';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatChanges = (changes) => {
  return changes.map(change => `• ${change}`).join('\n');
};

const getReminderText = (reminderType) => {
  switch (reminderType) {
    case '24h': return 'tomorrow';
    case '2h': return 'in 2 hours';
    case '30m': return 'in 30 minutes';
    default: return 'soon';
  }
};

const generateAcceptUrl = (invitationId) => {
  // TODO: Replace with your actual app URLs
  return `https://your-app.com/accept-invitation/${invitationId}`;
};

const generateDeclineUrl = (invitationId) => {
  // TODO: Replace with your actual app URLs
  return `https://your-app.com/decline-invitation/${invitationId}`;
};

const generateEventUrl = (eventId) => {
  // TODO: Replace with your actual app URLs
  return `https://your-app.com/events/${eventId}`;
};

const getAppDownloadUrl = () => {
  // TODO: Replace with your actual app store URLs
  return 'https://your-app.com/download';
};

// EMAIL TEMPLATES (HTML)

const generateInvitationEmailHTML = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Invitation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background-color: #000; color: #fff; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a, #2d2d2d); border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #00bfff, #8a2be2); padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 30px; }
        .event-details { background: #2d2d2d; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; align-items: center; margin-bottom: 12px; }
        .detail-icon { margin-right: 12px; font-size: 18px; }
        .buttons { text-align: center; margin: 30px 0; }
        .button { display: inline-block; padding: 12px 24px; margin: 0 10px; border-radius: 6px; text-decoration: none; font-weight: bold; }
        .accept { background: #00ff88; color: #000; }
        .decline { background: transparent; color: #ff4444; border: 2px solid #ff4444; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 You're Invited!</h1>
        </div>
        
        <div class="content">
          <p>Hey ${data.recipientName}!</p>
          
          <p>${data.hostName} has invited you to join an awesome event:</p>
          
          <div class="event-details">
            <h2>${data.eventTitle}</h2>
            
            <div class="detail-row">
              <span class="detail-icon">📅</span>
              <span>${data.eventDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-icon">⏰</span>
              <span>${data.eventTime}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-icon">📍</span>
              <span>${data.eventLocation}</span>
            </div>
            
            ${data.eventAddress ? `
            <div class="detail-row">
              <span class="detail-icon">🏠</span>
              <span>${data.eventAddress}</span>
            </div>
            ` : ''}
            
            <p style="margin-top: 16px; line-height: 1.5;">${data.eventDescription}</p>
            
            ${data.customMessage ? `
            <div style="background: #1a1a1a; border-left: 4px solid #00bfff; padding: 16px; margin-top: 16px; border-radius: 4px;">
              <strong>Personal message from ${data.hostName}:</strong>
              <p style="margin: 8px 0 0 0; font-style: italic;">"${data.customMessage}"</p>
            </div>
            ` : ''}
          </div>
          
          <div class="buttons">
            <a href="${data.acceptUrl}" class="button accept">✅ Accept Invitation</a>
            <a href="${data.declineUrl}" class="button decline">❌ Decline</a>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${data.appDownloadUrl}" style="color: #00bfff;">Download Big Vibe Studios App</a> for the best experience!
          </p>
        </div>
        
        <div class="footer">
          <p>Big Vibe Studios - Where Great Events Happen</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateEventUpdateEmailHTML = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Update</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background-color: #000; color: #fff; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a, #2d2d2d); border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #ffa500, #ff6347); padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 30px; }
        .changes { background: #2d2d2d; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; margin: 20px 0; border-radius: 6px; text-decoration: none; font-weight: bold; background: #00bfff; color: #000; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📝 Event Update</h1>
        </div>
        
        <div class="content">
          <p>Hey ${data.recipientName}!</p>
          
          <p>There have been some updates to <strong>${data.eventTitle}</strong>:</p>
          
          <div class="changes">
            <h3>What changed:</h3>
            <pre style="white-space: pre-wrap; line-height: 1.5;">${data.changes}</pre>
          </div>
          
          <p><strong>Event Details:</strong></p>
          <p>📅 ${data.eventDate}<br>
             ⏰ ${data.eventTime}<br>
             📍 ${data.eventLocation}</p>
          
          <div style="text-align: center;">
            <a href="${data.viewEventUrl}" class="button">View Event Details</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Big Vibe Studios - Where Great Events Happen</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateEventReminderEmailHTML = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Reminder</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background-color: #000; color: #fff; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a, #2d2d2d); border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #32cd32, #00ff88); padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; color: #000; }
        .content { padding: 30px; }
        .event-info { background: #2d2d2d; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; margin: 20px 0; border-radius: 6px; text-decoration: none; font-weight: bold; background: #00bfff; color: #000; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Event Reminder</h1>
        </div>
        
        <div class="content">
          <p>Hey ${data.recipientName}!</p>
          
          <p>Just a friendly reminder that <strong>${data.eventTitle}</strong> is coming up soon!</p>
          
          <div class="event-info">
            <h3>${data.eventTitle}</h3>
            <p>📅 ${data.eventDate}<br>
               ⏰ ${data.eventTime}<br>
               📍 ${data.eventLocation}</p>
            
            ${data.eventAddress ? `<p>🏠 ${data.eventAddress}</p>` : ''}
          </div>
          
          <p>We're excited to see you there! 🎉</p>
          
          <div style="text-align: center;">
            <a href="${data.viewEventUrl}" class="button">View Event Details</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Big Vibe Studios - Where Great Events Happen</p>
        </div>
      </div>
    </body>
    </html>
  `;
};