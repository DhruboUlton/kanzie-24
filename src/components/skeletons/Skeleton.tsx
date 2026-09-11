/**
 * A single loading placeholder block.
 *
 * Shape and size come entirely from `className`, so this stays one element
 * carrying one class and the caller decides the geometry. The shimmer itself
 * is `.skeleton` in globals.css.
 *
 * No "use client": there is no state, no timer and no randomness here, so it
 * renders identically on the server and in the browser and can be imported
 * from either kind of component.
 *
 * aria-hidden, because a loading region announces itself once through the
 * wrapper that holds these — letting a screen reader walk thirty empty boxes
 * instead would be noise, not information.
 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded ${className}`} />;
}
