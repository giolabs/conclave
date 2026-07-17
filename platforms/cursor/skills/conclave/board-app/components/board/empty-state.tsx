export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-16">
      <p className="max-w-md text-center text-sm text-neutral-500">{message}</p>
    </div>
  );
}
