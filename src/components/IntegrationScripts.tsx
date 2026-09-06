import { Integration, STAFF_MARKER_COOKIE } from "@/lib/integrations-shared";
import IntegrationScriptsBody from "./IntegrationScriptsBody";

// Injects the tracking snippets an admin pasted into /adpnl/integrations.
//
// Two things this deliberately does not do:
//
// 1. It never runs in the admin panel. This component is only rendered from
//    the storefront layout, so /adpnl has no tracking code in it at all —
//    admin page views and clicks are invisible to GTM, Pixel and the rest.
//
// 2. It bails out for signed-in staff. The session cookie is httpOnly and
//    unreadable here, so sign-in also sets a plain marker cookie purely for
//    this check. Staff browsing the shop therefore don't show up as traffic
//    either. That check is the reason this runs in the browser rather than
//    being rendered straight into the markup: reading a cookie on the server
//    would make every storefront page dynamic.
//
// The snippets used to be injected from a useEffect, which meant they waited
// for React to hydrate the whole page first — measured at 3.7s after load on
// the live site, against a 0.56s load. Tags that late miss the visitors who
// bounce, and Tag Assistant and GTM preview scan long before they appear and
// report no container at all. The bootstrap below is plain inline script
// instead, so it runs while the document is still parsing and the tags are in
// the DOM within milliseconds, without giving up static rendering.
//
// Only head placements can take that route. React owns <body>'s children and
// reconciles away anything injected there before hydration, so those are left
// to IntegrationScriptsBody — see that file for why the wait is harmless.

const DATA_ID = "kanzie-integrations";
const DONE_ATTR = "data-kanzie-integrations";

// Kept as a string rather than a module: it has to execute during parse, and
// anything imported would arrive with the client bundle, which is the delay
// this exists to avoid.
const BOOTSTRAP = `(function(){
  try {
    if (document.querySelector('[${DONE_ATTR}]')) return;
    // GTM preview and Tag Assistant arrive with ?gtm_debug=, and they arrive
    // in the same browser the shop is administered from — so the staff
    // exclusion below would report the container as missing to the one person
    // trying to verify it. Asking to debug the tags is asking for them.
    if (location.search.indexOf('gtm_debug=') === -1 &&
        document.cookie.split(';').some(function(c){
          return c.trim().indexOf('${STAFF_MARKER_COOKIE}=') === 0;
        })) return;

    var el = document.getElementById('${DATA_ID}');
    if (!el) return;
    var list = JSON.parse(el.textContent || '[]');

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      try {
        var tpl = document.createElement('template');
        tpl.innerHTML = item.code;

        var frag = document.createDocumentFragment();
        var kids = Array.prototype.slice.call(tpl.content.childNodes);
        for (var k = 0; k < kids.length; k++) {
          var node = kids[k];
          // innerHTML never executes a script, so each one is rebuilt as a
          // fresh element. Everything else — noscript, img beacons, iframes —
          // moves across untouched.
          if (node.nodeName === 'SCRIPT') {
            var s = document.createElement('script');
            for (var a = 0; a < node.attributes.length; a++) {
              s.setAttribute(node.attributes[a].name, node.attributes[a].value);
            }
            s.text = node.text;
            node = s;
          } else {
            node = node.cloneNode(true);
          }
          if (node.nodeType === 1) node.setAttribute('${DONE_ATTR}', item.id);
          frag.appendChild(node);
        }

        document.head.appendChild(frag);
      } catch (err) {
        // One broken snippet must not stop the rest, and must never take the
        // storefront down.
        console.warn('Integration "' + item.name + '" failed to load:', err);
      }
    }
  } catch (err) {
    console.warn('Integrations failed to load:', err);
  }
})();`;

export default function IntegrationScripts({
  integrations,
}: {
  integrations: Integration[];
}) {
  const head = integrations.filter((i) => i.placement === "head");
  const body = integrations.filter((i) => i.placement !== "head");

  return (
    <>
      {head.length > 0 && (
        <>
          <script
            id={DATA_ID}
            type="application/json"
            // A pasted snippet contains "</script>" of its own, which would
            // end this tag early and spill the rest into the page as markup.
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(head).replace(/</g, "\\u003c"),
            }}
          />
          <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} />
        </>
      )}
      <IntegrationScriptsBody integrations={body} />
    </>
  );
}
