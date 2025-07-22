// app/api/send-invites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email templates
function getPaymentConfirmationEmail(teamLeaderName: string, teamName: string, location: string, mode: string, players: number, groupId: string, firstRiddleId: string) {
  const adventureType = mode === 'date' ? 'Date Day Adventure' : 'Adventure';
  const joinLink = `${process.env.NEXT_PUBLIC_BASE_URL}/join/${groupId}`;
  
  return {
    subject: `Payment confirmed - Your Riddle City adventure awaits!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc2626; margin-bottom: 10px;">🎉 Payment Confirmed!</h1>
          <p style="font-size: 18px; color: #666;">Your Riddle City adventure is ready to begin!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #333; margin-top: 0;">📋 Booking Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 8px;"><strong>Adventure:</strong> ${adventureType} - ${location.charAt(0).toUpperCase() + location.slice(1)}</li>
            <li style="margin-bottom: 8px;"><strong>Team:</strong> ${teamName}</li>
            <li style="margin-bottom: 8px;"><strong>Players:</strong> ${players} people</li>
            <li style="margin-bottom: 8px;"><strong>Booking ID:</strong> ${groupId}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/riddle/${firstRiddleId}" 
             style="display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-bottom: 15px;">
            🎮 Start Your Adventure
          </a>
          <br>
          <a href="${joinLink}" 
             style="display: inline-block; background: #6b7280; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            👥 Share Team Link
          </a>
        </div>
        
        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
          <p style="margin: 0; color: #1e40af;"><strong>💡 Pro Tip:</strong> Share the team link with your friends so they can join your adventure!</p>
        </div>
        
        <p style="color: #666;">Ready to unlock ${location.charAt(0).toUpperCase() + location.slice(1)}'s mysteries?</p>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Best regards,<br>
          <strong>Joe @ Riddle City</strong></p>
          <p>🕵️‍♀️ Puzzle-based adventures through your city<br>
          📍 riddlecity.co.uk</p>
        </div>
      </div>
    `,
    text: `
Payment Confirmed - Your Riddle City Adventure Awaits!

Hi ${teamLeaderName}! 🎉

Your payment has been confirmed and your Riddle City adventure is ready to begin!

Booking Details:
• Adventure: ${adventureType} - ${location.charAt(0).toUpperCase() + location.slice(1)}
• Team: ${teamName}
• Players: ${players} people
• Booking ID: ${groupId}

Start your adventure: ${process.env.NEXT_PUBLIC_BASE_URL}/riddle/${firstRiddleId}
Share with your team: ${joinLink}

Ready to unlock ${location.charAt(0).toUpperCase() + location.slice(1)}'s mysteries?

Best regards,
Joe @ Riddle City
🕵️‍♀️ Puzzle-based adventures through your city
📍 riddlecity.co.uk
    `
  };
}

function getTeamInviteEmail(teamLeaderName: string, teamName: string, location: string, mode: string, groupId: string) {
  const adventureType = mode === 'date' ? 'Date Day Adventure' : 'Adventure';
  const joinLink = `${process.env.NEXT_PUBLIC_BASE_URL}/join/${groupId}`;
  
  return {
    subject: `You're invited to a Riddle City adventure in ${location.charAt(0).toUpperCase() + location.slice(1)}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc2626; margin-bottom: 10px;">🕵️‍♀️ You're Invited!</h1>
          <p style="font-size: 18px; color: #666;">Join an exciting puzzle adventure through ${location.charAt(0).toUpperCase() + location.slice(1)}!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <p style="margin-top: 0;"><strong>${teamLeaderName}</strong> has invited you to join their team for a Riddle City adventure!</p>
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 8px;"><strong>🎮 Adventure:</strong> ${adventureType}</li>
            <li style="margin-bottom: 8px;"><strong>👥 Team:</strong> ${teamName}</li>
            <li style="margin-bottom: 8px;"><strong>📍 Location:</strong> ${location.charAt(0).toUpperCase() + location.slice(1)}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${joinLink}" 
             style="display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            🚀 Join the Adventure
          </a>
        </div>
        
        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
          <p style="margin: 0; color: #1e40af;"><strong>🧩 What is Riddle City?</strong> A puzzle-based adventure where you solve riddles, scan QR codes, and explore your city in a completely new way!</p>
        </div>
        
        <p style="color: #666;">Ready to solve mysteries together?</p>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Best regards,<br>
          <strong>Joe @ Riddle City</strong></p>
          <p>🕵️‍♀️ Puzzle-based adventures through your city<br>
          📍 riddlecity.co.uk</p>
        </div>
      </div>
    `,
    text: `
You're invited to a Riddle City adventure in ${location.charAt(0).toUpperCase() + location.slice(1)}!

Hi there! 👋

${teamLeaderName} has invited you to join their team for an exciting puzzle adventure through ${location.charAt(0).toUpperCase() + location.slice(1)}!

🎮 Adventure: ${adventureType}
👥 Team: ${teamName}
🕵️‍♀️ Ready to solve mysteries together?

Join the adventure: ${joinLink}

What is Riddle City? A puzzle-based adventure where you solve riddles, scan QR codes, and explore your city in a completely new way!

See you on the streets of ${location.charAt(0).toUpperCase() + location.slice(1)}!

Best regards,
Joe @ Riddle City
🕵️‍♀️ Puzzle-based adventures through your city
📍 riddlecity.co.uk
    `
  };
}

export async function POST(request: NextRequest) {
  try {
    const { 
      groupId, 
      teamLeaderEmail, 
      teamLeaderName, 
      teamName, 
      location, 
      mode, 
      players, 
      firstRiddleId, 
      memberEmails 
    } = await request.json();

    // Validate required fields
    if (!groupId || !teamLeaderEmail || !teamName || !location || !mode || !firstRiddleId) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailsSent = [];
    const emailsFailsed = [];

    // Send payment confirmation to team leader
    try {
      const confirmationEmail = getPaymentConfirmationEmail(
        teamLeaderName || 'Team Leader',
        teamName,
        location,
        mode,
        players,
        groupId,
        firstRiddleId
      );

      await transporter.sendMail({
        from: `"Joe @ Riddle City" <${process.env.SMTP_USER}>`,
        to: teamLeaderEmail,
        subject: confirmationEmail.subject,
        text: confirmationEmail.text,
        html: confirmationEmail.html,
      });

      emailsSent.push({ email: teamLeaderEmail, type: 'confirmation' });
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      emailsFailsed.push({ email: teamLeaderEmail, type: 'confirmation', error: error.message });
    }

    // Send invites to team members
    if (memberEmails && Array.isArray(memberEmails)) {
      for (const email of memberEmails) {
        if (email && email.trim() && email !== teamLeaderEmail) {
          try {
            const inviteEmail = getTeamInviteEmail(
              teamLeaderName || 'Your friend',
              teamName,
              location,
              mode,
              groupId
            );

            await transporter.sendMail({
              from: `"Joe @ Riddle City" <${process.env.SMTP_USER}>`,
              to: email.trim(),
              subject: inviteEmail.subject,
              text: inviteEmail.text,
              html: inviteEmail.html,
            });

            emailsSent.push({ email: email.trim(), type: 'invite' });
          } catch (error) {
            console.error(`Failed to send invite to ${email}:`, error);
            emailsFailsed.push({ email: email.trim(), type: 'invite', error: error.message });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent: emailsSent.length,
      emailsFailed: emailsFailsed.length,
      details: {
        sent: emailsSent,
        failed: emailsFailsed
      }
    });

  } catch (error) {
    console.error('Send invites API error:', error);
    return NextResponse.json({ 
      error: 'Failed to send emails' 
    }, { status: 500 });
  }
}