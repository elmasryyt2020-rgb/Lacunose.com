export const mockSupportThread = {
  id: 'thread1',
  user_id: 'user1',
  ticket_code: 'LNS-0042',
  subject: 'Help',
  status: 'open',
  created_at: new Date().toISOString(),
  last_message_at: new Date().toISOString()
};

export const mockSupportMessages = [
  { id: 'msg1', thread_id: 'thread1', is_user: false, body: 'Hi! How can we help you today?', created_at: new Date().toISOString(), attachments: [] }
];
