import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * 1. GET /api/v1/phone-numbers
 * List provisioned telephony numbers for the active organization.
 */
export const getPhoneNumbers = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('phone_numbers')
    .select(`
      *,
      campaigns:campaign_id (id, name)
    `)
    .eq('organization_id', req.orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve phone numbers',
      error: error.message,
    });
  }

  res.status(200).json({
    success: true,
    count: data ? data.length : 0,
    phoneNumbers: data || [],
  });
});

/**
 * 2. POST /api/v1/phone-numbers
 * Provision or register a new telephony number.
 */
export const createPhoneNumber = asyncHandler(async (req, res) => {
  const { phone_number, phoneNumber, friendly_name, friendlyName, twilio_sid, twilioSid, campaign_id, campaignId } =
    req.body;

  const targetNumber = phone_number || phoneNumber;
  if (!targetNumber) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required',
    });
  }

  const newEntry = {
    organization_id: req.orgId,
    phone_number: String(targetNumber).trim(),
    friendly_name: friendly_name || friendlyName || targetNumber,
    twilio_sid: twilio_sid || twilioSid || null,
    campaign_id: campaign_id || campaignId || null,
    status: 'active',
  };

  const { data, error } = await req.supabase
    .from('phone_numbers')
    .insert(newEntry)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to register phone number',
      error: error.message,
    });
  }

  res.status(201).json({
    success: true,
    phoneNumber: data,
  });
});

/**
 * 3. DELETE /api/v1/phone-numbers/:id
 * Release a phone number from the workspace pool.
 */
export const deletePhoneNumber = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('phone_numbers')
    .delete()
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete phone number',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Phone number not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Phone number released successfully',
    phoneNumber: data,
  });
});

export default {
  getPhoneNumbers,
  createPhoneNumber,
  deletePhoneNumber,
};
