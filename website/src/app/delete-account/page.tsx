export default function DeleteAccount() {
  return (
    <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 20px', fontFamily: 'sans-serif', lineHeight: '1.6', color: '#333' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>Delete Your Account</h1>
      
      <p>
        At Lacunose, we respect your privacy and make it easy for you to control your data.
        If you wish to delete your Lacunose account and all associated data, you have two options:
      </p>

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: '0' }}>Option 1: Delete via the Mobile App (Fastest)</h2>
        <ol style={{ paddingLeft: '20px' }}>
          <li>Open the Lacunose app on your device.</li>
          <li>Log into your account.</li>
          <li>Go to the <strong>Profile / Settings</strong> tab.</li>
          <li>Tap on <strong>Delete account</strong> at the bottom of the screen.</li>
          <li>Type "DELETE" to confirm. Your account and all data will be permanently deleted immediately.</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: '0' }}>Option 2: Email Support</h2>
        <p>
          If you no longer have the app installed, you can request account deletion by emailing our support team.
        </p>
        <ul style={{ paddingLeft: '20px' }}>
          <li>Send an email to <strong>support@lacunose.com</strong></li>
          <li>You <strong>must</strong> send the email from the address associated with your Lacunose account.</li>
          <li>Include the subject line: "Account Deletion Request".</li>
          <li>Our team will process the deletion within 7 days.</li>
        </ul>
      </div>

      <p style={{ marginTop: '30px', fontSize: '0.9rem', color: '#666' }}>
        <strong>Note:</strong> Deleting your account will permanently remove all your gap analyses, saved research, and profile information. 
        If you have an active App Store or Google Play subscription, you must also cancel it in your device settings to prevent future billing.
      </p>
    </div>
  );
}
