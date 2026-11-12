/**
 * What each kind of event is asked for, shared by the creation wizard and the
 * edit page so both draw the same options for the same event.
 */
// What each kind of event is asked for (inbox 588, CEO 11 Nov: "certain
// options showing when you select a type of event where they shouldnt").
// One place, so the steps, the review and the payload agree: an option the
// screen hides is also never sent, whatever was typed before the switch.
export const eventAsks = (form, days) => {
  const type = form.event_type;
  return {
    // A venue only where people turn up; a link only where they watch.
    venue: type !== 'virtual',
    link: type !== 'physical',
    // Hybrid needs both, the same rule the server holds at Publish.
    linkRequired: type === 'virtual' || type === 'hybrid',
    // A concert has no game to pick.
    game: form.category !== 'concert',
    // "Each day or the whole event" only means something over two days.
    capacityMode: days > 1,
    // Pitches, stalls and booths are places at a venue.
    vendors: type !== 'virtual',
    // Going together is travelling to a venue together.
    goingTogether: type !== 'virtual',
  };
};
// The payload trimmed to what this kind of event uses.
export const trimToAsks = (form, asks) => ({
  ...form,
  location: asks.venue ? form.location : '',
  virtual_link: asks.link ? form.virtual_link : '',
  game_title: asks.game ? form.game_title : '',
  series_id: asks.game ? form.series_id : '',
  capacity_mode: asks.capacityMode ? form.capacity_mode : 'per_day',
  vendor_invites: asks.vendors ? form.vendor_invites : [],
});
