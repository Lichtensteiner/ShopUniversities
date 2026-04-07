import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

// Configuration du transporteur d'email pour l'envoi de notifications
// Utilisez vos propres identifiants SMTP (ex: Gmail, SendGrid, Mailgun)
// Pour Gmail, il est recommandé d'utiliser un mot de passe d'application.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || 'votre.email@gmail.com',
    pass: functions.config().email?.pass || 'votre_mot_de_passe_application'
  }
});

/**
 * Fonction déclenchée à chaque création d'un document dans la collection 'attendance'
 * Elle envoie une notification (Email et Push) aux parents de l'élève.
 */
export const onAttendanceCreated = functions.firestore
  .document('attendance/{attendanceId}')
  .onCreate(async (snap, context) => {
    const attendanceData = snap.data();
    const userId = attendanceData.user_id;

    if (!userId) {
      console.log('Pas de user_id dans le document attendance');
      return null;
    }

    try {
      // 1. Récupérer les informations de l'utilisateur (l'élève)
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.log('Utilisateur non trouvé');
        return null;
      }

      const user = userDoc.data();
      
      // On n'envoie des notifications que pour les élèves
      if (user?.role !== 'élève') {
        console.log('L\'utilisateur n\'est pas un élève');
        return null;
      }

      const heureArrivee = attendanceData.heure_arrivee;
      const statut = attendanceData.statut;
      const nomComplet = `${user.prenom} ${user.nom}`;
      
      // Message de la notification
      const message = `Votre enfant ${nomComplet} est arrivé à l'école à ${heureArrivee} (${statut}).`;

      // 2. Créer une notification dans la collection 'notifications' (pour l'historique in-app)
      await admin.firestore().collection('notifications').add({
        user_id: userId,
        type: 'attendance',
        message: message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      // 3. Envoyer un email si l'email du parent (ou de l'élève) est disponible
      // Idéalement, ajoutez un champ 'parent_email' dans le document de l'élève
      const emailDestinataire = user.parent_email || user.email;

      if (emailDestinataire) {
        const mailOptions = {
          from: '"Application Scolaire" <noreply@schoolapp.com>',
          to: emailDestinataire,
          subject: `Notification de présence : ${nomComplet}`,
          text: message,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #4f46e5;">Notification de présence</h2>
              <p>Bonjour,</p>
              <p style="font-size: 16px; background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
                <strong>${message}</strong>
              </p>
              <p>Cordialement,<br>La Direction de l'École</p>
            </div>
          `
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`Email envoyé avec succès à ${emailDestinataire}`);
        } catch (mailError) {
          console.error('Erreur lors de l\'envoi de l\'email:', mailError);
        }
      }

      // 4. Envoyer une notification Push (FCM) si un token d'appareil est disponible
      // Le token FCM doit être enregistré dans le document de l'utilisateur lorsqu'il se connecte sur l'app mobile
      if (user.fcmToken) {
        const payload = {
          notification: {
            title: 'Présence enregistrée',
            body: message,
          },
          token: user.fcmToken
        };

        try {
          await admin.messaging().send(payload);
          console.log(`Notification Push envoyée avec succès pour ${nomComplet}`);
        } catch (fcmError) {
          console.error('Erreur lors de l\'envoi de la notification Push:', fcmError);
        }
      }

      return { success: true };

    } catch (error) {
      console.error('Erreur globale lors du traitement de la notification:', error);
      return null;
    }
  });
