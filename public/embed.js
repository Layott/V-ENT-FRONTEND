/*
 * V-ENT on your own website (inbox 360).
 *
 *   <div data-vent-event="your-event-slug"></div>
 *   <div data-vent-tournament="your-tournament-slug"></div>
 *   <script src="https://v-ent.co/embed.js" async></script>
 *
 * Each placeholder becomes a frame showing the event's tickets or the
 * tournament's details, sized to its content. Buying and registering open on
 * V-ENT in a new tab, so the payment page is always V-ENT's own.
 */
(function () {
  var script = document.currentScript;
  var origin = (function () {
    try { return new URL(script && script.src ? script.src : 'https://v-ent.co/embed.js').origin; }
    catch (e) { return 'https://v-ent.co'; }
  })();
  var frames = {};
  var count = 0;

  function mount(node, kind, slug) {
    if (!slug || node.getAttribute('data-vent-mounted')) return;
    node.setAttribute('data-vent-mounted', '1');
    count += 1;
    var id = 'vent-' + count;
    var frame = document.createElement('iframe');
    frame.src = origin + '/embed/' + kind + '/' + encodeURIComponent(slug) + '?vent_frame=' + id;
    frame.title = 'V-ENT';
    frame.loading = 'lazy';
    frame.style.border = '0';
    frame.style.width = '100%';
    frame.style.maxWidth = '640px';
    frame.style.height = '560px';
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
