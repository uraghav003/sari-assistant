const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deployRealHierarchy() {
  const teamConfig = {
    system_name: 'SARI Sovereign AI',
    owner: 'Maalik',
    organization: 'Divyanshi Capital',
    agents: [
      {
        name: 'SARI',
        role: 'Master Sovereign AI',
        status: 'ACTIVE',
        capabilities: ['Executive Control', 'Workflow Builder', 'Multi-Agent Orchestration']
      },
      {
        name: 'LAILA',
        role: 'System Auditor & Policy Controller',
        status: 'ACTIVE',
        capabilities: ['Audit Trail Logging', 'Financial Data Protection', 'Zero-Trust Gatekeeping']
      },
      {
        name: 'BULBUL',
        role: 'Operations & Reporting Analyst',
        status: 'ACTIVE',
        capabilities: ['Lead Intake Ingestion', 'Telegram / WhatsApp Routing', 'Daily Operations Digest']
      }
    ],
    updated_at: new Date().toISOString()
  };

  console.log("Deploying SARI Agent Hierarchy (SARI, LAILA, BULBUL)...");
  const { error } = await supabase
    .from('system_config')
    .upsert({ id: 'sari_core_identity', config: teamConfig });

  if (error) {
    console.error('Supabase Sync Notice (using local vault state if unconfigured):', error.message);
  } else {
    console.log('SARI Core Updated: Real Names Deployed. LAILA & BULBUL Active Under SARI.');
  }
}

if (require.main === module) {
  deployRealHierarchy();
}

module.exports = { deployRealHierarchy };
