import SkeletonImage from "@/components/SkeletonImage";

/**
 * First character of the reviewer's name, for reviews with no photo.
 *
 * Spread rather than charAt so an accented letter or an emoji is not cut in
 * half — charAt would return a lone surrogate and render as a box.
 */
export function reviewerInitial(name: string): string {
  const first = [...name.trim()][0];
  return first ? first.toUpperCase() : "?";
}

/**
 * A reviewer's headshot, or their initial when no photo was chosen.
 *
 * Standing in a stock portrait for a real customer who did not supply one
 * would be inventing a face; a lettered disc says the same thing honestly.
 * Used by the storefront carousel and all three admin previews so the shop
 * and the editor can never disagree about what a review looks like.
 */
export default function ReviewerAvatar({
  name,
  avatar,
  size = 56,
  className = "",
}: {
  name: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatar) {
    return (
      <SkeletonImage
        src={avatar}
        alt={`${name} headshot`}
        width={size}
        height={size}
        skeletonClassName="rounded-full"
        containerClassName="rounded-full"
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      // Hidden from screen readers: the name is always rendered next to this,
      // so announcing "M" before "Marcus T." only adds noise.
      aria-hidden="true"
      className={`rounded-full flex items-center justify-center bg-accent/10 text-accent font-display font-bold leading-none select-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {reviewerInitial(name)}
    </div>
  );
}
