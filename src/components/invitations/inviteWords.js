// The words for an invitation, in the reader's language (inbox 455). One place,
// so the invitation page, the list of them and the organiser's "still waiting"
// rows say the same thing.

export function roleWord(tt, role) {
  return ({
    // The console's own words for these roles, so an invitation and the people
    // list above it never name the same role two ways.
    manager: tt('manage.roleManager', 'Manager'),
    door: tt('manage.roleDoor', 'Door staff'),
    scorekeeper: tt('desk.scorekeeper', 'Scorekeeper'),
    // A helper on a tournament, holding the parts the organiser gave (P7).
    staff: tt('invite.role.staff', 'Helper'),
    admin: tt('invite.role.admin', 'Admin'),
    member: tt('invite.role.member', 'Member'),
  })[role] || role;
}

/** "help run the event Lagos Con", by what the invitation is for. */
export function whatLine(tt, invitation) {
  const name = invitation?.name || '';
  if (invitation?.kind === 'organization') {
    return tt('invite.what.organization', 'join the organisation {name}').replace('{name}', name);
  }
  if (invitation?.kind === 'tournament') {
    return tt('invite.what.tournament', 'help run the tournament {name}').replace('{name}', name);
  }
  return tt('invite.what.event', 'help run the event {name}').replace('{name}', name);
}
