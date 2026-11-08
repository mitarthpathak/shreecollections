export function GridSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-5 px-4 md:grid-cols-3 md:px-8 lg:pl-[348px] xl:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-[14px] bg-lacquer" />
      ))}
    </div>
  );
}
