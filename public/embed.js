/*
 * V-ENT on your own website (inbox 360, widgets added by P8).
 *
 *   <div data-vent-event="your-event-slug"></div>
 *   <div data-vent-tournament="your-tournament-slug"></div>
 *   <div data-vent-tournament="your-tournament-slug" data-vent-widget="bracket"></div>
 *   <script src="https://v-ent.co/embed.js" async></script>
 *
 * Each placeholder becomes a frame sized to its content: an event's tickets,
 * a tournament's card with registration, or one part of a tournament
 * (data-vent-widget: bracket, standings, schedule or path). data-vent-theme (dark or
 * light), data-vent-accent (#rrggbb) and data-vent-font (clash or system)
 * change the look for that one frame. Buying, registering and signing in open
 * on V-ENT in a new window, so the payment page is always V-ENT's own.
 */
(function () {
  var script = document.currentScript;
  var origin = (function () {
    try { return new URL(script && script.src ? script.src : 'https://v-ent.co/embed.js').origin; }
    catch (e) { return 'https://v-ent.co'; }
  })();
  var WIDGETS = { bracket: 1, standings: 1, schedule: 1, path: 1 };
  var CHECKS = {
    theme: /^(dark|light)$/,
    accent: /^#[0-9a-fA-F]{6}$/,
    font: /^(clash|system)$/
  };
  var frames = {};
  var count = 0;

  function mount(node, kind, slug) {
    if (!slug || node.getAttribute('data-vent-mounted')) return;
    node.setAttribute('data-vent-mounted', '1');
    count += 1;
    var id = 'vent-' + count;
    var widget = kind === 'tournaments' ? node.getAttribute('data-vent-widget') : null;
    var wide = !!(widget && WIDGETS[widget]);
    var path = origin + '/embed/' + kind + '/' + encodeURIComponent(slug) + (wide ? '/' + widget : '');
    // Only values on the list reach the frame's address.
    var query = [];
    for (var key in CHECKS) {
      var value = node.getAttribute('data-vent-' + key);
      if (value && CHECKS[key].test(value)) query.push(key + '=' + encodeURIComponent(value.toLowerCase()));
    }
    query.push('vent_frame=' + id);
    var frame = document.createElement('iframe');
    frame.src = path + '?' + query.join('&');
    frame.title = 'V-ENT';
    frame.loading = 'lazy';
    frame.style.border = '0';
    frame.style.width = '100%';
    frame.style.maxWidth = wide ? '100%' : '640px';
    frame.style.height = wide ? '720px' : '560px';
    frame.style.display = 'block';
    frames[id] = frame;
    node.appendChild(frame);
  }

  function scan() {
    var events = document.querySelectorAll('[data-vent-event]');
    for (var i = 0; i < events.length; i += 1) mount(events[i], 'events', events[i].getAttribute('data-vent-event'));
    var tournaments = document.querySelectorAll('[data-vent-tournament]');
    for (var j = 0; j < tournaments.length; j += 1) mount(tournaments[j], 'tournaments', tournaments[j].getAttribute('data-vent-tournament'));
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== origin) return;
    var data = event.data || {};
    if (data.type !== 'vent:embed-height') return;
    var frame = frames[data.id];
    // Only the frame this script made, answering for itself.
    if (!frame || frame.contentWindow !== event.source) return;
    var height = Number(data.height);
    if (height > 0 && height < 20000) frame.style.height = height + 'px';
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
})();
