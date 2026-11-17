import { asyncHandler } from '../middleware/asyncHandler.js';

const ALLOWED_APPOINTMENT_FIELDS = [
  'title',
  'host_name',
  'scheduled_for',
  'duration_minutes',
  'status',
  'booking_source',
  'notes',
  'metadata',
  'lead_id',
  'call_id',
];

/**
 * 1. GET /api/v1/appointments
 * List calendar appointments and callbacks for active organization.
 */
export const getAppointments = asyncHandler(async (req, res) => {
  const { status } = req.query;

  let query = req.supabase
    .from('appointments')
    .select(`
      *,
      leads:lead_id (id, name, phone, email, company)
    `)
    .eq('organization_id', req.orgId)
    .order('scheduled_for', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments',
      error: error.message,
    });
  }

  res.status(200).json({
    success: true,
    count: data ? data.length : 0,
    appointments: data || [],
  });
});

/**
 * 2. GET /api/v1/appointments/:id
 * Retrieve a specific appointment by ID.
 */
export const getAppointmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('appointments')
    .select(`
      *,
      leads:lead_id (*)
    `)
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointment',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Appointment not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    appointment: data,
  });
});

/**
 * 3. POST /api/v1/appointments
 * Create a new appointment / callback booking.
 */
export const createAppointment = asyncHandler(async (req, res) => {
  const body = req.body;

  const newAppointment = {
    organization_id: req.orgId,
    lead_id: body.lead_id || body.leadId || null,
    call_id: body.call_id || body.callId || null,
    title: body.title || 'Callback Appointment',
    host_name: body.host_name || body.hostName || 'Sales Representative',
    scheduled_for: body.scheduled_for || body.scheduledFor || new Date().toISOString(),
    duration_minutes: body.duration_minutes || body.durationMinutes || 30,
    status: body.status || 'confirmed',
    booking_source: body.booking_source || body.source || 'Dashboard Manual',
    notes: body.notes || '',
    metadata: body.metadata || {},
  };

  const { data, error } = await req.supabase
    .from('appointments')
    .insert(newAppointment)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create appointment',
      error: error.message,
    });
  }

  // Update lead status if lead_id exists
  if (newAppointment.lead_id) {
    await req.supabase
      .from('leads')
      .update({
        status: 'meeting_booked',
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', newAppointment.lead_id);
  }

  res.status(201).json({
    success: true,
    appointment: data,
  });
});

/**
 * 4. PUT /api/v1/appointments/:id
 * Update an existing appointment.
 */
export const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = {};

  for (const field of ALLOWED_APPOINTMENT_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (req.body.hostName !== undefined) updates.host_name = req.body.hostName;
  if (req.body.scheduledFor !== undefined) updates.scheduled_for = req.body.scheduledFor;
  if (req.body.durationMinutes !== undefined) updates.duration_minutes = req.body.durationMinutes;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid update fields provided',
    });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await req.supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Appointment not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    appointment: data,
  });
});

/**
 * 5. DELETE /api/v1/appointments/:id
 * Delete or cancel an appointment.
 */
export const deleteAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete appointment',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Appointment not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Appointment deleted successfully',
    appointment: data,
  });
});

export default {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
