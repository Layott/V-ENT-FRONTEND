// Words for the codes the studio API answers with, in one place.
//
// The server speaks in codes (`sandbox`, `requested`, `TWO_LINEUPS`); a screen
// never prints one. Every studio screen, the portal and the admin review, reads
// its labels from here, so a new status or problem is added once.

/** Where a game stands: 'live', 'requested', 'rejected' or 'sandbox'. */
export function studioStatus(game) {
  if (!game) return 'sandbox';
  if (game.mode === 'live' && game.live_status === 'approved') return 'live';
  if (game.live_status === 'requested') return 'requested';
  if (game.live_status === 'rejected') return 'rejected';
  return 'sandbox';
}

export function studioStatusLabel(tt, status) {
  const labels = {
    live: tt('partners.studios.status.live', 'Live'),
    requested: tt('partners.studios.status.requested', 'Waiting for review'),
    rejected: tt('partners.studios.status.rejected', 'Not approved'),
    sandbox: tt('partners.studios.status.sandbox', 'Sandbox'),
  };
  return labels[status] || labels.sandbox;
}

export function studioEventLabel(tt, kind) {
  const labels = {
    result_confirmed: tt('partners.studios.event.result_confirmed', 'A match result was recorded'),
    stage_started: tt('partners.studios.event.stage_started', 'A stage started'),
    stage_closed: tt('partners.studios.event.stage_closed', 'A stage finished'),
    line_sent: tt('partners.studios.event.line_sent', 'Places were sent on to another stage'),
    tournament_won: tt('partners.studios.event.tournament_won', 'A tournament was won'),
    account_linked: tt('partners.studios.event.account_linked', 'A player linked their account'),
    account_unlinked: tt('partners.studios.event.account_unlinked', 'A player\'s link was removed'),
    ping: tt('partners.studios.event.ping', 'A test event'),
  };
  return labels[kind] || tt('partners.studios.event.other', 'Another event');
}

/** One problem with a result, as `{path, code}` from the server, in words. */
export function resultProblemLabel(tt, code) {
  const labels = {
    TYPE: tt('partners.studios.problem.TYPE', 'the wrong kind of value'),
    REQUIRED: tt('partners.studios.problem.REQUIRED', 'something required is missing'),
    ENUM: tt('partners.studios.problem.ENUM', 'not one of the allowed values'),
    MINIMUM: tt('partners.studios.problem.MINIMUM', 'below the minimum'),
    MAXIMUM: tt('partners.studios.problem.MAXIMUM', 'above the maximum'),
    MIN_LENGTH: tt('partners.studios.problem.MIN_LENGTH', 'too short'),
    MAX_LENGTH: tt('partners.studios.problem.MAX_LENGTH', 'too long'),
    MIN_ITEMS: tt('partners.studios.problem.MIN_ITEMS', 'too few items'),
    MAX_ITEMS: tt('partners.studios.problem.MAX_ITEMS', 'too many items'),
    ADDITIONAL: tt('partners.studios.problem.ADDITIONAL', 'a field your schema does not allow'),
    TWO_LINEUPS: tt('partners.studios.problem.TWO_LINEUPS', 'two lineups are needed, one with side 1 and one with side 2'),
    TOO_LARGE: tt('partners.studios.problem.TOO_LARGE', 'the result is too large'),
  };
  return labels[code] || tt('partners.studios.problem.other', 'not accepted');
}

export function deliveryStatusLabel(tt, status) {
  const labels = {
    pending: tt('partners.studios.log.status.pending', 'Waiting'),
    delivered: tt('partners.studios.log.status.delivered', 'Delivered'),
    failed: tt('partners.studios.log.status.failed', 'Gave up'),
    cancelled: tt('partners.studios.log.status.cancelled', 'Cancelled'),
  };
  return labels[status] || labels.pending;
}

export function deliveryKindLabel(tt, kind) {
  const labels = {
    event: tt('partners.studios.log.kind.event', 'Event'),
    create_game_session: tt('partners.studios.log.kind.create_game_session', 'Create a game session'),
    cancel_game_session: tt('partners.studios.log.kind.cancel_game_session', 'Cancel a game session'),
    get_game_session: tt('partners.studios.log.kind.get_game_session', 'Ask for a game session'),
  };
  return labels[kind] || labels.event;
}

/** Why a delivery has not arrived, from the code the server recorded. */
export function deliveryErrorLabel(tt, code, statusCode) {
  const labels = {
    TIMEOUT: tt('partners.studios.log.error.TIMEOUT', 'your server did not answer within 10 seconds'),
    UNREACHABLE: tt('partners.studios.log.error.UNREACHABLE', 'we could not reach your server'),
    HTTP_STATUS: tt('partners.studios.log.error.HTTP_STATUS', 'your server answered {code}').replace('{code}', String(statusCode ?? '')),
    GONE: tt('partners.studios.log.error.GONE', 'your server answered 410, so we stopped'),
    GAVE_UP: tt('partners.studios.log.error.GAVE_UP', 'every try failed, so we stopped'),
    URL_PRIVATE_HOST: tt('partners.studios.log.error.URL_PRIVATE_HOST', 'the address now points inside a private network'),
    STUDIO_SECRET_UNREADABLE: tt('partners.studios.log.error.STUDIO_SECRET_UNREADABLE', 'our copy of your secret cannot be read: rotate it'),
  };
  return labels[code] || tt('partners.studios.log.error.other', 'it did not arrive');
}

/** The settings a game still needs before it can be reviewed for live. */
export function liveFieldLabel(tt, field) {
  const labels = {
    game: tt('partners.studios.field.game', 'the V-ENT game'),
    session_webhook_url: tt('partners.studios.field.session_webhook_url', 'the game session address'),
    scoring_expression: tt('partners.studios.field.scoring_expression', 'the scoring expression'),
  };
  return labels[field] || tt('partners.studios.field.other', 'a setting');
}
