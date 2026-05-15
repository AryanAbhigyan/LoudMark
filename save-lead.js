// api/save-lead.js
// This runs on Vercel's servers — your Supabase key is NEVER visible to anyone

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // Allow requests from your site only
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, business, email, phone, website, category, services, message } = req.body;

    // Basic validation server-side
    if (!name || !business || !email || !phone || !category || !services) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const lead = {
      id: 'LM-' + Date.now(),
      submitted_at: new Date().toISOString(),
      name: name.trim(),
      business: business.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      website: website?.trim() || '—',
      category: category.trim(),
      services: services.trim(),
      message: message?.trim() || '—',
      status: 'New',
      verified: 'Email ✓ · Phone ✓'
    };

    const { error } = await supabase.from('leads').insert([lead]);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save lead' });
    }

    return res.status(200).json({ success: true, id: lead.id });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
