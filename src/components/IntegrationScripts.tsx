"use client";

import { useEffect } from "react";
import {
  Integration,
  IntegrationPlacement,
  STAFF_MARKER_COOKIE,
} from "@/lib/integrations-shared";

// Injects the tracking snippets an admin pasted into /adpnl/integrations.
//
// Two things this deliberately does not do:
//
// 1. It never runs in the admin panel. This component is only rendered from
//    the storefront layout, so /admin has no tracking code in it at all —
//    admin page views and clicks are invisible to GTM, Pixel and the rest.
//
// 2. It bails out for signed-in staff. The session cookie is httpOnly and
//    unreadable here, so sign-in also sets a plain marker cookie purely for
//    this check. Staff browsing the shop therefore don't show up as traffic
//    either.
//
// Injection happens after hydration rather than as server-rendered <script>
// tags, which keeps the storefront pages static and cacheable. Pixel
// helpers and tag assistants read the live DOM, so tags still verify.

const DONE_ATTR = "data-kanzie-integrations";

function hasStaffCookie(): boolean {
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${STAFF_MARKER_COOKIE}=`));
}

function targetFor(placement: IntegrationPlacement): {
  parent: HTMLElement;
  prepend: boolean;
} {
  if (placement === "head") return { parent: document.head, prepend: false };
  if (placement === "body_start") return { parent: document.body, prepend: true };
  return { parent: document.body, prepend: false };
}

/**
 * innerHTML does not execute script tags, so each one is rebuilt as a fresh
 * element. Everything else (noscript, img beacons, iframes) is moved across
 * untouched.
 */
function inject(integration: Integration) {
  const { parent, prepend } = targetFor(integration.placement);

  const template = document.createElement("template");
  template.innerHTML = integration.code;

  const nodes: Node[] = [];
  template.content.childNodes.forEach((node) => {
    if (node.nodeName === "SCRIPT") {
      const original = node as HTMLScriptElement;
      const script = document.createElement("script");
      for (const attr of Array.from(original.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      script.text = original.text;
      nodes.push(script);
    } else {
      nodes.push(node.cloneNode(true));
    }
  });

  const fragment = document.createDocumentFragment();
  for (const node of nodes) {
    if (node instanceof Element) node.setAttribute(DONE_ATTR, integration.id);
    fragment.appendChild(node);
  }

  if (prepend && parent.firstChild) {
    parent.insertBefore(fragment, parent.firstChild);
  } else {
    parent.appendChild(fragment);
  }
}

export default function IntegrationScripts({
  integrations,
}: {
  integrations: Integration[];
}) {
  useEffect(() => {
    if (integrations.length === 0) return;
    if (hasStaffCookie()) return;
    // A client-side navigation remounts nothing here, but a Fast Refresh in
    // development would otherwise double-inject.
    if (document.querySelector(`[${DONE_ATTR}]`)) return;

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
