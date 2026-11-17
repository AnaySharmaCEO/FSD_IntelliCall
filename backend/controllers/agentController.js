import { asyncHandler } from '../middleware/asyncHandler.js';

const ALLOWED_AGENT_FIELDS = [
  'name',
  'role_title',
  'description',
  'voice_id',
  'voice_model',
  'language',
  'status',
  'system_prompt',
  'greeting',
  'voice_speed',
  'voice_temperature',
  'communication_style',
  'brevity_words',
  'tactics',
  'objective',
  'qualification_goal',
  'config',
  'script_config',
  'voice_config',
];

/**
 * 1. GET /api/v1/agents
 * Fetch all conversational AI voice agents for the active organization.
 */
export const getAgents = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('agents')
    .select('*')
    .eq('organization_id', req.orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve voice agents',
      error: error.message,
    });
  }

  res.status(200).json({
    success: true,
    count: data ? data.length : 0,
    agents: data || [],
  });
});

/**
 * 2. GET /api/v1/agents/:id
 * Retrieve a specific AI agent by ID.
 */
export const getAgentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Agent not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    agent: data,
  });
});

/**
 * 3. POST /api/v1/agents
 * Create a new voice agent persona scoped to active organization.
 */
export const createAgent = asyncHandler(async (req, res) => {
  const body = req.body;

  if (!body.name || !String(body.name).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Agent name is required',
    });
  }

  const newAgent = {
    organization_id: req.orgId,
    name: String(body.name).trim(),
    role_title: body.role_title || body.roleTitle || 'AI Sales Specialist',
    description: body.description || '',
    voice_id: body.voice_id || body.voiceId || body.voice_model || body.voiceModel || 'Aoede',
    voice_model: body.voice_model || body.voiceModel || body.voice_id || body.voiceId || 'Aoede',
    language: body.language || 'en-IN',
    status: body.status || 'draft',
    system_prompt: body.system_prompt || body.systemPrompt || '',
    greeting: body.greeting || '',
    voice_speed: body.voice_speed !== undefined ? Number(body.voice_speed) : 1.0,
    voice_temperature: body.voice_temperature !== undefined ? Number(body.voice_temperature) : 0.7,
    communication_style: body.communication_style || 'professional',
    brevity_words: body.brevity_words !== undefined ? Number(body.brevity_words) : 25,
    tactics: body.tactics || {},
    objective: body.objective || '',
    qualification_goal: body.qualification_goal || '',
    config: body.config || {},
  };

  const { data, error } = await req.supabase
    .from('agents')
    .insert(newAgent)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create agent',
      error: error.message,
    });
  }

  res.status(201).json({
    success: true,
    agent: data,
  });
});

/**
 * 4. PUT /api/v1/agents/:id
 * Update an existing agent persona.
 */
export const updateAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = {};

  for (const field of ALLOWED_AGENT_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  // Handle camelCase incoming mappings
  if (req.body.roleTitle !== undefined) updates.role_title = req.body.roleTitle;
  if (req.body.voiceModel !== undefined) updates.voice_model = req.body.voiceModel;
  if (req.body.systemPrompt !== undefined) updates.system_prompt = req.body.systemPrompt;
  if (req.body.brevityWords !== undefined) updates.brevity_words = req.body.brevityWords;
  if (req.body.voiceSpeed !== undefined) updates.voice_speed = req.body.voiceSpeed;
  if (req.body.voiceTemperature !== undefined) updates.voice_temperature = req.body.voiceTemperature;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid update fields provided',
    });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await req.supabase
    .from('agents')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update agent',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Agent not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    agent: data,
  });
});

/**
 * 5. DELETE /api/v1/agents/:id
 * Remove a voice agent.
 */
export const deleteAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete agent',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Agent not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Agent deleted successfully',
    agent: data,
  });
});

export default {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
};
