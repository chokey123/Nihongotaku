export function SearchBar({
  defaultValue,
  placeholder,
  buttonLabel,
}: {
  defaultValue?: string;
  placeholder: string;
  buttonLabel: string;
}) {
  return (
    <form className="glass-panel flex w-full items-center gap-3 rounded-[28px] border border-border px-4 py-3">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
