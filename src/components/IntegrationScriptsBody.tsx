"use client";

import { useEffect } from "react";
import { Integration, STAFF_MARKER_COOKIE } from "@/lib/integrations-shared";

// The body half of the integration injector — see IntegrationScripts.tsx for
// why the head half is inline script instead.
//
// Anything placed in the body has to wait for hydration. React owns <body>'s
// children, and a node inserted there while the document is still parsing is
// removed again the moment hydration reconciles the tree (measured: present at
// 150ms, gone by 400ms). <head> is not reconciled that way, which is why the
// tags that actually matter for timing can go in early and these cannot.
//
// Little is lost by waiting. Body placements are GTM's <noscript> iframe and
// similar no-JS fallbacks, which are only read when scripting is off — and
// then this component never runs at all, so the wait costs nothing that was
// going to work anyway.

const DONE_ATTR = "data-kanzie-integrations";

function shouldSkipForStaff(): boolean {
  // GTM preview and Tag Assistant arrive with ?gtm_debug=, in the same browser
  // the shop is administered from. Suppressing tags there reports the container
  // as missing to the one person trying to verify it — see IntegrationScripts.
  if (window.location.search.includes("gtm_debug=")) return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${STAFF_MARKER_COOKIE}=`));
}

/**
 * innerHTML does not execute script tags, so each one is rebuilt as a fresh
 * element. Everything else (noscript, img beacons, iframes) is moved across
 * untouched.
 */
function inject(integration: Integration) {
  const template = document.createElement("template");
  template.innerHTML = integration.code;

  const fragment = document.createDocumentFragment();
  for (const node of Array.from(template.content.childNodes)) {
    let next: Node;
    if (node.nodeName === "SCRIPT") {
      const original = node as HTMLScriptElement;
      const script = document.createElement("script");
      for (const attr of Array.from(original.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      script.text = original.text;
      next = script;
    } else {
      next = node.cloneNode(true);
    }
    if (next instanceof Element) {
      next.setAttribute(DONE_ATTR, integration.id);
      // Distinguishes these from the head tags the inline bootstrap injects,
      // so the re-entry guard below only counts this component's own work.
      next.setAttribute("data-kanzie-body", "");
    }
    fragment.appendChild(next);
  }

  if (integration.placement === "body_start" && document.body.firstChild) {
    document.body.insertBefore(fragment, document.body.firstChild);
  } else {
    document.body.appendChild(fragment);
  }
}

export default function IntegrationScriptsBody({
  integrations,
}: {
  integrations: Integration[];
}) {
  useEffect(() => {
    if (integrations.length === 0) return;
    if (shouldSkipForStaff()) return;
    // A client-side navigation remounts nothing here, but a Fast Refresh in
    // development would otherwise double-inject.
    if (document.querySelector(`[${DONE_ATTR}][data-kanzie-body]`)) return;

    for (const integration of integrations) {
      try {
        inject(integration);
      } catch (err) {
        // One broken snippet must not stop the rest, and must never take the
        // storefront down.
        console.warn(`Integration "${integration.name}" failed to load:`, err);
      }
    }
  }, [integrations]);

  return null;
}
