/** A visible TODO(brand) placeholder. Fill the matching value in src/brand.config.ts. */
export function Todo({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span className={`todo ${className}`} title="Fill this in src/brand.config.ts">
      TODO(brand): {label}
    </span>
  );
}
